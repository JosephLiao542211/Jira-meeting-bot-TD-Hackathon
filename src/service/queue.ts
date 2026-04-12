import { log } from "../util/index.js";

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  botId: string;
  status: "pending" | "approved" | "denied";
}

const jobs = new Map<string, Job>();

export function enqueue(data: Omit<Job, "id" | "status">): Job {
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

/** Returns true if any pending job matches the predicate. */
export function hasPending(predicate: (job: Job) => boolean): boolean {
  for (const job of jobs.values()) {
    if (job.status === "pending" && predicate(job)) return true;
  }
  return false;
}

export function updateStatus(id: string, status: Job["status"]): Job | undefined {
  const job = jobs.get(id);
  if (job) {
    job.status = status;
    log("queue", `${id} → ${status}`, status === "approved" ? "green" : "red");
  }
  return job;
}
