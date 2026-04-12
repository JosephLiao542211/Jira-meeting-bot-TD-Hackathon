import { Router } from "express";
import { getJob, updateStatus } from "../service/queue.js";
import { executeJob } from "../service/jobExecutor.js";
import { notifyResult } from "../agent/tools/teams/notify.js";
import { log } from "../util/index.js";

export const jobsRouter = Router();

function confirmationPage(job: { id: string; type: string; payload: Record<string, unknown>; status: string }): string {
  const summary = String(job.payload.summary ?? job.payload.issueKey ?? "Jira action");
  const desc = job.payload.description ? `<p>${String(job.payload.description)}</p>` : "";
  const issueRef = job.payload.issueKey ? `<p><strong>Issue:</strong> ${String(job.payload.issueKey)}</p>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${summary}</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:0 16px}
h2{margin-bottom:4px}p{color:#555}.actions{display:flex;gap:12px;margin-top:24px}
button{padding:10px 24px;border:none;border-radius:6px;font-size:16px;cursor:pointer;color:#fff}
.approve{background:#22863a}.deny{background:#cb2431}.done{background:#666}</style></head>
<body><h2>${job.type}: ${summary}</h2>${issueRef}${desc}
${job.status !== "pending"
    ? `<p>This job has already been <strong>${job.status}</strong>.</p>`
    : `<div class="actions">
<form method="POST" action="/api/jobs/${job.id}/approve"><button class="approve" type="submit">Approve</button></form>
<form method="POST" action="/api/jobs/${job.id}/deny"><button class="deny" type="submit">Deny</button></form>
</div>`}
</body></html>`;
}

// GET serves a confirmation page (safe for Teams link unfurling)
jobsRouter.get("/:id/approve", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  res.type("html").send(confirmationPage(job));
});

jobsRouter.get("/:id/deny", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  res.type("html").send(confirmationPage(job));
});

// POST actually executes the action
jobsRouter.post("/:id/approve", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  if (job.status !== "pending") { res.type("html").send(confirmationPage(job)); return; }

  updateStatus(job.id, "approved");
  try {
    const { issueKey } = await executeJob(job);
    log("jobs", `approved ${job.id} → created ${issueKey}`, "green");
    await notifyResult(job.botId, `✅ Created ${issueKey}: ${job.payload.summary}`);
    res.type("html").send(confirmationPage({ ...job, status: "approved" }));
  } catch (err: any) {
    log("jobs", `failed to execute ${job.id}: ${err.message}`, "red");
    updateStatus(job.id, "pending");
    res.status(500).send(`Error: ${err.message}`);
  }
});

jobsRouter.post("/:id/deny", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  if (job.status !== "pending") { res.type("html").send(confirmationPage(job)); return; }

  updateStatus(job.id, "denied");
  log("jobs", `denied ${job.id} — ${job.payload.summary}`, "red");
  await notifyResult(job.botId, `❌ Denied: ${job.payload.summary}`);
  res.type("html").send(confirmationPage({ ...job, status: "denied" }));
});
