import Button from "./Button.jsx";
import { exportHtml, exportPdf } from "../lib/export.js";

export default function ExportBar({ doc, mermaidSvgMap, graphvizSvgMap }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={async () => {
          await exportPdf({ doc, title: doc?.title, mermaidSvgMap, graphvizSvgMap });
        }}
        disabled={!doc}
      >
        Download PDF
      </Button>
      <Button
        className="bg-emerald-500/15 border-emerald-400/30 hover:bg-emerald-500/20 hover:border-emerald-300/40 text-emerald-50"
        onClick={() => exportHtml({ doc, mermaidSvgMap, graphvizSvgMap })}
        disabled={!doc}
      >
        Download HTML
      </Button>
    </div>
  );
}
