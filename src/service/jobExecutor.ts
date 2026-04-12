import type { Job } from "./queue.js";
import type { Ticket } from "./session.js";
import { createIssue, updateIssue } from "./jira.js";

export async function executeJob(job: Job): Promise<{ issueKey: string }> {
  switch (job.type) {
    case "createIssue":
      return { issueKey: (await createIssue(job.payload as unknown as Ticket)).key };
    case "updateIssue":
      await updateIssue(job.payload.issueKey as string, job.payload.fields as Record<string, unknown>);
      return { issueKey: job.payload.issueKey as string };
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
