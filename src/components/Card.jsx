export default function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-slate-700/40 bg-slate-950/30 shadow-glow " +
        "backdrop-blur-sm " +
        className
      }
    >
      {children}
    </div>
  );
}

