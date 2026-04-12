import { config } from "./config.js";
import { withRetry } from "../util/retry.js";

async function callGeminiRaw(
  systemPrompt: string,
  messages: unknown[],
  tools: unknown[],
): Promise<any> {
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
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function callGemini(
  systemPrompt: string,
  messages: unknown[],
  tools: unknown[],
): Promise<any> {
  return withRetry(() => callGeminiRaw(systemPrompt, messages, tools), null, {
    tag: "gemini",
    maxAttempts: 3,
    baseDelayMs: 1_000,
  });
}
