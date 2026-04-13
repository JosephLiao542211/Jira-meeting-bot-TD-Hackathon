import { log } from "../util/index.js";

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  botId: string;
  status: "pending" | "approved" | "denied";
  completedAt?: number;
}

/** How long completed jobs stay in the map for dedup (5 minutes). */
const RETENTION_MS = 5 * 60 * 1000;

const jobs = new Map<string, Job>();

function pruneCompleted(): void {
  const cutoff = Date.now() - RETENTION_MS;
  for (const [id, job] of jobs) {
    if (job.completedAt && job.completedAt < cutoff) jobs.delete(id);
  }
}

export function enqueue(data: Omit<Job, "id" | "status">): Job {
  pruneCompleted();
  const id = `job_${Date.now()}`;
  const job: Job = { ...data, id, status: "pending" };
  jobs.set(id, job);
  const label = data.payload.summary ?? data.payload.issueKey ?? data.type;
  log("queue", `enqueued ${id} — ${data.type}: ${label}`, "yellow");
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/**
 * Returns true if ANY recent job (pending, approved, or denied) matches the predicate.
 * This prevents re-proposing tickets that were already handled.
 */
export function hasPending(predicate: (job: Job) => boolean): boolean {
  for (const job of jobs.values()) {
    if (predicate(job)) return true;
  }
  return false;
}

/** Returns recent jobs for a given bot (pending + completed within retention window). */
export function getRecentJobs(botId: string): Job[] {
  pruneCompleted();
  const result: Job[] = [];
  for (const job of jobs.values()) {
    if (job.botId === botId) result.push(job);
  }
  return result;
}

export function updateStatus(id: string, status: Job["status"]): Job | undefined {
  const job = jobs.get(id);
  if (job) {
    job.status = status;
    if (status === "approved" || status === "denied") {
      job.completedAt = Date.now();
    }
    log("queue", `${id} → ${status}`, status === "approved" ? "green" : "red");
  }
  return job;
}
