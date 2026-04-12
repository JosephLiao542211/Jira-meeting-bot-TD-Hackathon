import { getActiveSprintId } from "../../../service/jira.js";

export async function getActiveSprint() {
  return { sprintId: await getActiveSprintId(process.env.JIRA_PROJECT_KEY ?? "") };
}
