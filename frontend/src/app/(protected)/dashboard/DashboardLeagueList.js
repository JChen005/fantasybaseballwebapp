import Link from "next/link";

function ActionLink({ children, href }) {
  return (
    <Link
      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
      href={href}
    >
      {children}
    </Link>
  );
}

function LeagueListItem({ deleteLeague, deletingLeagueId, league }) {
  return (
    <li className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-medium text-white">{league.name}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Draft year {league.config?.season || 2026}
          </p>
        </div>
        <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          League
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionLink href={`/league/${league._id}/config`}>Config</ActionLink>
        <ActionLink href={`/league/${league._id}/keeper`}>Keeper</ActionLink>
        <ActionLink href={`/league/${league._id}/draft`}>Draft</ActionLink>
        <ActionLink href={`/league/${league._id}/taxi`}>Taxi</ActionLink>
        <button
          className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
          type="button"
          onClick={() => deleteLeague(league)}
          disabled={deletingLeagueId === league._id}
        >
          {deletingLeagueId === league._id ? "Deleting..." : "Delete League"}
        </button>
      </div>
    </li>
  );
}

export default function DashboardLeagueList({
  deleteLeague,
  deletingLeagueId,
  leagues,
}) {
  return (
    <div className="panel">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Leagues
          </p>
          <h2 className="text-lg font-semibold text-white">Your leagues</h2>
        </div>

        {leagues.length === 0 ? (
          <p className="text-sm text-slate-600">No leagues yet.</p>
        ) : (
          <ul className="space-y-3">
            {leagues.map((league) => (
              <LeagueListItem
                key={league._id}
                deleteLeague={deleteLeague}
                deletingLeagueId={deletingLeagueId}
                league={league}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
