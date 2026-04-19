import MermaidDiagram from "./MermaidDiagram.jsx";

function GraphvizPreview({ svg }) {
  if (!svg) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-slate-950/30 p-4 text-sm text-slate-400">
        Graphviz preview is not available for this diagram yet.
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-fuchsia-400/20 bg-slate-900/40 p-4 overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function DiagramGallery({ diagrams, onMermaidSvg, graphvizSvgMap }) {
  if (!diagrams?.length) {
    return null;
  }

  return (
    <section className="p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
        Diagrams
      </div>
      <div className="mt-4 space-y-4">
        {diagrams.map((diagram, index) => (
          <div
            key={`${diagram.title}-${index}`}
            className="rounded-2xl border border-slate-700/40 bg-slate-950/20 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">{diagram.title}</div>
                <div className="mt-1 text-sm text-slate-300">{diagram.summary}</div>
              </div>
              <div className="rounded-full border border-slate-600/50 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                {diagram.type}
              </div>
            </div>
            <div className="mt-4">
              {diagram.type === "graphviz" ? (
                <GraphvizPreview svg={graphvizSvgMap?.[index] || ""} />
              ) : (
                <MermaidDiagram
                  code={diagram.code}
                  onSvg={(svg) => onMermaidSvg?.(index, svg)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
