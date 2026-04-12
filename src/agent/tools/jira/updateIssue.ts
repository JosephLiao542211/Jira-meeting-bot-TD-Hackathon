export async function updateIssue(
  issueKey: string,
  fields: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64"),
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
}
