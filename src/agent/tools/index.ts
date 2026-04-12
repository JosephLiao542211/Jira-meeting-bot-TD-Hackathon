export { createIssue } from "./jira/createIssue.js";
export { updateIssue } from "./jira/updateIssue.js";
export { searchIssues } from "./jira/searchIssues.js";
export { getUsers } from "./jira/getUsers.js";
export { getActiveSprint } from "./jira/getSprints.js";
export { requestApproval, notifyResult } from "./teams/notify.js";

// ── Research tools (read-only lookups, executed automatically) ───────────────

export const researchToolDeclarations = [
  {
    name: "searchIssues",
    description:
      "Search existing Jira issues by JQL. Always call before creating or updating an issue to find the correct issue key or check for duplicates.",
    parameters: {
      type: "object",
      properties: {
        jql: {
          type: "string",
          description:
            "JQL query e.g. 'project = KAN AND summary ~ \"login bug\" AND status != Done'",
        },
      },
      required: ["jql"],
    },
  },
  {
    name: "getUsers",
    description:
      "Search org members by display name to resolve their Jira accountId. Call when a person is named for assignment.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Display name or partial name of the person.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getActiveSprint",
    description:
      "Returns the currently active sprint ID for the project. Call to assign a ticket to the current sprint.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "getTransitions",
    description:
      "Returns available status transitions for a Jira issue. Call before transitionIssue to find the correct transitionId for the target status (e.g. 'In Progress', 'Done').",
    parameters: {
      type: "object",
      properties: {
        issueKey: {
          type: "string",
          description: "The issue key e.g. 'KAN-1'.",
        },
      },
      required: ["issueKey"],
    },
  },
];

// ── Action tools (state-changing, queued for human approval) ─────────────────

export const actionToolDeclarations = [
  {
    name: "createIssue",
    description:
      "Create a new Jira issue or subtask. You MUST call searchIssues first to check for duplicates. To create a subtask, set type to 'Subtask' and provide parentKey.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Concise title under 100 chars. Start with a verb.",
        },
        description: {
          type: "string",
          description: "Context from the transcript about what needs to be done.",
        },
        type: {
          type: "string",
          enum: ["Task", "Bug", "Story", "Subtask"],
          description: "Task for action items & decisions, Bug for bugs, Subtask for child items under a parent issue.",
        },
        priority: {
          type: "string",
          enum: ["Highest", "High", "Medium", "Low", "Lowest"],
          description: "Infer from transcript. Bugs default to High, others to Medium.",
        },
        assignee: {
          type: "string",
          description: "Jira accountId resolved via getUsers. Omit if unknown.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "e.g. ['decision', 'regression', 'ui'].",
        },
        sprintId: {
          type: "number",
          description: "Active sprint ID from getActiveSprint.",
        },
        parentKey: {
          type: "string",
          description: "Parent issue key for subtasks, e.g. 'KAN-1'. Required when type is 'Subtask'.",
        },
      },
      required: ["summary", "type"],
    },
  },
  {
    name: "updateIssue",
    description:
      "Update fields on an existing Jira issue. Call searchIssues first to find the issue key. Only include fields you want to change.",
    parameters: {
      type: "object",
      properties: {
        issueKey: {
          type: "string",
          description: "The issue key to update, e.g. 'KAN-1'. Resolve via searchIssues.",
        },
        summary: {
          type: "string",
          description: "New summary/title for the issue.",
        },
        description: {
          type: "string",
          description: "New description text.",
        },
        priority: {
          type: "string",
          enum: ["Highest", "High", "Medium", "Low", "Lowest"],
          description: "New priority level.",
        },
        assignee: {
          type: "string",
          description: "Jira accountId resolved via getUsers.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Replacement labels (overwrites existing).",
        },
      },
      required: ["issueKey"],
    },
  },
  {
    name: "transitionIssue",
    description:
      "Change the status of a Jira issue (e.g. To Do → In Progress → In Review → Done). You MUST call getTransitions first to get the correct transitionId.",
    parameters: {
      type: "object",
      properties: {
        issueKey: {
          type: "string",
          description: "The issue key, e.g. 'KAN-1'.",
        },
        transitionId: {
          type: "string",
          description: "The transition ID from getTransitions. e.g. '21' for In Progress.",
        },
      },
      required: ["issueKey", "transitionId"],
    },
  },
];
