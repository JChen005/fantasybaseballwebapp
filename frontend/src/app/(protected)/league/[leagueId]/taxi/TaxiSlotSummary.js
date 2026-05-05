export default function TaxiSlotSummary({ filledCount, taxiSlotCount, variant = 'card' }) {
  if (variant === 'inline') {
    return (
      <div className="text-sm text-slate-300">
        <span className="font-medium text-white">BN Taxi Slots:</span> {filledCount} filled
        <span className="mx-2 text-slate-600">•</span>
        <span className="font-medium text-white">{Math.max(0, taxiSlotCount - filledCount)}</span>{' '}
        open
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 px-4 py-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">Filled BN Slots</p>
      <p className="mt-1 text-lg font-semibold text-emerald-100">
        {filledCount} / {taxiSlotCount}
      </p>
    </div>
  );
}
