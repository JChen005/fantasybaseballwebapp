'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import KeeperPlayerRail from 'components/KeeperPlayerRail';
import { draftkitApi } from 'lib/draftkitApi';
import { leagueApi } from 'lib/leagueApi';
import { playerApi } from 'lib/playerApi';

const TAXI_SLOT_COUNT = 8;

export default function Page() {
  const params = useParams();
  const pathname = usePathname();
  const basePath = pathname?.substring(0, pathname.lastIndexOf('/')) || '';
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;

  const [draftState, setDraftState] = useState(null);
  const [league, setLeague] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leagueId) return;

    Promise.all([leagueApi.getDraftState(leagueId), draftkitApi.getLeague(leagueId)])
      .then(([draftStateResponse, leagueResponse]) => {
        setDraftState(draftStateResponse.draftState);
        setLeague(leagueResponse.league);
      })
      .catch((loadError) => {
        setError(loadError.message || 'Failed to load taxi data');
      });
  }, [leagueId]);

  return (
    <>
      <KeeperPlayerRail
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
        leagueType={league?.config?.leagueType || null}
      />

      <section className="space-y-4">
        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                League / Taxi
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Taxi Squad</h1>
            </div>

            <Link
              href={`${basePath}/draft`}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5"
            >
              Go to Draft
            </Link>
          </div>
        </div>

        {error && (!draftState || !league) ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !draftState || !league ? (
          <div className="panel">
            <div className="text-sm text-slate-600">Loading taxi data...</div>
          </div>
        ) : (
          <>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <TaxiBoardTable
              leagueId={leagueId}
              draftState={draftState}
              selectedPlayer={selectedPlayer}
              onSaved={setDraftState}
            />
          </>
        )}
      </section>
    </>
  );
}

//Helper functions

function buildTaxiRowPlan() {
  return Array.from({ length: TAXI_SLOT_COUNT }, (_, index) => ({
    slot: 'TAXI',
    slotIndex: index,
  }));
}

function createEmptyTaxiRows() {
  return Array.from({ length: TAXI_SLOT_COUNT }, (_, index) => ({
    slot: 'TAXI',
    slotIndex: index,
    playerId: null,
    playerName: '',
    status: 'TAXI',
    taxiSlot: index,
  }));
}

function findEntry(rows, slotIndex) {
  return (rows || []).find((row) => row.slotIndex === slotIndex);
}

function isEntryEmpty(entry) {
  return !entry?.playerId;
}

function getTaxiPlayerIds(teams = []) {
  const ids = new Set();

  for (const team of teams) {
    for (const player of team.players || []) {
      if (String(player.status || '').trim().toUpperCase() === 'TAXI' && player?.playerId != null) {
        ids.add(Number(player.playerId));
      }
    }
  }

  return Array.from(ids);
}

function draftStateTeamsToTaxiBoard(teams = []) {
  const nextBoard = {};

  for (const team of teams) {
    const rows = createEmptyTaxiRows();

    const taxiPlayers = (team.players || []).filter(
      (player) => String(player.status || '').trim().toUpperCase() === 'TAXI'
    );

    for (const player of taxiPlayers) {
      const taxiSlot = Number(player.taxiSlot);

      if (!Number.isInteger(taxiSlot) || taxiSlot < 0 || taxiSlot >= TAXI_SLOT_COUNT) {
        continue;
      }

      rows[taxiSlot] = {
        slot: 'TAXI',
        slotIndex: taxiSlot,
        playerId: player?.playerId ?? null,
        playerName: player?.playerName || '',
        status: 'TAXI',
        taxiSlot,
      };
    }

    nextBoard[team.teamKey] = rows;
  }

  return nextBoard;
}

