import Link from 'next/link';

function LeagueListItem({ deleteLeague, deletingLeagueId, league }) {
  return (
    <li className="rounded border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{league.name}</p>
          <p className="text-xs text-slate-500">Draft year {league.config?.season || 2026}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Link className="btn btn-secondary" href={`/league/${league._id}/config`}>
          Config
        </Link>
        <Link className="btn btn-secondary" href={`/league/${league._id}/keeper`}>
          Keeper
        </Link>
        <Link className="btn btn-secondary" href={`/league/${league._id}/draft`}>
          Draft
        </Link>
        <Link className="btn btn-secondary" href={`/league/${league._id}/taxi`}>
          Taxi
        </Link>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => deleteLeague(league)}
          disabled={deletingLeagueId === league._id}
        >
          {deletingLeagueId === league._id ? 'Deleting...' : 'Delete League'}
        </button>
      </div>
    </li>
  );
}

export default function DashboardLeagueList({ deleteLeague, deletingLeagueId, leagues }) {
  return (
    <div className="panel">
      <h2 className="mb-2 text-lg font-semibold">League List</h2>
      {leagues.length === 0 ? (
        <p className="text-sm text-slate-600">No leagues yet.</p>
      ) : (
        <ul className="space-y-2">
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
  );
}
