import { bus, type TranscriptEvent } from "../service/bus.js";
import { callGemini } from "./gemini.js";
import { systemPrompt } from "./prompts/system.js";
import { fewShotExamples } from "./prompts/examples.js";
import { researchToolDeclarations, actionToolDeclarations } from "./tools/index.js";
import { searchIssues, getUsers, getActiveSprintId, getTransitions } from "../service/jira.js";
import { enqueue, hasPending, getRecentJobs } from "../service/queue.js";
import { requestApproval } from "./tools/teams/notify.js";
import { config } from "./config.js";
import { log } from "../util/index.js";
import { withRetry } from "../util/retry.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

// Known action tool names — anything not in researchExecutors and in this set
const ACTION_TOOLS = new Set(["createIssue", "updateIssue", "transitionIssue"]);

// ── Prompt ───────────────────────────────────────────────────────────────────

const fullPrompt = `${systemPrompt}\n\n${fewShotExamples}`;

// ── Research executors (read-only, run in parallel) ──────────────────────────

const researchExecutors: Record<string, (args: any) => Promise<unknown>> = {
  searchIssues: ({ jql }: { jql: string }) =>
    withRetry(() => searchIssues(jql), { issues: [] }, { tag: "jira:search", maxAttempts: 2 }),
  getUsers: ({ query }: { query: string }) =>
    withRetry(() => getUsers(query), [], { tag: "jira:users", maxAttempts: 2 }),
  getActiveSprint: () =>
    withRetry(
      () => getActiveSprintId(process.env.JIRA_PROJECT_KEY ?? "").then((id) => ({ sprintId: id })),
      { sprintId: null },
      { tag: "jira:sprint", maxAttempts: 2 },
    ),
  getTransitions: ({ issueKey }: { issueKey: string }) =>
    withRetry(
      () => getTransitions(issueKey).then((t) => ({ transitions: t.map((x) => ({ id: x.id, name: x.name, to: x.to.name })) })),
      { transitions: [] },
      { tag: "jira:transitions", maxAttempts: 2 },
    ),
};

// ── Agentic loop ─────────────────────────────────────────────────────────────

async function runLoop(transcript: string[], contextNote: string): Promise<ToolCall[]> {
  const allTools = [...researchToolDeclarations, ...actionToolDeclarations];
  const userMessage = contextNote
    ? `${contextNote}\n\n--- TRANSCRIPT ---\n${transcript.join("\n")}`
    : transcript.join("\n");
  const messages: any[] = [{ role: "user", parts: [{ text: userMessage }] }];
  const actions: ToolCall[] = [];

  for (let turn = 0; turn < config.maxTurns; turn++) {
    log("agent", `turn ${turn + 1}`, "blue");

    const data = await callGemini(fullPrompt, messages, allTools);
    if (!data) {
      log("agent", "model call failed after retries — aborting", "red");
      return actions;
    }

    const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
    const fnParts = parts.filter((p: any) => p.functionCall);

    if (fnParts.length === 0) {
      log("agent", "no further actions", "gray");
      break;
    }

    // Categorise: research (auto-execute) vs action (collect for approval)
    const researchParts: any[] = [];
    const actionParts: any[] = [];

    for (const part of fnParts) {
      if (researchExecutors[part.functionCall.name]) {
        researchParts.push(part);
      } else {
        actionParts.push(part);
      }
    }

    // Execute all research calls in parallel
    const researchResults = await Promise.all(
      researchParts.map(async (part: any) => {
        const { name, args } = part.functionCall;
        log("agent", `research → ${name}(${JSON.stringify(args ?? {})})`, "yellow");
        const result = await researchExecutors[name](args ?? {});
        log("agent", `result ← ${name}: ${JSON.stringify(result).slice(0, 120)}`, "magenta");
        return { name, result };
      }),
    );

    // Collect action calls
    for (const part of actionParts) {
      const { name, args } = part.functionCall;
      log("agent", `action → ${name}(${JSON.stringify(args ?? {})})`, "green");
      actions.push({ name, args: args ?? {} });
    }

    // Feed results back — preserve original parts (includes thought_signatures)
    // This continues the loop so the model can emit more actions (e.g. transition
    // KAN-7 on one turn, then KAN-8 on the next).
    const responseParts = [
      ...researchResults.map((r) => ({
        functionResponse: { name: r.name, response: { content: JSON.stringify(r.result) } },
      })),
      ...actionParts.map((p: any) => ({
        functionResponse: {
          name: p.functionCall.name,
          response: { content: JSON.stringify({ status: "queued_for_approval" }) },
        },
      })),
    ];

    messages.push(
      { role: "model", parts: fnParts },
      { role: "user", parts: responseParts },
    );
  }

  return actions;
}

