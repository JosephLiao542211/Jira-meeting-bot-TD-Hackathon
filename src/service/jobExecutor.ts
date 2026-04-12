import type { Job } from "./queue.js";
import type { Ticket } from "./jira.js";
import { createIssue, updateIssue, transitionIssue, toAdf } from "./jira.js";

export async function executeJob(job: Job): Promise<{ issueKey: string }> {
  switch (job.type) {
    case "createIssue":
      return { issueKey: (await createIssue(job.payload as unknown as Ticket)).key };

    case "updateIssue": {
      const { issueKey, ...updates } = job.payload as { issueKey: string; [k: string]: unknown };
      const fields: Record<string, unknown> = {};
      if (updates.summary) fields.summary = updates.summary;
      if (updates.description) fields.description = toAdf(String(updates.description));
      if (updates.priority) fields.priority = { name: updates.priority };
      if (updates.assignee) fields.assignee = { accountId: updates.assignee };
      if (updates.labels) fields.labels = updates.labels;
      await updateIssue(issueKey, fields);
      return { issueKey };
    }

    case "transitionIssue": {
      const { issueKey, transitionId } = job.payload as { issueKey: string; transitionId: string };
      await transitionIssue(issueKey, transitionId);
      return { issueKey };
    }

    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
