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
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateStatus(id: string, status: Job["status"]): Job | undefined {
  const job = jobs.get(id);
  if (job) job.status = status;
  return job;
}
