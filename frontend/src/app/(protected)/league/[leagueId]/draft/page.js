'use client';

import { useEffect, useState } from 'react';
import { playerApi } from 'lib/playerApi';

function toRow(player) {
  return {
    id: player._id,
    name: player.name,
    team: player.team,
    position: player.positions.join(','),
    avg2025: player.statsLastYear.avg.toFixed(3),
    avg3yr: player.stats3Year.avg.toFixed(3),
    avgProj: player.statsProjection.avg.toFixed(3),
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
                <th className="px-2 py-2 font-medium">AVG (2025)</th>
                <th className="px-2 py-2 font-medium">AVG (3YR)</th>
                <th className="px-2 py-2 font-medium">AVG (Proj)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-200/70">
                  <td className="px-2 py-2 font-medium">{row.name}</td>
                  <td className="px-2 py-2">{row.team}</td>
                  <td className="px-2 py-2">{row.position}</td>
                  <td className="px-2 py-2">{row.avg2025}</td>
                  <td className="px-2 py-2">{row.avg3yr}</td>
                  <td className="px-2 py-2">{row.avgProj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
