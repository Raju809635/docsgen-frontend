import { useMemo, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import DocSection from "../components/DocSection.jsx";
import MermaidDiagram from "../components/MermaidDiagram.jsx";
import ExportBar from "../components/ExportBar.jsx";
import { generateDocs, renderGraphviz } from "../lib/api.js";
import DOMPurify from "dompurify";

const STARTER = `# Example Input

Build an AI documentation generator.
- Accept markdown/code
- Generate structured docs
- Render Mermaid + Graphviz
- Export to PDF/HTML
`;

function TitleBlock() {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-slate-400">
          AI Documentation Generator
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold leading-tight">
          Turn rough inputs into clean docs
          <span className="text-sky-300"> with colorful diagrams</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300/90 leading-relaxed">
          Paste text, markdown, or code. The backend returns strict JSON sections
          plus Mermaid diagram code that renders in the UI.
        </p>
      </div>
      <div className="hidden lg:block">
        <div className="rounded-2xl border border-slate-700/40 bg-slate-950/20 px-4 py-3 text-xs text-slate-300">
          <div className="font-semibold text-slate-100">Tip</div>
          <div className="mt-1">
            Use clear nouns (services, modules, flows) to get better diagrams.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratorPage() {
  const [text, setText] = useState(STARTER);
  const [doc, setDoc] = useState(null);
  const [diagramSvg, setDiagramSvg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [dot, setDot] = useState(
    `digraph G {
  rankdir=LR;
  node [shape=box, style="rounded,filled", fillcolor="#0b1220", color="#38bdf8", fontcolor="#e2e8f0"];
  edge [color="#94a3b8"];
  Input -> "AI Structuring" -> "Mermaid Diagram" -> "Export PDF/HTML";
  "AI Structuring" -> "Tech Breakdown";
}`,
  );
  const [graphvizSvg, setGraphvizSvg] = useState("");
  const [graphvizErr, setGraphvizErr] = useState("");

  const exportRef = useRef(null);

  const canGenerate = useMemo(() => text.trim().length > 0 && !loading, [text, loading]);

  async function onGenerate() {
    setLoading(true);
    setError("");
    setDoc(null);
    setDiagramSvg("");
    try {
      const data = await generateDocs(text);
      setDoc(data);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Request failed. Is the backend running?",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onRenderGraphviz() {
    setGraphvizErr("");
    setGraphvizSvg("");
    try {
      const res = await renderGraphviz(dot);
      if (res?.error) {
        setGraphvizErr(res.error);
        return;
      }
      const clean = DOMPurify.sanitize(res?.svg || "", { USE_PROFILES: { svg: true } });
      setGraphvizSvg(clean);
    } catch (e) {
      setGraphvizErr(e?.message || "Graphviz request failed.");
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <TitleBlock />

        <div className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Input</div>
              <div className="text-xs text-slate-400">
                text, markdown, or code
              </div>
            </div>
            <div className="p-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-[360px] w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/10"
                placeholder="Paste anything..."
              />
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={onGenerate} disabled={!canGenerate}>
                  {loading ? "Generating..." : "Generate Docs"}
                </Button>
                <Button
                  className="bg-slate-800/40 border-slate-600/40 hover:bg-slate-800/55 hover:border-slate-500/45 text-slate-100"
                  onClick={() => {
                    setText(STARTER);
                    setError("");
                    setDoc(null);
                    setDiagramSvg("");
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
              {error ? (
                <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold">Output</div>
              <ExportBar doc={doc} diagramSvg={diagramSvg} exportTargetRef={exportRef} />
            </div>

            <div
              ref={exportRef}
              className="p-0"
              style={{ backgroundColor: "rgba(2,6,23,0.35)" }}
            >
              {!doc ? (
                <div className="p-6 text-sm text-slate-400">
                  Generated documentation will appear here.
                </div>
              ) : (
                <div>
                  <DocSection label="Title" value={doc.title} />
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Overview" value={doc.overview} />
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Workflow" value={doc.workflow} />
                  <div className="border-t border-slate-700/40" />
                  <section className="p-5">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Diagram (Mermaid)
                    </div>
                    <div className="mt-3">
                      <MermaidDiagram code={doc.diagram} onSvg={setDiagramSvg} />
                    </div>
                  </section>
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Technical Breakdown" value={doc.technical} />
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Use Cases" value={doc.use_cases} />
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Graphviz (Optional)</div>
              <Button
                className="bg-fuchsia-500/15 border-fuchsia-400/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-300/40 text-fuchsia-50"
                onClick={onRenderGraphviz}
              >
                Render DOT
              </Button>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <textarea
                value={dot}
                onChange={(e) => setDot(e.target.value)}
                className="h-[260px] w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/10"
              />
              <div className="rounded-2xl border border-fuchsia-400/20 bg-slate-900/40 p-4 overflow-auto min-h-[260px]">
                {graphvizErr ? (
                  <div className="text-sm text-rose-200 whitespace-pre-wrap">
                    {graphvizErr}
                  </div>
                ) : graphvizSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: graphvizSvg }} />
                ) : (
                  <div className="text-sm text-slate-400">
                    Rendered Graphviz SVG will appear here.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          API URL:{" "}
          <span className="text-slate-300">
            {import.meta.env.VITE_API_URL || "http://localhost:8000"}
          </span>
        </div>
      </div>
    </div>
  );
}