function boardToDraftStateTeams(board, existingTeams = []) {
  return existingTeams.map((team) => {
    const rows = board[team.teamKey] || [];
    const nonTaxiPlayers = (team.players || []).filter(
      (player) => String(player.status || '').trim().toUpperCase() !== 'TAXI'
    );

    const taxiPlayers = rows
      .filter((row) => row?.playerId)
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((row) => ({
        playerId: Number(row.playerId),
        playerName: row.playerName || '',
        cost: 0,
        status: 'TAXI',
        countsAgainstBudget: false,
        assignedSlot: '',
        assignedSlots: [],
        contract: undefined,
        taxiSlot: row.slotIndex,
      }));

    const players = [...nonTaxiPlayers, ...taxiPlayers];

    const spentBudget = players.reduce((sum, player) => {
      return player.countsAgainstBudget ? sum + Number(player.cost || 0) : sum;
    }, 0);

    const filledSlots = players.reduce((accumulator, player) => {
      const assignedSlot = String(player.assignedSlot || '').trim().toUpperCase();
      if (assignedSlot) {
        accumulator[assignedSlot] = Number(accumulator[assignedSlot] || 0) + 1;
      }
      return accumulator;
    }, {});

    return {
      ...team,
      budget: Number(team.budget || 260),
      spentBudget,
      filledSlots,
      players,
    };
  });
}

