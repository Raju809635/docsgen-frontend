import html2pdf from "html2pdf.js";
import Button from "./Button.jsx";

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ targetRef, title }) {
  const safeTitle = (title || "documentation").replaceAll(/[^\w\- ]+/g, "").trim() || "documentation";

  async function exportPdf() {
    if (!targetRef?.current) return;
    const element = targetRef.current;
    const options = {
      margin: [10, 10, 10, 10],
      filename: `${safeTitle}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#020617" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    await html2pdf().set(options).from(element).save();
  }

  function exportHtml() {
    if (!targetRef?.current) return;
    const body = targetRef.current.innerHTML;
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: dark; }
      body { margin:0; padding:24px; background:#020617; color:#e2e8f0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      h1,h2 { color:#f8fafc; }
      a { color:#60a5fa; }
      .card { border: 1px solid rgba(51,65,85,0.6); background: rgba(15,23,42,0.5); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
      pre { white-space: pre-wrap; word-break: break-word; }
      svg { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
    downloadText(`${safeTitle}.html`, html);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={exportPdf}>Export PDF</Button>
      <Button variant="secondary" onClick={exportHtml}>
        Export HTML
      </Button>
    </div>
  );
}

