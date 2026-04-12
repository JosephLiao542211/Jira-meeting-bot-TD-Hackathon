import { Router } from "express";
import { launchBot } from "../service/recall.js";

export const botRouter = Router();

botRouter.post("/start-bot", async (req, res) => {
  const { meetingUrl } = req.body;
  if (!meetingUrl) {
    res.status(400).json({ error: "meetingUrl required" });
    return;
  }

  try {
    const bot = await launchBot(meetingUrl);
    res.json({ botId: bot.id, status: "launched" });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});
