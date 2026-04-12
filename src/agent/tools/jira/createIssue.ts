import { enqueue, type Job } from "../../../service/queue.js";
import type { Ticket } from "../../../service/session.js";

export function createIssue(ticket: Ticket, botId: string): Job {
  return enqueue({ type: "createIssue", payload: ticket as unknown as Record<string, unknown>, botId });
}
