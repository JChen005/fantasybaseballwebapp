export default function ConfigSection({ eyebrow, title, description, children, headerAction = null }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,47,0.92),rgba(11,16,33,0.94))] shadow-[0_22px_60px_rgba(3,8,24,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex flex-col gap-2 border-b border-white/10 p-5 md:flex-row md:items-end md:justify-between md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        {headerAction}
      </div>

      {children}
    </section>
  );
}
