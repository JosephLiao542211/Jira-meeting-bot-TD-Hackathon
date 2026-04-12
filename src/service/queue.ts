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
  log("queue", `enqueued ${id} — ${data.type}: ${data.payload.summary}`, "yellow");
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/** Returns true if a pending job with the same summary already exists. */
export function hasPendingDuplicate(summary: string): boolean {
  for (const job of jobs.values()) {
    if (job.status === "pending" && job.payload.summary === summary) return true;
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
