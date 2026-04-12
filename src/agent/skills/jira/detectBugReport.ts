import { bus, type TranscriptEvent } from "../../../service/bus.js";
import { ask } from "../../gemini.js";
import { createIssue } from "../../tools/jira/createIssue.js";
import { requestApproval } from "../../tools/teams/notify.js";
import { hasPendingDuplicate } from "../../../service/queue.js";
import { log } from "../../../util/index.js";

const processing = new Set<string>();

const prompt = `
You are listening to a meeting transcript. Detect bug reports — when someone describes unexpected behaviour, a crash, or a broken feature.

Before calling createIssue, you MUST:
1. Call searchIssues to check if this bug is already tracked. Use JQL: project = ${process.env.JIRA_PROJECT_KEY} AND issuetype = Bug AND summary ~ "<keyword>" AND status != Done
2. If someone is mentioned as responsible: call getUsers to resolve their accountId.
3. Call getActiveSprint to get the current sprint ID.

Only call createIssue if:
- A real bug was clearly described in the transcript.
- No existing open bug ticket covers the same issue.

If a duplicate exists or no clear bug was described, do nothing.
`.trim();

const actionTools = [
  {
    name: "createIssue",
    description: "Queue a Jira Bug. Only call after completing all research steps.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Short one-line bug title. Max 255 characters.",
        },
        description: {
          type: "string",
          description: "Steps to reproduce or context from the transcript.",
        },
        priority: {
          type: "string",
          enum: ["Highest", "High", "Medium", "Low", "Lowest"],
          description: "Infer severity. Crashes or data loss = Highest. Default to High for bugs.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Relevant labels inferred from context e.g. ['regression', 'ui', 'api'].",
        },
        assignee: {
          type: "string",
          description: "Jira accountId resolved via getUsers. Omit if unknown.",
        },
        sprintId: {
          type: "number",
          description: "Active sprint ID from getActiveSprint.",
        },
      },
      required: ["summary"],
    },
  },
];

bus.on("transcript", async ({ botId, session }: TranscriptEvent) => {
  if (processing.has(botId)) return;
  processing.add(botId);
  try {
    log("skill:bugReport", `checking last line: ${session.transcriptBuffer.at(-1)}`, "blue");
    const call = await ask(prompt, session.transcriptBuffer, actionTools);
    if (!call || call.name !== "createIssue") {
      log("skill:bugReport", "no bug detected", "gray");
      return;
    }

    const summary = String(call.args.summary);
    if (hasPendingDuplicate(summary)) {
      log("skill:bugReport", `skipped duplicate: ${summary}`, "yellow");
      return;
    }

    log("skill:bugReport", `detected: ${summary}`, "green");
    const job = createIssue({ ...(call.args as any), type: "Bug" }, botId);
    await requestApproval(botId, job);
  } catch (err: any) {
    log("skill:bugReport", `error: ${err.message}`, "red");
  } finally {
    processing.delete(botId);
  }
});
