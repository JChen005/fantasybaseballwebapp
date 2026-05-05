export default function TaxiHeader({ action = null }) {
  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            League / Taxi
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Taxi Squad</h1>
        </div>
        {action}
      </div>
    </div>
  );
}
