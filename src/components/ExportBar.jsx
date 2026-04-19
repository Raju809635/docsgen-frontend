import Button from "./Button.jsx";
import { exportHtml, exportPdf } from "../lib/export.js";

export default function ExportBar({ doc, diagramSvg, exportTargetRef }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={async () => {
          const el = exportTargetRef?.current;
          if (!el) return;
          await exportPdf({ element: el, title: doc?.title });
        }}
        disabled={!doc}
      >
        Download PDF
      </Button>
      <Button
        className="bg-emerald-500/15 border-emerald-400/30 hover:bg-emerald-500/20 hover:border-emerald-300/40 text-emerald-50"
        onClick={() => exportHtml({ doc, diagramSvg })}
        disabled={!doc}
      >
        Download HTML
      </Button>
    </div>
  );
}

