export async function notify(botId: string, message: string): Promise<void> {
  const region = process.env.RECALL_REGION ?? "us-east-1";

  const res = await fetch(`https://${region}.recall.ai/api/v1/bot/${botId}/send_chat_message/`, {
    method: "POST",
    headers: {
      Authorization: process.env.RECALL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) throw new Error(`Recall chat ${res.status}: ${await res.text()}`);
}
