import { bus, type TranscriptEvent } from "../../../service/bus.js";
import { ask } from "../../gemini.js";
import { createIssue } from "../../tools/jira/createIssue.js";
import { requestApproval } from "../../tools/teams/notify.js";
import { hasPendingDuplicate } from "../../../service/queue.js";
import { log } from "../../../util/index.js";

const processing = new Set<string>();

const prompt = `
You are listening to a meeting transcript. Detect decisions — when the team explicitly agrees on something, resolves a question, or picks a direction.

Before calling createIssue, you MUST:
1. Call searchIssues to check if this decision is already logged. Use JQL: project = ${process.env.JIRA_PROJECT_KEY} AND labels = decision AND summary ~ "<keyword>"
2. Call getActiveSprint to get the current sprint ID.

Only call createIssue if:
- A clear, explicit decision was made by the team in the transcript.
- It has not already been logged.

Vague statements or ongoing discussions are not decisions. Do nothing if unsure.
`.trim();

const actionTools = [
  {
    name: "createIssue",
    description: "Queue a Jira Task to log a team decision. Only call after completing all research steps.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "One-line statement of the decision. Start with a verb e.g. 'Migrate auth to OAuth2'. Max 255 characters.",
        },
        description: {
          type: "string",
          description: "Additional context, reasoning, or participants from the transcript.",
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
    log("skill:decision", `checking last line: ${session.transcriptBuffer.at(-1)}`, "blue");
    const call = await ask(prompt, session.transcriptBuffer, actionTools);
    if (!call || call.name !== "createIssue") {
      log("skill:decision", "no decision detected", "gray");
      return;
    }

    const summary = String(call.args.summary);
    if (hasPendingDuplicate(summary)) {
      log("skill:decision", `skipped duplicate: ${summary}`, "yellow");
      return;
    }

    log("skill:decision", `detected: ${summary}`, "green");
    const job = createIssue({ ...(call.args as any), type: "Task", labels: ["decision"] }, botId);
    await requestApproval(botId, job);
  } catch (err: any) {
    log("skill:decision", `error: ${err.message}`, "red");
  } finally {
    processing.delete(botId);
  }
});
