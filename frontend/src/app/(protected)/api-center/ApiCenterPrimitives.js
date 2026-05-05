import { LoaderCircle } from 'lucide-react';

export function MetricCard({ label, value, meta }) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-[linear-gradient(180deg,rgba(24,30,52,0.5),rgba(10,14,28,0.58))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p> : null}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">{eyebrow}</p>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function PrimaryActionButton({ busy, children, className = '', ...props }) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
