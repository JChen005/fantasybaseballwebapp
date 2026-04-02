'use client';

import { useEffect, useState } from 'react';
import { playerApi } from 'lib/playerApi';
import SideBar from 'components/sidebar'

function toRow(player) {
  return {
    id: String(player.mlbPlayerId || player._id),
    name: player.name,
    team: player.team,
    position: player.positions.join(', '),
    avgLastYear: player.statsLastYear.avg.toFixed(3),
    avg3yr: player.stats3Year.avg.toFixed(3),
    mlbPlayerId: player.mlbPlayerId,
    headshotUrl: player.headshotUrl,
  };
}

export default function Page() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        const data = await playerApi.listPlayers({ limit: 24, leagueType: 'NL' });
        if (cancelled) return;
        setRows(data.players.map(toRow));
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load players');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <SideBar/>
      <div className="panel">
        <h1 className="text-2xl font-semibold">League / Draft</h1>
        <p className="mt-1 text-sm text-slate-600">Players loaded directly from Player API.</p>
      </div>

      <div className="panel overflow-x-auto">
        <h2 className="mb-2 text-lg font-semibold">NL Player AVG Sample</h2>
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading players...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-2 py-2 font-medium">Player</th>
                <th className="px-2 py-2 font-medium">Team</th>
                <th className="px-2 py-2 font-medium">Pos</th>
                <th className="px-2 py-2 font-medium">AVG (Last Year)</th>
                <th className="px-2 py-2 font-medium">AVG (3YR)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-200/70">
                  <td className="px-2 py-2 font-medium">
                    <div className="flex items-center gap-3">
                      {row.headshotUrl ? (
                        <img
                          src={row.headshotUrl}
                          alt={row.name}
                          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        />
                      ) : null}
                      <div>
                        <div>{row.name}</div>
                        {row.mlbPlayerId ? (
                          <div className="text-xs font-normal text-slate-500">MLB ID: {row.mlbPlayerId}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">{row.team}</td>
                  <td className="px-2 py-2">{row.position}</td>
                  <td className="px-2 py-2">{row.avgLastYear}</td>
                  <td className="px-2 py-2">{row.avg3yr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
