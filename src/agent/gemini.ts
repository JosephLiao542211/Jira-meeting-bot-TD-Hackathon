import { WebSocket } from "ws";
import { config } from "./config.js";
import { systemPrompt } from "./prompts/system.js";
import { toolDeclarations } from "./tools/index.js";

export function createGeminiSession(): WebSocket {
  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;
  const ws = new WebSocket(url);

  ws.on("open", () => {
    ws.send(JSON.stringify({
      setup: {
        model: `models/${config.model}`,
        system_instruction: { parts: [{ text: systemPrompt }] },
        tools: [{ function_declarations: toolDeclarations }],
        generation_config: { response_modalities: ["TEXT"] },
      },
    }));
  });

  ws.on("error", (err) => console.error("[gemini] error:", err.message));

  return ws;
}
