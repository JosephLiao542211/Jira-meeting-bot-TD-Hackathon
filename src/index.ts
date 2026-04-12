import "dotenv/config";
import http from "http";
import express from "express";
import { WebSocketServer } from "ws";
import { botRouter } from "./route/bot.js";
import { jobsRouter } from "./route/jobs.js";
import { registerRecallWs } from "./route/recall.js";

// Register skills — side-effect imports that attach bus listeners
import "./agent/skills/jira/detectActionItem.js";
import "./agent/skills/jira/detectBugReport.js";
import "./agent/skills/jira/detectDecision.js";

const app = express();
app.use(express.json());
app.use("/api", botRouter);
app.use("/api/jobs", jobsRouter);

const server = http.createServer(app);
const recallWss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/ws/recall") {
    recallWss.handleUpgrade(req, socket, head, (ws) => recallWss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

registerRecallWs(recallWss);

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => console.log(`Listening on :${PORT}`));
