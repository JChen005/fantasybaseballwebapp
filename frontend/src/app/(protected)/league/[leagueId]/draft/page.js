'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { playerApi } from 'lib/playerApi';
import { leagueApi } from 'lib/leagueApi';
import SideBar from 'components/sidebar';

const DRAFT_VIEW_TABS = [
  { id: 'draft', label: 'Draft Board' },
  { id: 'recent', label: 'Recent Picks' },
  { id: 'roster', label: 'Team Roster' },
  { id: 'budget', label: 'Budget' },
  { id: 'lookup', label: 'Player Lookup' },
  { id: 'depth', label: 'Player Depth' },
];

const MLB_DEPTH_CHART_TEAMS = [
  { id: 108, code: 'LAA', label: 'Angels' },
  { id: 109, code: 'AZ', label: 'Diamondbacks' },
  { id: 110, code: 'BAL', label: 'Orioles' },
  { id: 111, code: 'BOS', label: 'Red Sox' },
  { id: 112, code: 'CHC', label: 'Cubs' },
  { id: 113, code: 'CIN', label: 'Reds' },
  { id: 114, code: 'CLE', label: 'Guardians' },
  { id: 115, code: 'COL', label: 'Rockies' },
  { id: 116, code: 'DET', label: 'Tigers' },
  { id: 117, code: 'HOU', label: 'Astros' },
  { id: 118, code: 'KC', label: 'Royals' },
  { id: 119, code: 'LAD', label: 'Dodgers' },
  { id: 120, code: 'WSH', label: 'Nationals' },
  { id: 121, code: 'NYM', label: 'Mets' },
  { id: 133, code: 'OAK', label: 'Athletics' },
  { id: 134, code: 'PIT', label: 'Pirates' },
  { id: 135, code: 'SD', label: 'Padres' },
  { id: 136, code: 'SEA', label: 'Mariners' },
  { id: 137, code: 'SF', label: 'Giants' },
  { id: 138, code: 'STL', label: 'Cardinals' },
  { id: 139, code: 'TB', label: 'Rays' },
  { id: 140, code: 'TEX', label: 'Rangers' },
  { id: 141, code: 'TOR', label: 'Blue Jays' },
  { id: 142, code: 'MIN', label: 'Twins' },
  { id: 143, code: 'PHI', label: 'Phillies' },
  { id: 144, code: 'ATL', label: 'Braves' },
  { id: 145, code: 'CWS', label: 'White Sox' },
  { id: 146, code: 'MIA', label: 'Marlins' },
  { id: 147, code: 'NYY', label: 'Yankees' },
  { id: 158, code: 'MIL', label: 'Brewers' },
];

function resolveDraftView(rawView) {
  return DRAFT_VIEW_TABS.some((tab) => tab.id === rawView) ? rawView : 'draft';
}

function getDraftViewHref(leagueId, viewId) {
  if (viewId === 'draft') {
    return `/league/${leagueId}/draft`;
  }

  return `/league/${leagueId}/draft?view=${viewId}`;
}

function toValuationRow(player) {
  return {
    id: String(player.mlbPlayerId || player._id),
    name: player.name,
    team: player.team,
    position: player.positions.join(', '),
    baseValue: Math.round(player.baseValue || 0),
    marketValue: player.marketValue || 0,
    adjustedValue: player.adjustedValue || 0,
    fillsNeed: Boolean(player.fillsNeed),
    mlbPlayerId: player.mlbPlayerId,
    headshotUrl: player.headshotUrl,
  };
}

function sortDepthSlots(slots) {
  return [...slots].sort((left, right) => {
    const leftPitcher = left.normalizedSlot === 'P' ? 1 : 0;
    const rightPitcher = right.normalizedSlot === 'P' ? 1 : 0;
    if (leftPitcher !== rightPitcher) return leftPitcher - rightPitcher;
    return left.slot.localeCompare(right.slot);
  });
}