// ── Dedup helpers ────────────────────────────────────────────────────────────

function isDuplicate(action: ToolCall): boolean {
  switch (action.name) {
    case "createIssue":
      return hasPending((j) => j.type === "createIssue" && j.payload.summary === action.args.summary);
    case "updateIssue":
      // Same ticket + same exact fields = duplicate. Different fields on same ticket = allowed.
      return hasPending((j) =>
        j.type === "updateIssue" &&
        j.payload.issueKey === action.args.issueKey &&
        JSON.stringify(j.payload) === JSON.stringify(action.args),
      );
    case "transitionIssue":
      // Same ticket + same transition = duplicate. Different transition on same ticket = allowed.
      return hasPending((j) =>
        j.type === "transitionIssue" &&
        j.payload.issueKey === action.args.issueKey &&
        j.payload.transitionId === action.args.transitionId,
      );
    default:
      return false;
  }
}

function actionLabel(action: ToolCall): string {
  return String(action.args.summary ?? action.args.issueKey ?? action.name);
}

// ── Context builder ─────────────────────────────────────────────────────────

/** Builds a context note telling the model which lines are new and what was already handled. */
function buildContext(botId: string, buffer: string[], watermark: number): string {
  const parts: string[] = [];

  // Tell the model which lines are new
  if (watermark > 0 && watermark < buffer.length) {
    parts.push(`Lines 1–${watermark} were already analysed. Only lines ${watermark + 1}–${buffer.length} are NEW. Focus on new lines only — do not re-act on old content.`);
  }

  // Tell the model about recently handled actions
  const recent = getRecentJobs(botId);
  if (recent.length > 0) {
    const handled = recent.map((j) => {
      const label = j.payload.summary ?? j.payload.issueKey ?? j.type;
      return `- ${j.type} ${j.payload.issueKey ? `[${j.payload.issueKey}]` : ""}: ${label} (${j.status})`;
    });
    parts.push(`Already handled (do NOT re-propose):\n${handled.join("\n")}`);
  }

  return parts.join("\n\n");
}

// ── Bus listener (single entry point, debounced) ────────────────────────────

const processing = new Set<string>();
const watermarks = new Map<string, number>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function processTranscript(botId: string, session: TranscriptEvent["session"]): Promise<void> {
  if (processing.has(botId)) return;
  processing.add(botId);
  try {
    const buffer = session.transcriptBuffer;
    const watermark = watermarks.get(botId) ?? 0;
    const newLines = buffer.length - watermark;

    log("agent", `processing: ${buffer.at(-1)} (${newLines} new lines)`, "blue");

    const context = buildContext(botId, buffer, watermark);
    const actions = await runLoop(buffer, context);

    // Advance watermark after processing
    watermarks.set(botId, buffer.length);

    for (const action of actions) {
      if (!ACTION_TOOLS.has(action.name)) continue;

      const label = actionLabel(action);
      if (isDuplicate(action)) {
        log("agent", `skipped duplicate: ${label}`, "yellow");
        continue;
      }

      log("agent", `queuing ${action.name}: ${label}`, "green");
      const job = enqueue({
        type: action.name,
        payload: action.args as Record<string, unknown>,
        botId,
      });
      await requestApproval(botId, job);
    }
  } catch (err: any) {
    log("agent", `error: ${err.message}`, "red");
  } finally {
    processing.delete(botId);
  }
}

bus.on("transcript", ({ botId, session }: TranscriptEvent) => {
  // Reset the debounce timer on every new transcript line.
  // The agent only fires after `debounceMs` of silence, so the speaker
  // can finish their full thought before we process.
  const existing = debounceTimers.get(botId);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    botId,
    setTimeout(() => {
      debounceTimers.delete(botId);
      processTranscript(botId, session);
    }, config.debounceMs),
  );
});
