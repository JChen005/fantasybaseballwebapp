'use client';

import { useMemo, useState } from 'react';

export default function RecentPicksView({ picks, teamNameByKey }) {
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedPicks = useMemo(() => {
    const safePicks = Array.isArray(picks) ? picks : [];
    return [...safePicks].sort((a, b) => {
      const left = Number(a.pickNumber || 0);
      const right = Number(b.pickNumber || 0);
      return sortDirection === 'asc' ? left - right : right - left;
    });
  }, [picks, sortDirection]);

  function toggleSortDirection() {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }

  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Draft History</h2>
          <p className="text-sm text-slate-600">
            Complete ordered draft history with full pick detail.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {sortedPicks.length
            ? `${sortedPicks.length} pick${sortedPicks.length === 1 ? '' : 's'} recorded`
            : 'No picks recorded yet'}
        </p>
      </div>

      {!sortedPicks.length ? (
        <p className="text-sm text-slate-600">No picks have been recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-2">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-950">
              <tr className="border-b border-slate-200 text-left">
                <th className="w-24 px-3 py-3 font-medium">
                  <button
                    type="button"
                    onClick={toggleSortDirection}
                    className="inline-flex items-center gap-1 font-medium text-white transition hover:text-cyan-200"
                    aria-label={`Sort by pick ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <span>Pick</span>
                    <span className="text-xs text-slate-400">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </button>
                </th>
                <th className="w-20 px-3 py-3 font-medium text-white">Round</th>
                <th className="min-w-44 px-3 py-3 font-medium text-white">Player</th>
                <th className="min-w-40 px-3 py-3 font-medium text-white">Team</th>
                <th className="w-24 px-3 py-3 font-medium text-white">Contract</th>
                <th className="w-24 px-3 py-3 font-medium text-white">Cost</th>
                <th className="w-32 px-3 py-3 font-medium text-white">Status</th>
                <th className="min-w-40 px-3 py-3 font-medium text-white">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {sortedPicks.map((pick) => (
                <tr
                  key={`${pick.pickNumber}-${pick.playerId}`}
                  className="border-b border-slate-700/50 last:border-0"
                >
                  <td className="px-3 py-3 font-semibold text-white">
                    {pick.pickNumber ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{pick.round ?? '—'}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-white">
                      {pick.playerName || pick.playerId}
                    </p>
                    <p className="text-xs text-slate-500">ID {pick.playerId}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {teamNameByKey.get(pick.teamKey) || pick.teamKey || '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{pick.contract || '—'}</td>
                  <td className="px-3 py-3 font-semibold text-emerald-100">
                    ${Number(pick.cost || 0)}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{pick.status || 'DRAFTED'}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {formatTimestamp(pick.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '—';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString();
}
