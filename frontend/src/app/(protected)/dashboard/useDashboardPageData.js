import { useEffect, useMemo, useState } from 'react';
import { draftkitApi } from 'lib/draftkitApi';

export default function useDashboardPageData() {
  const [leagues, setLeagues] = useState([]);
  const [name, setName] = useState('My League');
  const [season, setSeason] = useState(2026);
  const [error, setError] = useState('');
  const [draftkitHealth, setDraftkitHealth] = useState('checking...');
  const [creatingLeague, setCreatingLeague] = useState(false);
  const [deletingLeagueId, setDeletingLeagueId] = useState('');

  const loadLeagues = async () => {
    const data = await draftkitApi.getLeagues();
    const nextLeagues = data.leagues || [];
    setLeagues(nextLeagues);
    return nextLeagues;
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
      await draftkitApi.createLeague({ name: nextName, season });
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

  return {
    createLeague,
    creatingLeague,
    deleteLeague,
    deletingLeagueId,
    draftkitHealth,
    error,
    leagueCountLabel,
    leagues,
    name,
    season,
    setName,
    setSeason,
  };
}
