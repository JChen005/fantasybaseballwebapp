'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import SideBar from 'components/sidebar';
import { leagueApi } from 'lib/leagueApi';

const DEFAULT_ROSTER_SLOTS = {
  C: 2,
  '1B': 1,
  '2B': 1,
  '3B': 1,
  SS: 1,
  OF: 1,
  UTIL: 1,
  P: 5,
  BN: 1,
};

const ROSTER_SLOT_LABELS = {
  C: 'Catcher',
  '1B': 'First base',
  '2B': 'Second base',
  '3B': 'Third base',
  SS: 'Shortstop',
  OF: 'Outfield',
  UTIL: 'Utility',
  P: 'Pitcher',
  BN: 'Bench',
};

function buildDefaultTeams(count, budget) {
  return Array.from({ length: count }, (_, index) => ({
    teamKey: `team-${index + 1}`,
    ownerName: index === 0 ? 'You' : `Owner ${index + 1}`,
    teamName: index === 0 ? 'My Team' : `Team ${index + 1}`,
    budget,
  }));
}

function normalizeLeagueToForm(league) {
  const config = league?.config || {};
  const budget = Number(config.budget || 260);
  const teamCount = Number(
    config.teamCount || config.teams?.length || config.teamNames?.length || 5
  );

  const teams =
    Array.isArray(config.teams) && config.teams.length
      ? config.teams.map((team, index) => ({
          teamKey: team.teamKey || `team-${index + 1}`,
          ownerName: team.ownerName || '',
          teamName: team.teamName || '',
          budget: Number(team.budget ?? budget),
        }))
      : buildDefaultTeams(teamCount, budget);

  return {
    name: league?.name || 'My League',
    config: {
      leagueType: config.leagueType || 'MIXED',
      budget,
      scoring: config.scoring || 'CATEGORY',
      teamCount,
      rosterSlots: {
        ...DEFAULT_ROSTER_SLOTS,
        ...(config.rosterSlots || {}),
      },
      teams,
      userTeamKey: config.userTeamKey || teams[0]?.teamKey || 'team-1',
    },
  };
}

