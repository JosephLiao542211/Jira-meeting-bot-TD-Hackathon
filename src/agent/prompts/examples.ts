const PROJECT_KEY = process.env.JIRA_PROJECT_KEY ?? "PROJ";

export const fewShotExamples = `
## Examples

### Create — Bug detected
Transcript:
> Sarah: The login page crashes when you click submit twice.
> John: Yeah, that started after the last deploy.

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND issuetype = Bug AND summary ~ \\"login crash\\" AND status != Done")
2. No duplicates found.
3. createIssue(type: "Bug", summary: "Fix login page crash on double submit", priority: "High", description: "Crashes when clicking submit twice. Started after last deploy.")

### Create — Action item with assignee
Transcript:
> Alice: I'll set up the CI pipeline for the new repo by end of week.

Workflow:
1. searchIssues + getUsers("Alice") + getActiveSprint() — all in parallel
2. No duplicates, accountId resolved.
3. createIssue(type: "Task", summary: "Set up CI pipeline for new repo", assignee: "<accountId>")

### Create — Decision
Transcript:
> Mike: So we're going with Redis for the session store?
> Team: Yeah, agreed.

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND labels = decision AND summary ~ \\"Redis session\\"")
2. No duplicates.
3. createIssue(type: "Task", summary: "Use Redis for session store", labels: ["decision"])

### Create — Subtasks
Transcript:
> PM: Let's break down the auth ticket into subtasks: token refresh, session cleanup, and logout flow.

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND summary ~ \\"auth\\" AND status != Done") → finds KAN-10
2. createIssue(type: "Subtask", summary: "Implement token refresh", parentKey: "KAN-10")
3. createIssue(type: "Subtask", summary: "Implement session cleanup", parentKey: "KAN-10")
4. createIssue(type: "Subtask", summary: "Implement logout flow", parentKey: "KAN-10")

### Update — Rename a ticket
Transcript:
> Lead: Actually, rename the file upload ticket to "Implement chunked file upload with progress bar".

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND summary ~ \\"file upload\\" AND status != Done") → finds KAN-7
2. updateIssue(issueKey: "KAN-7", summary: "Implement chunked file upload with progress bar")

### Update — Change priority and assignee
Transcript:
> PM: The payment bug is critical now — assign it to Dave and bump to Highest.

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND issuetype = Bug AND summary ~ \\"payment\\" AND status != Done") → finds KAN-12
2. getUsers("Dave") → resolves accountId
3. updateIssue(issueKey: "KAN-12", priority: "Highest", assignee: "<accountId>")

### Transition — Move to In Progress
Transcript:
> Dev: I'm picking up the auth middleware ticket now.

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND summary ~ \\"auth middleware\\" AND status != Done") → finds KAN-3
2. getTransitions(issueKey: "KAN-3") → [{id: "21", name: "In Progress"}, ...]
3. transitionIssue(issueKey: "KAN-3", transitionId: "21")

### Transition — Mark as Done
Transcript:
> Dev: The API rate limiting ticket is done, merged this morning.

Workflow:
1. searchIssues(jql: "project = ${PROJECT_KEY} AND summary ~ \\"rate limiting\\"") → finds KAN-9
2. getTransitions(issueKey: "KAN-9") → [{id: "41", name: "Done"}, ...]
3. transitionIssue(issueKey: "KAN-9", transitionId: "41")

### No action — noise
Transcript:
> Bob: Hello everyone, can you hear me?
> Alice: Yes, loud and clear.

No tool calls. Meeting setup chatter.

### No action — vague
Transcript:
> Dave: We should probably think about refactoring the auth module at some point.

No tool calls. Vague statement with no commitment or assignment.
`.trim();
