import { getUsers as fetchUsers } from "../../../service/jira.js";

export async function getUsers(query: string) {
  return fetchUsers(query);
}
