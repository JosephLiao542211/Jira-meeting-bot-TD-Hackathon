export async function notify(message: string): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("TEAMS_WEBHOOK_URL is not set");

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  if (!res.ok) throw new Error(`Teams webhook ${res.status}: ${await res.text()}`);
}
