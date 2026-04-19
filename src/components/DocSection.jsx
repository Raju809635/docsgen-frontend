export default function DocSection({ label, value }) {
  return (
    <section className="p-5">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-100/95">
        {value || ""}
      </div>
    </section>
  );
}

