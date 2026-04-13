import { WebSocketServer } from "ws";
import { getSession } from "../service/session.js";
import { bus } from "../service/bus.js";
import { log } from "../util/index.js";

const MAX_TRANSCRIPT_BUFFER_SIZE = 40;

export function registerRecallWs(recallWss: WebSocketServer): void {
  recallWss.on("connection", (ws) => {
    log("recall", "bot connected", "cyan");

    ws.on("message", (raw) => {
      let event: any;
      try {
        event = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const botId: string = event?.data?.bot?.id ?? "unknown";
      const session = getSession(botId);

      if (event.event === "transcript.data") {
        const words: string = event.data.data.words.map((w: any) => w.text).join(" ");
        const speaker: string = event.data.data.participant?.name ?? "Unknown";
        const line = `${speaker}: ${words}`;

        session.transcriptBuffer.push(line);
        if (session.transcriptBuffer.length > MAX_TRANSCRIPT_BUFFER_SIZE) session.transcriptBuffer.shift();

        log("transcript", line, "cyan");
        bus.emit("transcript", { botId, session, line });
      }

      if (event.event?.startsWith("participant_events.")) {
        log("recall", `participant event: ${event.event}`, "gray");
      }
    });

    ws.on("close", () => log("recall", "bot disconnected", "gray"));
    ws.on("error", (err) => log("recall", `error: ${err.message}`, "red"));
  });
}
