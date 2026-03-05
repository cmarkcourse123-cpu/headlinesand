function $(id) { return document.getElementById(id); }

const els = {
  product: $("product"),
  audience: $("audience"),
  tone: $("tone"),
  style: $("style"),
  framework: $("framework"),
  temp: $("temp"),
  n: $("n"),
  endpoint: $("endpoint"),
  go: $("go"),
  demo: $("demo"),
  status: $("status"),
  tbody: $("tbody"),
  copy: $("copy"),
};

const DEFAULT_ENDPOINT_HINT = "https://YOUR-WORKER.SUBDOMAIN.workers.dev";

function setStatus(msg, kind="muted") {
  els.status.className = `status ${kind}`;
  els.status.textContent = msg;
}

function render(rows) {
  els.tbody.innerHTML = "";
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.headline || "")}</td>
      <td>${num(r.scores?.four_u)}</td>
      <td>${num(r.scores?.clarity)}</td>
      <td>${num(r.scores?.ctr_potential)}</td>
      <td><small>${escapeHtml((r.notes || "").trim())}</small></td>
    `;
    els.tbody.appendChild(tr);
  });
}

function num(x) {
  if (x === null || x === undefined) return "";
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(1) : "";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toTSV() {
  const rows = [...els.tbody.querySelectorAll("tr")].map(tr =>
    [...tr.querySelectorAll("td")].map(td => td.textContent.replaceAll("\t"," ").trim()).join("\t")
  );
  const header = ["#", "Headline", "4U", "Clarity", "CTR", "Notes"].join("\t");
  return [header, ...rows].join("\n");
}

els.copy.addEventListener("click", async () => {
  const tsv = toTSV();
  await navigator.clipboard.writeText(tsv);
  setStatus("Copied table to clipboard (TSV). Paste into Excel/Sheets.", "muted");
});

els.demo.addEventListener("click", () => {
  els.product.value = "Electric bike subscription";
  els.audience.value = "Urban commuters (25–45), time-poor professionals";
  els.tone.value = "Bold";
  els.style.value = "Curiosity";
  els.framework.value = "4U";
  if (!els.endpoint.value) els.endpoint.value = DEFAULT_ENDPOINT_HINT;
  setStatus("Demo loaded. Paste your Worker endpoint, then click Generate + Score.", "muted");
});

els.go.addEventListener("click", async () => {
  const endpoint = (els.endpoint.value || "").trim().replace(/\/+$/,"");
  if (!endpoint || endpoint.includes("YOUR-WORKER")) {
    setStatus("Add your Cloudflare Worker endpoint in Advanced → Worker Endpoint.", "muted");
    return;
  }

  const payload = {
    product: els.product.value.trim(),
    audience: els.audience.value.trim(),
    tone: els.tone.value,
    style: els.style.value,
    framework: els.framework.value,
    temperature: Number(els.temp.value),
    n: Number(els.n.value),
  };

  if (!payload.product || !payload.audience) {
    setStatus("Please fill in Product and Audience.", "muted");
    return;
  }

  els.go.disabled = true;
  setStatus("Generating + scoring…", "muted");

  try {
    const res = await fetch(`${endpoint}/headline-lab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    const data = await res.json();
    render(data.items || []);
    setStatus(`Done. Model: ${data.model || "?"} • Tokens: ${data.usage?.total_tokens ?? "?"}`, "muted");
  } catch (err) {
    setStatus(`Error: ${err.message}`, "muted");
  } finally {
    els.go.disabled = false;
  }
});