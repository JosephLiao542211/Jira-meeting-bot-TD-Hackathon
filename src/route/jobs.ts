import { Router } from "express";
import { getJob, updateStatus } from "../service/queue.js";
import { executeJob } from "../service/jobExecutor.js";
import { notifyResult } from "../agent/tools/teams/notify.js";
import { log } from "../util/index.js";

export const jobsRouter = Router();

/** Minimal page that auto-POSTs on load. Link previews don't run JS → safe. */
function autoPostPage(action: string, jobId: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Processing…</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#555}</style></head>
<body><p>Processing…</p>
<form id="f" method="POST" action="/api/jobs/${jobId}/${action}"></form>
<script>document.getElementById("f").submit()</script>
<noscript><p><a href="/api/jobs/${jobId}/${action}">Click here to ${action}</a></p></noscript>
</body></html>`;
}

function resultPage(status: string, message: string): string {
  const color = status === "approved" ? "#22863a" : status === "denied" ? "#cb2431" : "#555";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${status}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{text-align:center;padding:32px}.status{font-size:48px;margin-bottom:8px}h2{margin:0;color:${color}}p{color:#555;margin-top:8px}</style></head>
<body><div class="card">
<div class="status">${status === "approved" ? "✅" : status === "denied" ? "❌" : "⚠️"}</div>
<h2>${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
<p>${message}</p>
<p id="closing" style="font-size:12px;color:#999;display:none">Closing tab…</p>
</div>
<script>
setTimeout(function(){
  document.getElementById("closing").style.display="block";
  setTimeout(function(){ window.close(); }, 500);
}, 1000);
</script>
</body></html>`;
}

// GET auto-submits a POST via JS (link previews don't execute JS → safe)
jobsRouter.get("/:id/approve", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  if (job.status !== "pending") {
    res.type("html").send(resultPage(job.status, "This job has already been handled."));
    return;
  }
  res.type("html").send(autoPostPage("approve", job.id));
});

jobsRouter.get("/:id/deny", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  if (job.status !== "pending") {
    res.type("html").send(resultPage(job.status, "This job has already been handled."));
    return;
  }
  res.type("html").send(autoPostPage("deny", job.id));
});

// POST executes the action
jobsRouter.post("/:id/approve", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  if (job.status !== "pending") {
    res.type("html").send(resultPage(job.status, "This job has already been handled."));
    return;
  }

  updateStatus(job.id, "approved");
  try {
    const { issueKey } = await executeJob(job);
    const label = String(job.payload.summary ?? job.payload.issueKey ?? job.type);
    log("jobs", `approved ${job.id} → ${issueKey}`, "green");
    await notifyResult(job.botId, `✅ ${job.type} approved → ${issueKey}: ${label}`);
    res.type("html").send(resultPage("approved", `${issueKey}: ${label}`));
  } catch (err: any) {
    log("jobs", `failed to execute ${job.id}: ${err.message}`, "red");
    updateStatus(job.id, "pending");
    res.type("html").send(resultPage("error", err.message));
  }
});

jobsRouter.post("/:id/deny", async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).send("Job not found"); return; }
  if (job.status !== "pending") {
    res.type("html").send(resultPage(job.status, "This job has already been handled."));
    return;
  }

  const label = String(job.payload.summary ?? job.payload.issueKey ?? job.type);
  updateStatus(job.id, "denied");
  log("jobs", `denied ${job.id} — ${label}`, "red");
  await notifyResult(job.botId, `❌ Denied: ${label}`);
  res.type("html").send(resultPage("denied", label));
});
