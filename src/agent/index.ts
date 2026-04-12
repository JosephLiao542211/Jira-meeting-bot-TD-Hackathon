import { bus, type TranscriptEvent } from "../service/bus.js";
import { detectActionItem } from "./skills/jira/detectActionItem.js";
import { detectBugReport } from "./skills/jira/detectBugReport.js";
import { detectDecision } from "./skills/jira/detectDecision.js";
import { createIssue, notifyTeams } from "./tools/index.js";

bus.on("transcript", async ({ botId, session }: TranscriptEvent) => {
  const buffer = session.transcriptBuffer;

  const actionItem = detectActionItem(buffer);
  if (actionItem) {
    const issue = await createIssue({ ...actionItem, type: "Task" });
    await notifyTeams(botId, `Action item detected — [${issue.key}] ${actionItem.summary}`);
  }

  const bug = detectBugReport(buffer);
  if (bug) {
    const issue = await createIssue({ ...bug, type: "Bug" });
    await notifyTeams(botId, `Bug reported — [${issue.key}] ${bug.summary}`);
  }

  const decision = detectDecision(buffer);
  if (decision) {
    const issue = await createIssue({ ...decision, type: "Task", labels: ["decision"] });
    await notifyTeams(botId, `Decision logged — [${issue.key}] ${decision.summary}`);
  }
});
