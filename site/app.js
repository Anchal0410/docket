// Fill this in once you've deployed via render.yaml — e.g.
// "https://docket-demo.onrender.com". Left blank, the button explains that
// instead of silently failing.
const API_BASE = "";

const STEPS = ["PENDING", "QUEUED", "PROCESSING", "COMPLETED"];

const btn = document.getElementById("demo-submit");
const statusEl = document.getElementById("demo-status");
const timelineEl = document.getElementById("demo-timeline");

function setStatus(text, kind) {
  statusEl.innerHTML = `<span class="demo-status-${kind ?? "idle"}">${text}</span>`;
}

function renderTimeline(current) {
  const idx = STEPS.indexOf(current);
  timelineEl.innerHTML = STEPS.map((step, i) => {
    const cls = i < idx ? "done" : i === idx ? "active" : "";
    return `<span class="demo-step ${cls}">${step}</span>`;
  }).join("");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithColdStartHint(url, opts, onSlow) {
  const slowTimer = setTimeout(onSlow, 4000);
  try {
    return await fetch(url, opts);
  } finally {
    clearTimeout(slowTimer);
  }
}

async function submitDemoJob() {
  if (!API_BASE) {
    setStatus(
      "Demo isn't wired up to a live backend yet — see the deployment steps in the repo.",
      "error",
    );
    return;
  }

  btn.disabled = true;
  timelineEl.innerHTML = "";
  setStatus("Submitting…", "idle");

  let res;
  try {
    res = await fetchWithColdStartHint(
      `${API_BASE}/jobs`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "send_email",
          payload: { to: "visitor@example.com" },
        }),
      },
      () => setStatus("Waking up the free instance — can take up to a minute…", "idle"),
    );
  } catch {
    setStatus("Couldn't reach the demo instance. It may be asleep or offline — try again in a minute.", "error");
    btn.disabled = false;
    return;
  }

  if (res.status === 429) {
    setStatus("Rate-limited — someone's been busy. Try again in a moment.", "error");
    btn.disabled = false;
    return;
  }
  if (res.status === 503) {
    setStatus("Backpressure: the demo queue is at capacity right now. Try again shortly.", "error");
    btn.disabled = false;
    return;
  }
  if (!res.ok) {
    setStatus(`Unexpected response (${res.status}).`, "error");
    btn.disabled = false;
    return;
  }

  const { data: job } = await res.json();
  renderTimeline(job.status);
  setStatus(`Job ${job.id.slice(0, 8)}… submitted, status ${job.status}.`, "idle");

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await sleep(700);
    let poll;
    try {
      poll = await fetch(`${API_BASE}/jobs/${job.id}`);
    } catch {
      continue;
    }
    if (!poll.ok) continue;
    const { data: current } = await poll.json();
    renderTimeline(current.status);

    if (current.status === "COMPLETED") {
      setStatus(
        `Completed. Handler result: ${JSON.stringify(current.result)}`,
        "ok",
      );
      btn.disabled = false;
      return;
    }
    if (current.status === "DEAD_LETTER" || current.status === "CANCELLED") {
      setStatus(`Ended in ${current.status}.`, "error");
      btn.disabled = false;
      return;
    }
    setStatus(`Status: ${current.status}…`, "idle");
  }

  setStatus("Still processing — taking longer than expected.", "idle");
  btn.disabled = false;
}

btn.addEventListener("click", submitDemoJob);
