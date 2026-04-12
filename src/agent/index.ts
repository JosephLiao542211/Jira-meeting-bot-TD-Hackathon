import { bus, type TranscriptEvent } from "../service/bus.js";
import { detectActionItem } from "./skills/jira/detectActionItem.js";
import { detectBugReport } from "./skills/jira/detectBugReport.js";
import { detectDecision } from "./skills/jira/detectDecision.js";
import { createIssue } from "./tools/index.js";

bus.on("transcript", async ({ session }: TranscriptEvent) => {
  const buffer = session.transcriptBuffer;

  const actionItem = detectActionItem(buffer);
  if (actionItem) {
    const issue = await createIssue({ ...actionItem, type: "Task" });
    console.log(`[agent] created ${issue.key} (action item)`);
  }

  const bug = detectBugReport(buffer);
  if (bug) {
    const issue = await createIssue({ ...bug, type: "Bug" });
    console.log(`[agent] created ${issue.key} (bug report)`);
  }

  const decision = detectDecision(buffer);
  if (decision) {
    const issue = await createIssue({ ...decision, type: "Task", labels: ["decision"] });
    console.log(`[agent] created ${issue.key} (decision)`);
  }
});
