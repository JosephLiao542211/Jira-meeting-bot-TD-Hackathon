export const examples = [
  {
    transcript: "John: I'll fix the login bug by Friday.",
    tool: "createJiraIssue",
    args: { summary: "Fix login bug", type: "Bug", assignee: "John" },
  },
  {
    transcript: "Sarah: We agreed to deprecate the v1 API next sprint.",
    tool: "createJiraIssue",
    args: { summary: "Deprecate v1 API", type: "Task", labels: ["decision"] },
  },
];