function buildExcludedPlayersFromTeams(teams, userTeamKey) {
  const safeTeams = Array.isArray(teams) ? teams : [];
  const myTeamState = safeTeams.find((team) => team.teamKey === userTeamKey) || safeTeams[0];
  const otherTeamStates = safeTeams.filter((team) => team.teamKey !== myTeamState?.teamKey);

  return {
    myTeamState,
    excludedPlayers: [
      ...((myTeamState?.players || []).map((player) => ({
        playerId: player.playerId,
        status: player.status,
        cost: player.cost,
        countsAgainstBudget: player.countsAgainstBudget !== false,
      }))),
      ...otherTeamStates.flatMap((team) =>
        (team.players || []).map((player) => ({
          playerId: player.playerId,
          status: player.status,
          cost: player.cost,
          countsAgainstBudget: false,
        }))
      ),
    ],
  };
}

function PlayerCell({ row }) {
  return (
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
  );
}

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const activeView = resolveDraftView(searchParams?.get('view'));

  const [rows, setRows] = useState([]);
  const [league, setLeague] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(113);
  const [depthChart, setDepthChart] = useState(null);
  const [draftError, setDraftError] = useState('');
  const [depthError, setDepthError] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isLoadingDepth, setIsLoadingDepth] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDraftBoard() {
      if (!leagueId) return;

      try {
        setDraftError('');
        const [{ league: leagueData }, { draftState: draftStateData }] = await Promise.all([
          leagueApi.getLeague(leagueId),
          leagueApi.getDraftState(leagueId),
        ]);
        if (cancelled) return;

        setLeague(leagueData);
        setDraftState(draftStateData);

        const myTeamKey = draftStateData.userTeamKey || draftStateData.teams?.[0]?.teamKey || '';
        const { myTeamState, excludedPlayers } = buildExcludedPlayersFromTeams(draftStateData.teams, myTeamKey);

        const valuationData = await playerApi.getPlayerValuations({
          league: {
            leagueType: leagueData.config?.leagueType,
            budget: leagueData.config?.budget,
            teamCount: leagueData.config?.teamNames?.length || 1,
            rosterSlots: leagueData.config?.rosterSlots,
          },
          filters: {
            limit: 40,
            includeInactive: false,
          },
          draftState: {
            excludedPlayers,
            filledSlots: myTeamState?.filledSlots || {},
          },
        });
        if (cancelled) return;

        setValuation(valuationData.valuation);
        setRows((valuationData.players || []).map(toValuationRow));
      } catch (err) {
        if (cancelled) return;
        setDraftError(err.message || 'Failed to load draft board');
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    loadDraftBoard();

    function handleVisibilityRefresh() {
      if (document.visibilityState === 'visible') {
        loadDraftBoard();
      }
    }

    function handleFocusRefresh() {
      loadDraftBoard();
    }

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [leagueId]);

  useEffect(() => {
    if (activeView !== 'depth') return undefined;

    let cancelled = false;

    async function loadDepthChart() {
      setIsLoadingDepth(true);
      setDepthError('');

      try {
        const data = await playerApi.getTeamDepthChart({ teamId: selectedTeamId });
        if (cancelled) return;
        setDepthChart(data);
      } catch (err) {
        if (cancelled) return;
        setDepthError(err.message || 'Failed to load depth chart');
      } finally {
        if (!cancelled) {
          setIsLoadingDepth(false);
        }
      }
    }

    loadDepthChart();

    return () => {
      cancelled = true;
    };
  }, [activeView, selectedTeamId]);

  const teams = Array.isArray(draftState?.teams) ? draftState.teams : [];
  const picks = Array.isArray(draftState?.picks) ? draftState.picks : [];

  const rosterRows = useMemo(
    () =>
      teams.map((team) => ({
        teamKey: team.teamKey,
        teamName: team.teamName,
        spentBudget: Number(team.spentBudget || 0),
        budget: Number(team.budget || league?.config?.budget || 0),
        playerCount: Array.isArray(team.players) ? team.players.length : 0,
        players: Array.isArray(team.players) ? team.players : [],
      })),
    [league?.config?.budget, teams]
  );

  const recentPicks = useMemo(() => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 12), [picks]);

  const lookupRows = useMemo(() => {
    const search = lookupQuery.trim().toLowerCase();
    if (!search) return rows;

    return rows.filter((row) =>
      [row.name, row.team, row.position, String(row.mlbPlayerId || '')].join(' ').toLowerCase().includes(search)
    );
  }, [lookupQuery, rows]);

  return (
    <section className="space-y-4">
      <SideBar />

      <div className="panel">
        <h1 className="text-2xl font-semibold">League / Draft</h1>
        <p className="mt-1 text-sm text-slate-600">League valuations are now built from persisted DraftState.</p>
      </div>

      <div className="panel">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Draft Views</p>
        <nav className="mt-3 flex flex-wrap gap-2.5" aria-label="Draft view tabs">
          {DRAFT_VIEW_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={getDraftViewHref(leagueId, tab.id)}
              className={`rounded-[1rem] border px-3.5 py-2.5 text-sm font-semibold transition ${
                activeView === tab.id
                  ? 'border-emerald-300/70 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
                  : 'border-slate-300/20 bg-slate-300/7 text-slate-100 hover:bg-slate-200/12'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {activeView === 'draft' ? (
        <div className="panel overflow-x-auto">
          <div className="mb-3 flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Draft Valuations</h2>
            {league ? (
              <p className="text-sm text-slate-600">
                {league.name} · {league.config?.leagueType} · ${league.config?.budget} budget
              </p>
            ) : null}
            {valuation ? (
              <p className="text-sm text-slate-600">
                Remaining budget ${valuation.remainingBudget} · Max bid ${valuation.maxBid} · Remaining roster spots {valuation.remainingRosterSpots}
              </p>
            ) : null}
          </div>
          {isLoadingDraft ? (
            <p className="text-sm text-slate-600">Loading draft valuations...</p>
          ) : draftError ? (
            <p className="text-sm text-red-600">{draftError}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-2 py-2 font-medium">Player</th>
                  <th className="px-2 py-2 font-medium">Team</th>
                  <th className="px-2 py-2 font-medium">Pos</th>
                  <th className="px-2 py-2 font-medium">Base</th>
                  <th className="px-2 py-2 font-medium">Market</th>
                  <th className="px-2 py-2 font-medium">Adjusted</th>
                  <th className="px-2 py-2 font-medium">Need</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200/70">
                    <td className="px-2 py-2 font-medium">
                      <PlayerCell row={row} />
                    </td>
                    <td className="px-2 py-2">{row.team}</td>
                    <td className="px-2 py-2">{row.position}</td>
                    <td className="px-2 py-2">{row.baseValue}</td>
                    <td className="px-2 py-2">${row.marketValue}</td>
                    <td className="px-2 py-2 font-semibold text-white">${row.adjustedValue}</td>
                    <td className="px-2 py-2">{row.fillsNeed ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {activeView === 'recent' ? (
        <div className="panel">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent Picks</h2>
            <p className="text-sm text-slate-600">Most recent picks from persisted draft history.</p>
          </div>
          {!recentPicks.length ? (
            <p className="text-sm text-slate-600">No picks have been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPicks.map((pick) => (
                <div
                  key={`${pick.pickNumber}-${pick.playerId}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/55 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Pick {pick.pickNumber} · {pick.playerName || pick.playerId}</p>
                    <p className="text-xs text-slate-500">{pick.teamKey} · {pick.status || 'DRAFTED'}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-100">${pick.cost || 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'roster' ? (
        <div className="panel">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Team Roster</h2>
            <p className="text-sm text-slate-600">Current roster state for each team in the league.</p>
          </div>
          {!rosterRows.length ? (
            <p className="text-sm text-slate-600">No team state available yet.</p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rosterRows.map((team) => (
                <section key={team.teamKey} className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{team.teamName}</h3>
                      <p className="text-xs text-slate-500">{team.playerCount} players · ${team.spentBudget} spent</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-100">${Math.max(0, team.budget - team.spentBudget)} left</p>
                  </div>
                  {!team.players.length ? (
                    <p className="text-sm text-slate-600">No players on this roster yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {team.players.map((player) => (
                        <div key={`${team.teamKey}-${player.playerId}`} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium text-white">{player.playerName || player.playerId}</p>
                            <p className="text-xs text-slate-500">{player.status} {player.assignedSlots?.length ? `· ${player.assignedSlots.join(', ')}` : ''}</p>
                          </div>
                          <p className="font-semibold text-slate-200">${player.cost || 0}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'budget' ? (
        <div className="panel">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Budget Overview</h2>
            <p className="text-sm text-slate-600">League budget totals and current spend by team.</p>
          </div>
          {!rosterRows.length ? (
            <p className="text-sm text-slate-600">No budget data available yet.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">League Budget</p>
                <p className="mt-2 text-3xl font-semibold text-white">${league?.config?.budget || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4 lg:col-span-2">
                <div className="space-y-3">
                  {rosterRows
                    .slice()
                    .sort((a, b) => (b.budget - b.spentBudget) - (a.budget - a.spentBudget))
                    .map((team) => (
                      <div key={team.teamKey}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-white">{team.teamName}</span>
                          <span className="text-slate-300">${team.spentBudget} spent · ${Math.max(0, team.budget - team.spentBudget)} left</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-400"
                            style={{
                              width: `${team.budget > 0 ? Math.min(100, (team.spentBudget / team.budget) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'lookup' ? (
        <div className="panel overflow-x-auto">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Player Lookup</h2>
              <p className="text-sm text-slate-600">Search the current valuation pool without the draft-board framing.</p>
            </div>
            <label className="flex w-full max-w-sm flex-col gap-1 text-sm">
              <span className="font-medium text-white">Search players</span>
              <input
                className="input"
                value={lookupQuery}
                onChange={(event) => setLookupQuery(event.target.value)}
                placeholder="Player name, team, position, MLB ID"
              />
            </label>
          </div>
          {isLoadingDraft ? (
            <p className="text-sm text-slate-600">Loading player lookup...</p>
          ) : draftError ? (
            <p className="text-sm text-red-600">{draftError}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-2 py-2 font-medium">Player</th>
                  <th className="px-2 py-2 font-medium">Team</th>
                  <th className="px-2 py-2 font-medium">Pos</th>
                  <th className="px-2 py-2 font-medium">Adjusted</th>
                </tr>
              </thead>
              <tbody>
                {lookupRows.map((row) => (
                  <tr key={`lookup-${row.id}`} className="border-b border-slate-200/70">
                    <td className="px-2 py-2 font-medium">
                      <PlayerCell row={row} />
                    </td>
                    <td className="px-2 py-2">{row.team}</td>
                    <td className="px-2 py-2">{row.position}</td>
                    <td className="px-2 py-2 font-semibold text-white">${row.adjustedValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {activeView === 'depth' ? (
        <div className="panel space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Player Depth</h2>
              <p className="text-sm text-slate-600">MLB depth-chart data moved into its own draft view.</p>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-white">Team</span>
              <select
                className="rounded-md border border-emerald-300/70 bg-slate-950/80 px-3 py-2 text-sm text-white shadow-[0_0_0_1px_rgba(45,212,191,0.22)]"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(Number(event.target.value))}
              >
                {MLB_DEPTH_CHART_TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label} ({team.code})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoadingDepth ? (
            <p className="text-sm text-slate-600">Loading depth chart...</p>
          ) : depthError ? (
            <p className="text-sm text-red-600">{depthError}</p>
          ) : depthChart ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700/70 bg-slate-900/75 px-4 py-3 text-sm text-slate-100">
                {depthChart.team.name} ({depthChart.team.code}) · {depthChart.team.league} · Season {depthChart.season}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortDepthSlots(depthChart.slots).map((slot) => (
                  <section
                    key={slot.slot}
                    className="rounded-xl border border-slate-700/60 bg-[linear-gradient(170deg,rgba(17,20,42,0.82),rgba(20,24,50,0.94))] p-4 shadow-[0_18px_44px_rgba(5,7,18,0.34)]"
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-slate-700/60 pb-2">
                      <div>
                        <h3 className="text-base font-semibold text-white">{slot.slot}</h3>
                        <p className="text-xs uppercase tracking-wide text-slate-600">{slot.label}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{slot.normalizedSlot}</span>
                    </div>

                    <div className="space-y-3">
                      {slot.players.map((player) => (
                        <div key={`${slot.slot}-${player.mlbPlayerId}`} className="flex items-center gap-3">
                          <img
                            src={player.headshotUrl}
                            alt={player.name}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">
                              {player.depthRank}. {player.name}
                            </div>
                            <div className="text-xs text-slate-600">
                              {player.teamPosition} · {player.status || 'Active'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Choose a team to view its current depth chart.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
