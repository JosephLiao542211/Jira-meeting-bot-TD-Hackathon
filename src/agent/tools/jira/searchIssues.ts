export async function searchIssues(jql: string): Promise<{ issues: { key: string; fields: { summary: string } }[] }> {
  const url = new URL(`${process.env.JIRA_BASE_URL}/rest/api/3/search`);
  url.searchParams.set("jql", jql);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64"),
    },
  });

  if (!res.ok) throw new Error(`Jira ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ issues: { key: string; fields: { summary: string } }[] }>;
}
