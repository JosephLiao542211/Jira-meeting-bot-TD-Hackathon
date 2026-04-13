import { searchIssues as search } from "../../../service/jira.js";

export async function searchIssues(jql: string) {
  return search(jql);
}
