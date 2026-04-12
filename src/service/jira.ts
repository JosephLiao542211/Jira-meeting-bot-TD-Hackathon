import type { Ticket } from "./session.js";

// Jira Cloud REST API v3
// Docs:   https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
// ADF:    https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
// Agile:  https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/

function authHeader(): string {
  return "Basic " + Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64");
}

function baseUrl(): string {
  return `${process.env.JIRA_BASE_URL}/rest/api/3`;
}

function agileUrl(): string {
  return `${process.env.JIRA_BASE_URL}/rest/agile/1.0`;
}

function toAdf(text: string) {
  return {
    version: 1,
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

// ── Issues ────────────────────────────────────────────────────────────────────

export async function createIssue(ticket: Ticket): Promise<{ key: string }> {
  const res = await fetch(`${baseUrl()}/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      fields: {
        project: { key: process.env.JIRA_PROJECT_KEY },        // required
        summary: ticket.summary,                                // required, plain string, max 255
        issuetype: { name: ticket.type ?? "Task" },             // required: Task | Bug | Story | Epic
        ...(ticket.description ? { description: toAdf(ticket.description) } : {}),
        ...(ticket.priority ? { priority: { name: ticket.priority } } : {}),   // Highest | High | Medium | Low | Lowest
        ...(ticket.assignee ? { assignee: { accountId: ticket.assignee } } : {}), // must be accountId
        ...(ticket.labels?.length ? { labels: ticket.labels } : {}),
        ...(ticket.sprintId ? { customfield_10020: ticket.sprintId } : {}),    // active sprint
      },
    }),
  });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ key: string }>;
}

export async function updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${baseUrl()}/issue/${issueKey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
}

export async function searchIssues(jql: string): Promise<{ issues: { key: string; fields: { summary: string; status: { name: string } } }[] }> {
  const url = new URL(`${baseUrl()}/search`);
  url.searchParams.set("jql", jql);
  url.searchParams.set("fields", "summary,status,assignee,priority");
  const res = await fetch(url.toString(), { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json() as any;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export async function getUsers(query: string): Promise<JiraUser[]> {
  const url = new URL(`${baseUrl()}/users/search`);
  url.searchParams.set("query", query);
  const res = await fetch(url.toString(), { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json() as Promise<JiraUser[]>;
}

// ── Sprints ───────────────────────────────────────────────────────────────────

export async function getActiveSprintId(projectKey: string): Promise<number | null> {
  const boardsRes = await fetch(
    `${agileUrl()}/board?projectKeyOrId=${projectKey}&type=scrum`,
    { headers: { Authorization: authHeader() } }
  );
  if (!boardsRes.ok) return null;

  const boards = await boardsRes.json() as any;
  const boardId = boards.values?.[0]?.id;
  if (!boardId) return null;

  const sprintsRes = await fetch(
    `${agileUrl()}/board/${boardId}/sprint?state=active`,
    { headers: { Authorization: authHeader() } }
  );
  if (!sprintsRes.ok) return null;

  const sprints = await sprintsRes.json() as any;
  return sprints.values?.[0]?.id ?? null;
}
