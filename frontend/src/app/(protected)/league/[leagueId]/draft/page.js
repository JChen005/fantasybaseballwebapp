'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { playerApi } from 'lib/playerApi';
import { leagueApi } from 'lib/leagueApi';
import SideBar from 'components/SideBar';

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

export default function Page() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const [rows, setRows] = useState([]);
  const [league, setLeague] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(113);
  const [depthChart, setDepthChart] = useState(null);
  const [draftError, setDraftError] = useState('');
  const [depthError, setDepthError] = useState('');
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isLoadingDepth, setIsLoadingDepth] = useState(true);

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
        const myTeamKey = draftStateData.userTeamKey || draftStateData.teams?.[0]?.teamKey || '';
        const {
          myTeamState,
          excludedPlayers,
        } = buildExcludedPlayersFromTeams(draftStateData.teams, myTeamKey);

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
  }, [selectedTeamId]);

  return (
    <section className="space-y-4">
      <SideBar/>
      <div className="panel">
        <h1 className="text-2xl font-semibold">League / Draft</h1>
        <p className="mt-1 text-sm text-slate-600">League valuations are now built from persisted DraftState.</p>
      </div>

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

      <div className="panel space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Current Team Depth Chart</h2>
            <p className="text-sm text-slate-600">MLB depth data joined into DraftKit from the Player API.</p>
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
        ) : (
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
        )}
      </div>
    </section>
  );
}
