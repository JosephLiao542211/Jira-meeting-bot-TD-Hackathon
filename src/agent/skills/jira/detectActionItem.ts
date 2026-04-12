import { bus, type TranscriptEvent } from "../../../service/bus.js";
import { ask } from "../../gemini.js";
import { createIssue } from "../../tools/jira/createIssue.js";
import { requestApproval } from "../../tools/teams/notify.js";
import { log } from "../../../util/index.js";

const prompt = `
You are listening to a meeting transcript. Detect action items — when someone is explicitly assigned a task or commits to doing something.

Before calling createIssue, you MUST:
1. Call searchIssues to check if a similar ticket already exists. Use JQL: project = ${process.env.JIRA_PROJECT_KEY} AND summary ~ "<keyword>" AND status != Done
2. If someone is assigned: call getUsers with their name to resolve their accountId.
3. Call getActiveSprint to get the current sprint ID so the ticket lands in the right sprint.

Only call createIssue if:
- You are confident this is a real, distinct action item explicitly stated in the transcript.
- No duplicate ticket already exists.

If a duplicate exists or no clear action item was stated, do nothing.
`.trim();

const actionTools = [
  {
    name: "createIssue",
    description: "Queue a Jira Task for an action item. Only call after completing all research steps.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Short one-line title. Max 255 characters.",
        },
        description: {
          type: "string",
          description: "Context from the transcript about what needs to be done.",
        },
        priority: {
          type: "string",
          enum: ["Highest", "High", "Medium", "Low", "Lowest"],
          description: "Infer urgency from the transcript. Default to Medium.",
        },
        assignee: {
          type: "string",
          description: "Jira accountId of the assignee, resolved via getUsers. Omit if unknown.",
        },
        sprintId: {
          type: "number",
          description: "Active sprint ID from getActiveSprint. Include to place the ticket in the current sprint.",
        },
      },
      required: ["summary"],
    },
  },
];

bus.on("transcript", async ({ botId, session }: TranscriptEvent) => {
  log("skill:actionItem", `checking last line: ${session.transcriptBuffer.at(-1)}`, "blue");
  const call = await ask(prompt, session.transcriptBuffer, actionTools);
  if (!call || call.name !== "createIssue") {
    log("skill:actionItem", "no action item detected", "gray");
    return;
  }

  log("skill:actionItem", `detected: ${call.args.summary}`, "green");
  const job = createIssue({ ...(call.args as any), type: "Task" }, botId);
  await requestApproval(botId, job);
});
