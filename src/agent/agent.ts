import { bus, type TranscriptEvent } from "../service/bus.js";
import { callGemini } from "./gemini.js";
import { systemPrompt } from "./prompts/system.js";
import { fewShotExamples } from "./prompts/examples.js";
import { researchToolDeclarations, actionToolDeclarations } from "./tools/index.js";
import { searchIssues, getUsers, getActiveSprintId, getTransitions } from "../service/jira.js";
import { enqueue, hasPending } from "../service/queue.js";
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

async function runLoop(transcript: string[]): Promise<ToolCall[]> {
  const allTools = [...researchToolDeclarations, ...actionToolDeclarations];
  const messages: any[] = [{ role: "user", parts: [{ text: transcript.join("\n") }] }];
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

    // If no research was done this turn, we're done (only had actions)
    if (researchParts.length === 0) break;

    // Feed results back — preserve original parts (includes thought_signatures)
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
      return hasPending((j) => j.type === "updateIssue" && j.payload.issueKey === action.args.issueKey);
    case "transitionIssue":
      return hasPending((j) => j.type === "transitionIssue" && j.payload.issueKey === action.args.issueKey);
    default:
      return false;
  }
}

function actionLabel(action: ToolCall): string {
  return String(action.args.summary ?? action.args.issueKey ?? action.name);
}

// ── Bus listener (single entry point) ────────────────────────────────────────

const processing = new Set<string>();

bus.on("transcript", async ({ botId, session }: TranscriptEvent) => {
  if (processing.has(botId)) return;
  processing.add(botId);
  try {
    log("agent", `processing: ${session.transcriptBuffer.at(-1)}`, "blue");
    const actions = await runLoop(session.transcriptBuffer);

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
});
