export { createIssue } from "./jira/createIssue.js";
export { updateIssue } from "./jira/updateIssue.js";
export { searchIssues } from "./jira/searchIssues.js";
export { getUsers } from "./jira/getUsers.js";
export { getActiveSprint } from "./jira/getSprints.js";
export { requestApproval, notifyResult } from "./teams/notify.js";

export const researchToolDeclarations = [
  {
    name: "searchIssues",
    description: "Search existing Jira issues by JQL. Always call this first to check for duplicates before creating anything.",
    parameters: {
      type: "object",
      properties: {
        jql: {
          type: "string",
          description: "JQL query e.g. 'project = ENG AND summary ~ \"login bug\" AND status != Done'",
        },
      },
      required: ["jql"],
    },
  },
  {
    name: "getUsers",
    description: "Search org members by display name to resolve their Jira accountId. Call this when a person's name is mentioned for assignment.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Display name or partial name of the person." },
      },
      required: ["query"],
    },
  },
  {
    name: "getActiveSprint",
    description: "Returns the currently active sprint ID for the project. Call this to assign a ticket to the current sprint.",
    parameters: { type: "object", properties: {}, required: [] },
  },
];

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
