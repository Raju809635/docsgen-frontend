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
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy", "avoid-all"] },
  };
  await html2pdf().set(opt).from(element).save();
}

function renderSections(doc) {
  return (doc?.sections || [])
    .map(
      (section) => `
    <div class="card page-block">
      <h2>${esc(section.title)}</h2>
      <div class="p">${esc(section.content)}</div>
    </div>`,
    )
    .join("");
}

function renderPages(doc) {
  return (doc?.pages || [])
    .map(
      (page) => `
    <section class="doc-page">
      <div class="page-title">${esc(page.title)}</div>
      ${(page.sections || [])
        .map(
          (section) => `
      <div class="card page-block">
        <h2>${esc(section.title)}</h2>
        <div class="p">${esc(section.content)}</div>
      </div>`,
        )
        .join("")}
    </section>`,
    )
    .join("");
}

function renderDiagrams(doc, diagramSvg, graphvizSvgMap) {
  return (doc?.diagrams || [])
    .map((item, index) => {
      const svg = item.type === "graphviz" ? graphvizSvgMap?.[index] || "" : index === 0 ? diagramSvg || "" : "";
      return `
    <div class="card page-block">
      <h2>${esc(item.title)} (${esc(item.type)})</h2>
      <div class="p">${esc(item.summary)}</div>
      <div class="svg">${svg || `<pre>${esc(item.code)}</pre>`}</div>
    </div>`;
    })
    .join("");
}

function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function exportHtml({ doc, diagramSvg, graphvizSvgMap }) {
  const filename = `${safeFilename(doc?.title)}.html`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(doc?.title || "Documentation")}</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    body{margin:0;background:#f8fafc;color:#0f172a;font-family:Georgia,"Times New Roman",serif}
    .wrap{max-width:980px;margin:0 auto;padding:32px}
    .card{background:#ffffff;border:1px solid #cbd5e1;border-radius:16px;padding:22px 22px 18px;margin:16px 0;box-shadow:0 8px 24px rgba(15,23,42,.06)}
    h1{font-size:30px;line-height:1.2;margin:0 0 10px;color:#0f172a}
    h2{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#475569;margin:0 0 12px;font-family:Arial,Helvetica,sans-serif}
    .p{white-space:pre-wrap;line-height:1.7;color:#1e293b;font-size:16px}
    .svg{background:#f8fafc;border:1px solid #cbd5e1;border-radius:14px;padding:12px;overflow:auto}
    .doc-page{page-break-after:always;padding-bottom:10px}
    .doc-page:last-child{page-break-after:auto}
    .page-title{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#2563eb;margin:18px 0 4px;font-family:Arial,Helvetica,sans-serif}
    .page-block{break-inside:avoid;page-break-inside:avoid}
    pre{white-space:pre-wrap;overflow:auto;color:#0f172a;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0}
    @media print{
      body{background:#ffffff}
      .wrap{padding:0}
      .card{box-shadow:none}
    }
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
    ${renderDiagrams(doc, diagramSvg, graphvizSvgMap)}
    ${renderSections(doc)}
    ${renderPages(doc)}
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