function TaxiBoardTable({ leagueId, draftState, selectedPlayer, onSaved }) {
  const teams = draftState?.teams || [];
  const teamOptions = teams.map((team) => ({
    key: team.teamKey,
    label: team.teamName || team.teamKey,
  }));

  const rowPlan = useMemo(() => buildTaxiRowPlan(), []);
  const [board, setBoard] = useState(() => draftStateTeamsToTaxiBoard(teams));
  const [playerPool, setPlayerPool] = useState({});
  const [selectedTeamKey, setSelectedTeamKey] = useState(teamOptions[0]?.key || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBoard(draftStateTeamsToTaxiBoard(teams));
  }, [teams]);

  useEffect(() => {
    if (!selectedTeamKey || !teamOptions.some((team) => team.key === selectedTeamKey)) {
      setSelectedTeamKey(teamOptions[0]?.key || '');
    }
  }, [selectedTeamKey, teamOptions]);

  const taxiPlayerIds = useMemo(() => getTaxiPlayerIds(teams), [teams]);

  useEffect(() => {
    const missingIds = taxiPlayerIds.filter((id) => !playerPool[id]);
    if (!missingIds.length) return;

    Promise.all(missingIds.map((playerId) => playerApi.getPlayerById(playerId)))
      .then((results) => {
        setPlayerPool((current) => {
          const next = { ...current };

          for (const result of results) {
            const player = result?.player || result;
            const id = player?.mlbPlayerId ?? player?.playerId;
            if (id != null) next[Number(id)] = player;
          }

          return next;
        });
      })
      .catch((loadError) => {
        console.error('Failed to hydrate taxi player pool', loadError);
      });
  }, [taxiPlayerIds, playerPool]);

  function updateEntry(teamKey, slotIndex, updates) {
    setBoard((current) => {
      const teamRows = current[teamKey] || createEmptyTaxiRows();
      const existingIndex = teamRows.findIndex((row) => row.slotIndex === slotIndex);
      const existingEntry =
        existingIndex >= 0
          ? teamRows[existingIndex]
          : {
              slot: 'TAXI',
              slotIndex,
              playerId: null,
              playerName: '',
              status: 'TAXI',
              taxiSlot: slotIndex,
            };

      const nextEntry = { ...existingEntry, ...updates, taxiSlot: slotIndex };
      const nextTeamRows = [...teamRows];

      if (isEntryEmpty(nextEntry)) {
        nextTeamRows[slotIndex] = {
          slot: 'TAXI',
          slotIndex,
          playerId: null,
          playerName: '',
          status: 'TAXI',
          taxiSlot: slotIndex,
        };

        return {
          ...current,
          [teamKey]: nextTeamRows,
        };
      }

      nextTeamRows[slotIndex] = nextEntry;

      return {
        ...current,
        [teamKey]: nextTeamRows,
      };
    });
  }

  function handlePlayerClick(teamKey, slotIndex) {
    if (!selectedPlayer?.mlbPlayerId) return;

    setError('');

    setPlayerPool((current) => ({
      ...current,
      [Number(selectedPlayer.mlbPlayerId)]: selectedPlayer,
    }));

    updateEntry(teamKey, slotIndex, {
      playerId: Number(selectedPlayer.mlbPlayerId),
      playerName: selectedPlayer.name || selectedPlayer.canonicalName || '',
      status: 'TAXI',
    });
  }

  async function handleSaveBoard() {
    try {
      setSaving(true);
      setError('');

      const updatedTeams = boardToDraftStateTeams(board, teams);
      console.log('Saving taxi board with teams:', updatedTeams);
      const response = await leagueApi.updateDraftState(leagueId, {
        ...draftState,
        teams: updatedTeams,
      });

      if (response?.draftState) {
        setBoard(draftStateTeamsToTaxiBoard(response.draftState.teams || []));
        onSaved?.(response.draftState);
      }
    } catch (saveError) {
      setError(saveError.message || 'Failed to save taxi board');
    } finally {
      setSaving(false);
    }
  }

  const selectedTeam = teams.find((team) => team.teamKey === selectedTeamKey) || teams[0] || null;
  const currentRows = board[selectedTeamKey] || createEmptyTaxiRows();
  const filledCount = currentRows.filter((row) => row?.playerId).length;

  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Taxi Squad
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {selectedTeam?.teamName || selectedTeam?.teamKey || 'Unknown Team'}
              </h2>
              <p className="text-sm text-slate-600">
                Assign up to 8 taxi players for each team.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Filled Slots</p>
                <p className="mt-1 text-lg font-semibold text-emerald-100">
                  {filledCount} / {TAXI_SLOT_COUNT}
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={handleSaveBoard}
              >
                {saving ? 'Saving...' : 'Save Board'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {teamOptions.map((team) => {
              const isActive = selectedTeamKey === team.key;

              return (
                <button
                  key={team.key}
                  type="button"
                  onClick={() => setSelectedTeamKey(team.key)}
                  className={`rounded-[1rem] border px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-emerald-300/70 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
                      : 'border-slate-300/20 bg-slate-300/7 text-slate-100 hover:bg-slate-200/12'
                  }`}
                >
                  {team.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="panel overflow-hidden">
        <div className="mb-4 rounded-xl border border-slate-700/60 bg-slate-900/55 px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">
                {selectedTeam?.teamName || selectedTeam?.teamKey || 'Unknown Team'}
              </h3>
              <p className="text-sm text-slate-500">
                Click a row to assign the currently selected player from the rail.
              </p>
            </div>
            <div className="text-sm text-slate-300">
              <span className="font-medium text-white">Taxi Slots:</span> {filledCount} filled
              <span className="mx-2 text-slate-600">•</span>
              <span className="font-medium text-white">{TAXI_SLOT_COUNT - filledCount}</span> open
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-950">
              <tr className="border-b border-slate-200 text-left">
                <th className="w-20 px-3 py-3 font-medium text-white">Slot</th>
                <th className="min-w-64 px-3 py-3 font-medium text-white">Player</th>
              </tr>
            </thead>
            <tbody>
              {rowPlan.map(({ slotIndex }, rowIndex) => {
                const entry = findEntry(currentRows, slotIndex) || {
                  slot: 'TAXI',
                  slotIndex,
                  playerId: null,
                  playerName: '',
                  status: 'TAXI',
                  taxiSlot: slotIndex,
                };
                const player = entry.playerId ? playerPool[Number(entry.playerId)] : null;

                return (
                  <tr
                    key={`${selectedTeamKey}-taxi-${slotIndex}-${rowIndex}`}
                    className="border-b border-slate-200/70 transition hover:bg-white/5"
                  >
                    <td className="w-20 px-3 py-3 align-middle text-sm font-semibold text-slate-200">
                      T{slotIndex + 1}
                    </td>
                    <td className="min-w-64 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handlePlayerClick(selectedTeamKey, slotIndex)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-white/5"
                      >
                        {entry.playerId ? (
                          <div className="flex min-w-0 items-center gap-2">
                            {player?.headshotUrl ? (
                              <img
                                src={player.headshotUrl}
                                alt={entry.playerName}
                                className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-white">
                                {entry.playerName}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">
                            Click to assign selected player
                          </span>
                        )}

                        {entry.playerId ? (
                          <span
                            onClick={(event) => {
                              event.stopPropagation();
                              updateEntry(selectedTeamKey, slotIndex, {
                                playerId: null,
                                playerName: '',
                                status: 'TAXI',
                              });
                            }}
                            className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                          >
                            Clear
                          </span>
                        ) : null}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

