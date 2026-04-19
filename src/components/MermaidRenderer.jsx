import { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
  themeVariables: {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    primaryColor: "#111827",
    primaryTextColor: "#e5e7eb",
    primaryBorderColor: "#334155",
    lineColor: "#94a3b8",
    tertiaryColor: "#0b1220"
  }
});

export default function MermaidRenderer({ code }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  const id = useMemo(() => `mmd-${crypto.randomUUID()}`, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError("");
      setSvg("");
      try {
        const { svg: rendered } = await mermaid.render(id, code || "");
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to render Mermaid diagram.");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div
      className="mermaid overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/40 p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

