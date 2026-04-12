import { config } from "./config.js";
import { searchIssues, getUsers, getActiveSprintId } from "../service/jira.js";
import { researchToolDeclarations } from "./tools/index.js";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

const researchExecutors: Record<string, (args: any) => Promise<unknown>> = {
  searchIssues: ({ jql }: { jql: string }) => searchIssues(jql),
  getUsers: ({ query }: { query: string }) => getUsers(query),
  getActiveSprint: () => getActiveSprintId(process.env.JIRA_PROJECT_KEY ?? "").then((id) => ({ sprintId: id })),
};

async function callGemini(systemPrompt: string, messages: unknown[], tools: unknown[]): Promise<any> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages,
        tools: [{ function_declarations: tools }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  return res.json();
}

// Agentic loop — Gemini can call research tools freely before making a final action call.
// Returns the action tool call (e.g. createIssue) or null if no action is needed.
export async function ask(
  systemPrompt: string,
  transcript: string[],
  actionTools: unknown[]
): Promise<ToolCall | null> {
  const allTools = [...researchToolDeclarations, ...actionTools];
  const messages: any[] = [{ role: "user", parts: [{ text: transcript.join("\n") }] }];

  for (let turn = 0; turn < 5; turn++) {
    const data = await callGemini(systemPrompt, messages, allTools);
    const part = data.candidates?.[0]?.content?.parts?.[0];

    if (!part?.functionCall) return null; // no action needed

    const call: ToolCall = { name: part.functionCall.name, args: part.functionCall.args ?? {} };

    if (researchExecutors[call.name]) {
      const result = await researchExecutors[call.name](call.args);
      messages.push(
        { role: "model", parts: [{ functionCall: { name: call.name, args: call.args } }] },
        { role: "user", parts: [{ functionResponse: { name: call.name, response: { content: JSON.stringify(result) } } }] }
      );
    } else {
      return call; // action tool — hand back to skill
    }
  }

  return null;
}
