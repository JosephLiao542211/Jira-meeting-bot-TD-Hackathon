import type { Ticket } from "../../../service/session.js";

export async function createIssue(ticket: Ticket): Promise<{ key: string }> {
  const res = await fetch(`${process.env.JIRA_BASE_URL}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64"),
    },
    body: JSON.stringify({
      fields: {
        project: { key: process.env.JIRA_PROJECT_KEY },
        summary: ticket.summary,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: ticket.description ?? "" }] }],
        },
        issuetype: { name: ticket.type ?? "Task" },
        priority: { name: ticket.priority ?? "Medium" },
        ...(ticket.assignee ? { assignee: { accountId: ticket.assignee } } : {}),
        ...(ticket.labels?.length ? { labels: ticket.labels } : {}),
      },
    }),
  });

  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ key: string }>;
}
