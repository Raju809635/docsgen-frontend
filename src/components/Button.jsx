export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold " +
        "bg-sky-500/20 text-sky-100 border border-sky-400/30 " +
        "hover:bg-sky-500/25 hover:border-sky-300/40 " +
        "active:translate-y-px transition " +
        "disabled:opacity-50 disabled:cursor-not-allowed " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}

