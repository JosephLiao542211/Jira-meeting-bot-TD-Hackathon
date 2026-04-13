import { enqueue, type Job } from "../../../service/queue.js";

export function updateIssue(issueKey: string, fields: Record<string, unknown>, botId: string): Job {
  return enqueue({ type: "updateIssue", payload: { issueKey, fields }, botId });
}
