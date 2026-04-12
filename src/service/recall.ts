export async function launchBot(meetingUrl: string): Promise<{ id: string }> {
  const region = process.env.RECALL_REGION ?? "us-east-1";
  const wsUrl = process.env.PUBLIC_WS_URL ?? "wss://your-server.com/ws/recall";

  const res = await fetch(`https://${region}.recall.ai/api/v1/bot/`, {
    method: "POST",
    headers: {
      Authorization: process.env.RECALL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: process.env.BOT_NAME ?? "Jira Assistant",
      recording_config: {
        realtime_endpoints: [
          {
            type: "websocket",
            url: wsUrl,
            events: ["transcript.data", "participant_events.join", "participant_events.leave"],
          },
        ],
        transcript: { provider: { meeting_captions: {} } },
      },
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}
