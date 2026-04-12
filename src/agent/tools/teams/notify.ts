import type { Job } from "../../../service/queue.js";

async function send(botId: string, message: string): Promise<void> {
  const region = process.env.RECALL_REGION ?? "us-east-1";
  const res = await fetch(`https://${region}.recall.ai/api/v1/bot/${botId}/send_chat_message/`, {
    method: "POST",
    headers: { Authorization: process.env.RECALL_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Recall chat ${res.status}: ${await res.text()}`);
}

export async function requestApproval(botId: string, job: Job): Promise<void> {
  const base = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const summary = String(job.payload.summary ?? "Jira action");
  const message = [
    `📋 ${job.type}: ${summary}`,
    `✅ Approve: ${base}/api/jobs/${job.id}/approve`,
    `❌ Deny: ${base}/api/jobs/${job.id}/deny`,
  ].join("\n");
  await send(botId, message);
}

export async function notifyResult(botId: string, message: string): Promise<void> {
  await send(botId, message);
}
