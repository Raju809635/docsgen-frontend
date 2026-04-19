import html2pdf from "html2pdf.js";

function safeFilename(name) {
  return (name || "documentation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64) || "documentation";
}

export async function exportPdf({ element, title }) {
  const filename = `${safeFilename(title)}.pdf`;
  const opt = {
    margin: [12, 12, 12, 12],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#020617" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };
  await html2pdf().set(opt).from(element).save();
}

export function exportHtml({ doc, diagramSvg }) {
  const filename = `${safeFilename(doc?.title)}.html`;

  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(doc?.title || "Documentation")}</title>
  <style>
    :root{color-scheme:dark}
    body{margin:0;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial}
    .wrap{max-width:980px;margin:0 auto;padding:28px}
    .card{background:rgba(2,6,23,.6);border:1px solid rgba(148,163,184,.18);border-radius:16px;padding:18px 18px 16px;margin:14px 0}
    h1{font-size:28px;margin:0 0 8px}
    h2{font-size:16px;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin:0 0 10px}
    .p{white-space:pre-wrap;line-height:1.55}
    .svg{background:rgba(15,23,42,.55);border:1px solid rgba(56,189,248,.22);border-radius:14px;padding:12px;overflow:auto}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${esc(doc?.title)}</h1>
      <div class="p">${esc(doc?.overview)}</div>
    </div>
    <div class="card">
      <h2>Workflow</h2>
      <div class="p">${esc(doc?.workflow)}</div>
    </div>
    <div class="card">
      <h2>Diagram</h2>
      <div class="svg">${diagramSvg || ""}</div>
    </div>
    <div class="card">
      <h2>Technical Breakdown</h2>
      <div class="p">${esc(doc?.technical)}</div>
    </div>
    <div class="card">
      <h2>Use Cases</h2>
      <div class="p">${esc(doc?.use_cases)}</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

