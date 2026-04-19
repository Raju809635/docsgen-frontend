import { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import DOMPurify from "dompurify";

let mermaidConfigured = false;

function normalizeMermaidCode(code) {
  return (code || "")
    .replace(/^%%\{init:.*?%%\s*/s, "")
    .trim();
}

function ensureMermaidConfig() {
  if (mermaidConfigured) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    flowchart: {
      curve: "basis",
    },
    themeVariables: {
      background: "#020617",
      mainBkg: "#0b1220",
      nodeBorder: "#38bdf8",
      mainContrastColor: "#e2e8f0",
      lineColor: "#94a3b8",
    },
  });
  mermaidConfigured = true;
}

export default function MermaidDiagram({ code, onSvg }) {
  const [svg, setSvg] = useState("");
  const id = useMemo(() => `mmd-${Math.random().toString(16).slice(2)}`, []);
  const lastCodeRef = useRef("");

  useEffect(() => {
    ensureMermaidConfig();

    const c = normalizeMermaidCode(code);
    if (!c) {
      setSvg("");
      onSvg?.("");
      return;
    }
    if (c === lastCodeRef.current) return;
    lastCodeRef.current = c;

    let cancelled = false;
    (async () => {
      try {
        const { svg: rawSvg } = await mermaid.render(id, c);
        const clean = DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true } });
        if (cancelled) return;
        setSvg(clean);
        onSvg?.(clean);
      } catch (e) {
        if (cancelled) return;
        setSvg(
          `<pre style="white-space:pre-wrap;color:#fca5a5">Mermaid render error: ${String(
            e?.message || e,
          )}</pre>`,
        );
        onSvg?.("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, id, onSvg]);

  return (
    <div className="rounded-2xl border border-sky-400/20 bg-slate-900/40 p-4 overflow-auto">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
