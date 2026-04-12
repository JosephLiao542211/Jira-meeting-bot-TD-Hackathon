export { createIssue } from "./jira/createIssue.js";
export { updateIssue } from "./jira/updateIssue.js";
export { searchIssues } from "./jira/searchIssues.js";
export { notify as notifyTeams } from "./teams/notify.js";

export const toolDeclarations = [
  {
    name: "createIssue",
    description: "Creates a new Jira issue from an action item, bug report, or decision.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
        description: { type: "string" },
        type: { type: "string", enum: ["Task", "Bug", "Story"] },
        priority: { type: "string", enum: ["Highest", "High", "Medium", "Low"] },
        assignee: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
      },
      required: ["summary"],
    },
  },
  {
    name: "updateIssue",
    description: "Updates an existing Jira issue by key.",
    parameters: {
      type: "object",
      properties: {
        issueKey: { type: "string" },
        fields: { type: "object" },
      },
      required: ["issueKey", "fields"],
    },
  },
  {
    name: "searchIssues",
    description: "Searches Jira using JQL to find existing issues.",
    parameters: {
      type: "object",
      properties: {
        jql: { type: "string" },
      },
      required: ["jql"],
    },
  },
  {
    name: "notifyTeams",
    description: "Sends a notification message to Microsoft Teams.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
      required: ["message"],
    },
  },
];