export default function Page() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId)
    ? params.leagueId[0]
    : params?.leagueId;

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
    () =>
      Object.values(form.config.rosterSlots).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      ),
    [form.config.rosterSlots]
  );

  const updateRosterSlot = (slot, value) => {
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
  };

  const onTeamCountChange = (rawValue) => {
    const nextCount = Math.max(1, Number(rawValue) || 1);

    setForm((current) => {
      const existing = current.config.teams.slice(0, nextCount);
      const nextTeams = [
        ...existing,
        ...buildDefaultTeams(nextCount, current.config.budget).slice(
          existing.length
        ),
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
          userTeamKey: nextTeams.some(
            (team) => team.teamKey === current.config.userTeamKey
          )
            ? current.config.userTeamKey
            : nextTeams[0]?.teamKey || 'team-1',
        },
      };
    });
  };

  const onBudgetChange = (rawValue) => {
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
  };

  const onSubmit = async (event) => {
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
  };

  return (
    <section className="space-y-5">
      <SideBar />

      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(115deg,rgba(15,23,42,0.94),rgba(12,18,35,0.78)_56%,rgba(6,78,59,0.2))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:px-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-300/70 via-white/10 to-transparent" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="h-2 w-8 rounded-full bg-emerald-300/80" />
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
                League setup
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              Configure your league
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-slate-400">
              Set the format before the draft room opens.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[1.25rem] border border-white/10 bg-slate-950/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
                Teams
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-white">
                {form.config.teamCount}
              </p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
                Budget
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-emerald-100">
                ${form.config.budget}
              </p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
                Slots
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-white">
                {totalRosterSlots}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,47,0.92),rgba(11,16,33,0.94))] shadow-[0_22px_60px_rgba(3,8,24,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="border-b border-white/10 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
              League identity
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Rules and format
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Your league format, budget, and quick-access team.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-5">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-white">League name</span>
              <input
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-white">League type</span>
              <select
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/50"
                value={form.config.leagueType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    config: {
                      ...current.config,
                      leagueType: event.target.value,
                    },
                  }))
                }
              >
                <option value="MIXED">Mixed</option>
                <option value="AL">AL Only</option>
                <option value="NL">NL Only</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-white">Scoring</span>
              <select
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/50"
                value={form.config.scoring}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    config: {
                      ...current.config,
                      scoring: event.target.value,
                    },
                  }))
                }
              >
                <option value="CATEGORY">Category</option>
                <option value="POINTS">Points</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-white">Team count</span>
              <input
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4"
                type="number"
                min="1"
                value={form.config.teamCount}
                onChange={(event) => onTeamCountChange(event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-white">Auction budget</span>
              <input
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4 font-mono"
                type="number"
                min="1"
                value={form.config.budget}
                onChange={(event) => onBudgetChange(event.target.value)}
              />
              <span className="text-xs text-slate-500">
                Same starting budget for every team.
              </span>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-white">My team</span>
              <select
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/50"
                value={form.config.userTeamKey}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    config: {
                      ...current.config,
                      userTeamKey: event.target.value,
                    },
                  }))
                }
              >
                {form.config.teams.map((team) => (
                  <option key={team.teamKey} value={team.teamKey}>
                    {team.teamName || team.teamKey}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,47,0.92),rgba(11,16,33,0.94))] shadow-[0_22px_60px_rgba(3,8,24,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex flex-col gap-2 border-b border-white/10 p-5 md:flex-row md:items-end md:justify-between md:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
                Roster composition
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                Position slots
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Tune the roster shape by position.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2 text-sm text-slate-300">
              <span className="font-mono text-emerald-100">
                {totalRosterSlots}
              </span>{' '}
              total slots
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-3 xl:grid-cols-5">
            {Object.entries(form.config.rosterSlots).map(([slot, value]) => (
              <label
                key={slot}
                className="group rounded-[1.4rem] border border-white/10 bg-slate-950/30 p-4 transition duration-300 hover:border-emerald-300/30 hover:bg-white/[0.045]"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-mono text-lg font-semibold text-white">
                      {slot}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {ROSTER_SLOT_LABELS[slot] || slot}
                    </span>
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-xs text-emerald-100">
                    {value}
                  </span>
                </span>

                <input
                  className="input mt-4 h-11 rounded-2xl border-white/10 bg-slate-950/50 px-4 font-mono"
                  type="number"
                  min="0"
                  value={value}
                  onChange={(event) =>
                    updateRosterSlot(slot, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,47,0.92),rgba(11,16,33,0.94))] shadow-[0_22px_60px_rgba(3,8,24,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="border-b border-white/10 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
              Team setup
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Owners and team names
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Name each roster and mark your draft room shortcut.
            </p>
          </div>

          <div className="space-y-3 p-4 md:p-5">
            {form.config.teams.map((team, index) => (
              <div
                key={team.teamKey}
                className={`grid min-w-0 gap-3 rounded-[1.5rem] border p-4 transition duration-300 md:grid-cols-[3rem_minmax(0,1fr)] xl:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_5.75rem] xl:items-end ${
                  form.config.userTeamKey === team.teamKey
                    ? 'border-emerald-300/40 bg-emerald-300/[0.08]'
                    : 'border-white/10 bg-white/[0.035]'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 font-mono text-sm font-semibold text-slate-300">
                  {index + 1}
                </div>

                <label className="flex min-w-0 flex-col gap-2 text-sm">
                  <span className="font-semibold text-white">Owner name</span>
                  <input
                    className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4"
                    value={team.ownerName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          teams: current.config.teams.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, ownerName: event.target.value }
                              : entry
                          ),
                        },
                      }))
                    }
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2 text-sm md:col-start-2 xl:col-start-auto">
                  <span className="font-semibold text-white">Team name</span>
                  <input
                    className="input h-12 rounded-2xl border-white/10 bg-slate-950/50 px-4"
                    value={team.teamName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          teams: current.config.teams.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, teamName: event.target.value }
                              : entry
                          ),
                        },
                      }))
                    }
                  />
                </label>

                <label className="flex h-12 w-fit items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-emerald-300/40 md:col-start-2 xl:col-start-auto xl:w-full">
                  <input
                    type="radio"
                    name="userTeamKey"
                    className="h-3.5 w-3.5"
                    checked={form.config.userTeamKey === team.teamKey}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        config: {
                          ...current.config,
                          userTeamKey: team.teamKey,
                        },
                      }))
                    }
                  />
                  Mine
                </label>
              </div>
            ))}
          </div>
        </section>

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-3 shadow-[0_18px_50px_rgba(3,8,24,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur md:flex-row md:items-center">
          <button
            className="btn rounded-2xl px-5 py-3 transition duration-300 active:scale-[0.98]"
            type="submit"
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : 'Save league settings'}
          </button>

          <p className="text-sm text-slate-400">
            {form.config.teamCount} teams · ${form.config.budget} each ·{' '}
            {totalRosterSlots} roster slots
          </p>

          {status ? (
            <span className="text-sm text-emerald-100">{status}</span>
          ) : null}

          {error ? (
            <span className="text-sm text-red-100">{error}</span>
          ) : null}
        </div>
      </form>
    </section>
  );
}