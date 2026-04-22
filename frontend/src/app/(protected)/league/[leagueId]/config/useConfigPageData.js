import { useEffect, useMemo, useState } from 'react';
import { leagueApi } from 'lib/leagueApi';
import { buildDefaultTeams, getTotalRosterSlots, normalizeLeagueToForm } from './configPageUtils';

export default function useConfigPageData({ leagueId }) {
  const [form, setForm] = useState(() => normalizeLeagueToForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLeague() {
      if (!leagueId) return;
      setLoading(true);
      setError('');

      try {
        const { league } = await leagueApi.getLeague(leagueId);
        if (cancelled) return;
        setForm(normalizeLeagueToForm(league));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load league settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLeague();

    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const totalRosterSlots = useMemo(
    () => getTotalRosterSlots(form.config.rosterSlots),
    [form.config.rosterSlots]
  );

  function updateForm(updater) {
    setForm(updater);
  }

  function updateConfig(updates) {
    setForm((current) => ({
      ...current,
      config: {
        ...current.config,
        ...updates,
      },
    }));
  }

  function updateRosterSlot(slot, value) {
    setForm((current) => ({
      ...current,
      config: {
        ...current.config,
        rosterSlots: {
          ...current.config.rosterSlots,
          [slot]: Number(value) || 0,
        },
      },
    }));
  }

  function onTeamCountChange(rawValue) {
    const nextCount = Math.max(1, Number(rawValue) || 1);

    setForm((current) => {
      const existing = current.config.teams.slice(0, nextCount);
      const nextTeams = [
        ...existing,
        ...buildDefaultTeams(nextCount, current.config.budget).slice(existing.length),
      ].map((team, index) => ({
        ...team,
        teamKey: team.teamKey || `team-${index + 1}`,
      }));

      return {
        ...current,
        config: {
          ...current.config,
          teamCount: nextCount,
          teams: nextTeams,
          userTeamKey: nextTeams.some((team) => team.teamKey === current.config.userTeamKey)
            ? current.config.userTeamKey
            : nextTeams[0]?.teamKey || 'team-1',
        },
      };
    });
  }

  function onBudgetChange(rawValue) {
    const nextBudget = Number(rawValue) || 0;

    setForm((current) => ({
      ...current,
      config: {
        ...current.config,
        budget: nextBudget,
        teams: current.config.teams.map((team) => ({
          ...team,
          budget: nextBudget,
        })),
      },
    }));
  }

  function updateTeam(index, updates) {
    setForm((current) => ({
      ...current,
      config: {
        ...current.config,
        teams: current.config.teams.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, ...updates } : entry
        ),
      },
    }));
  }

  function setUserTeamKey(userTeamKey) {
    updateConfig({ userTeamKey });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    setError('');

    try {
      await leagueApi.updateLeague(leagueId, {
        ...form,
        config: {
          ...form.config,
          teams: form.config.teams.map((team) => ({
            ...team,
            budget: form.config.budget,
          })),
        },
      });
      setStatus('League settings saved.');
    } catch (err) {
      setError(err.message || 'Failed to save league settings');
    } finally {
      setSaving(false);
    }
  }

  return {
    error,
    form,
    loading,
    saving,
    status,
    totalRosterSlots,
    onBudgetChange,
    onSubmit,
    onTeamCountChange,
    setUserTeamKey,
    updateConfig,
    updateForm,
    updateRosterSlot,
    updateTeam,
  };
}
