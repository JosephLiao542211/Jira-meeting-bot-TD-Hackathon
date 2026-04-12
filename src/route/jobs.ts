import { Router } from "express";
import { getJob, updateStatus } from "../service/queue.js";
import { executeJob } from "../service/jobExecutor.js";
import { notifyResult } from "../agent/tools/teams/notify.js";

export const jobsRouter = Router();

jobsRouter.get("/:id/approve", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).json({ error: "not found" }); return; }
  if (job.status !== "pending") { res.json({ status: job.status }); return; }

  updateStatus(job.id, "approved");
  try {
    const { issueKey } = await executeJob(job);
    await notifyResult(job.botId, `✅ Created ${issueKey}: ${job.payload.summary}`);
    res.json({ approved: true, issueKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

jobsRouter.get("/:id/deny", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).json({ error: "not found" }); return; }

  updateStatus(job.id, "denied");
  await notifyResult(job.botId, `❌ Denied: ${job.payload.summary}`);
  res.json({ denied: true });
});
