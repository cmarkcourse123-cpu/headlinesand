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
  statusText: document.getElementById("statusText"),
  spinner: document.getElementById("spinner"),
    winnerBox: $("winnerBox"),
  winnerHeadline: $("winnerHeadline"),
  winnerReason: $("winnerReason"),
};

const DEFAULT_ENDPOINT_HINT = "https://headline-lab-worker.prichardsonny.workers.dev";

function setStatus(msg, kind = "muted", isLoading = false) {
  els.status.className = `status ${kind}` + (isLoading ? " loading" : "");
  if (els.statusText) els.statusText.textContent = msg;
  else els.status.textContent = msg;
}

function render(rows) {
  els.tbody.innerHTML = "";

  const ranked = rows.map(r => {
    const four = Number(r.scores?.four_u) || 0;
    const clarity = Number(r.scores?.clarity) || 0;
    const ctr = Number(r.scores?.ctr_potential) || 0;
    const rank_score = four + clarity + ctr;

    return { ...r, rank_score };
  });

  ranked.sort((a, b) => b.rank_score - a.rank_score);

  if (ranked.length > 0) {
    const winner = ranked[0];
    els.winnerHeadline.textContent = winner.headline || "";
    els.winnerReason.textContent =
      winner.notes || "This headline achieved the strongest combined score across 4U, clarity, and click potential.";
    els.winnerBox.classList.remove("hidden");
  } else {
    els.winnerBox.classList.add("hidden");
  }

  ranked.forEach((r, i) => {
    const tr = document.createElement("tr");

    if (i === 0) {
      tr.classList.add("winner-row");
    }

    tr.innerHTML = `
      <td>${i + 1}${i === 0 ? " 🏆" : ""}</td>
      <td>${escapeHtml(r.framework || "")}</td>
      <td>${escapeHtml(r.headline || "")}</td>
      <td>${num(r.scores?.four_u)}</td>
      <td>${num(r.scores?.clarity)}</td>
      <td>${num(r.scores?.ctr_potential)}</td>
      <td>${num(r.rank_score)}</td>
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
    [...tr.querySelectorAll("td")].map(td => td.textContent.replaceAll("\t", " ").trim()).join("\t")
  );
const header = ["Rank", "Framework", "Headline", "4U", "Clarity", "CTR", "Total", "Notes"].join("\t");
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
  els.endpoint.value = DEFAULT_ENDPOINT_HINT;
  setStatus("Demo loaded. Click Generate + Score.", "muted");
});


els.go.addEventListener("click", async () => {
  const endpoint = (els.endpoint.value || "").trim().replace(/\/+$/, "");
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
  setStatus("Generating + scoring…", "muted", true);

  try {
    const res = await fetch(`${endpoint}/headline-lab`, {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
    "x-class-key": "marketing384"
     },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    const data = await res.json();
    render(data.items || []);
    setStatus(`Done. Model: ${data.model || "?"} • Tokens: ${data.usage?.total_tokens ?? "?"}`, "muted", false);
  } catch (err) {
    setStatus(`Error: ${err.message}`, "muted", false);
  } finally {
    els.go.disabled = false;
  }
});
