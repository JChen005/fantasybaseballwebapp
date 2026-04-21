export default function KeeperBudgetSummary({ selectedBudget, variant = 'card' }) {
  if (variant === 'inline') {
    return (
      <div className="text-sm text-slate-300">
        <span className="font-medium text-white">Spent:</span> ${selectedBudget?.spent ?? 0}
        <span className="mx-2 text-slate-600">•</span>
        <span className="font-medium text-white">Remaining:</span>{' '}
        <span className={selectedBudget?.remaining < 0 ? 'text-red-400' : 'text-emerald-100'}>
          ${selectedBudget?.remaining ?? 0}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 px-4 py-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">Budget Remaining</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          selectedBudget?.remaining < 0 ? 'text-red-400' : 'text-emerald-100'
        }`}
      >
        ${selectedBudget?.remaining ?? 0}
      </p>
    </div>
  );
}
