export default function DashboardHeader({ draftkitHealth, leagueCountLabel }) {
  return (
    <div className="panel">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-slate-600">
        DraftKit API <strong>{draftkitHealth}</strong>
      </p>
      <p className="text-xs text-slate-500">{leagueCountLabel}</p>
    </div>
  );
}
