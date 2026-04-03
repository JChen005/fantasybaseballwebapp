'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { draftkitApi } from 'lib/draftkitApi';

export default function DashboardPage() {
  const [leagues, setLeagues] = useState([]);
  const [name, setName] = useState('My League');
  const [error, setError] = useState('');
  const [draftkitHealth, setDraftkitHealth] = useState('checking...');
  const [creatingLeague, setCreatingLeague] = useState(false);
  const [deletingLeagueId, setDeletingLeagueId] = useState('');

  const loadLeagues = async () => {
    const data = await draftkitApi.getLeagues();
    setLeagues(data.leagues || []);
    return data.leagues || [];
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        await loadLeagues();
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load leagues');
        }
      }
    }

    loadDashboard();

    draftkitApi.health().then(
      () => {
        if (cancelled) return;
        setDraftkitHealth('ok');
      },
      () => {
        if (cancelled) return;
        setDraftkitHealth('error');
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const createLeague = async (event) => {
    event.preventDefault();
    setError('');
    const nextName = name.trim();
    if (!nextName) {
      setError('League name is required');
      return;
    }

    try {
      setCreatingLeague(true);
      await draftkitApi.createLeague({ name: nextName });
      await loadLeagues();
      setName('My League');
    } catch (err) {
      setError(err.message || 'Failed to create league');
    } finally {
      setCreatingLeague(false);
    }
  };

  const deleteLeague = async (league) => {
    if (!league?._id) return;
    const confirmed = window.confirm(`Delete "${league.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setDeletingLeagueId(league._id);
    try {
      await draftkitApi.deleteLeague(league._id);
      await loadLeagues();
    } catch (err) {
      setError(err.message || 'Failed to delete league');
    } finally {
      setDeletingLeagueId('');
    }
  };

  const leagueCountLabel = useMemo(() => {
    if (leagues.length === 0) return 'No leagues yet.';
    if (leagues.length === 1) return '1 league';
    return `${leagues.length} leagues`;
  }, [leagues.length]);

  return (
    <section className="space-y-4">
      <div className="panel">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-600">DraftKit API <strong>{draftkitHealth}</strong></p>
        <p className="text-xs text-slate-500">{leagueCountLabel}</p>
      </div>

      <div className="panel">
        <h2 className="mb-2 text-lg font-semibold">Create League</h2>
        <form className="flex flex-wrap gap-2" onSubmit={createLeague}>
          <label htmlFor="leagueName" className="sr-only">
            League name
          </label>
          <input
            id="leagueName"
            className="input max-w-xs"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
          <button className="btn" type="submit" disabled={creatingLeague}>
            {creatingLeague ? 'Creating...' : 'Create'}
          </button>
        </form>
        <p className="mt-2 min-h-5 text-sm text-red-600" role="status" aria-live="polite">
          {error}
        </p>
      </div>

      <div className="panel">
        <h2 className="mb-2 text-lg font-semibold">League List</h2>
        {leagues.length === 0 ? (
          <p className="text-sm text-slate-600">No leagues yet.</p>
        ) : (
          <ul className="space-y-2">
            {leagues.map((league) => (
              <li key={league._id} className="rounded border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{league.name}</p>
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
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
