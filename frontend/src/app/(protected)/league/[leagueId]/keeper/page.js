'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import KeeperPlayerRail from 'components/KeeperPlayerRail';
import { draftkitApi } from 'lib/draftkitApi';
import { leagueApi } from 'lib/leagueApi';
import { playerApi } from 'lib/playerApi';

const SLOT_ORDER = ['C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'P', 'BN'];
const CONTRACT_OPTIONS = ['F3', 'F2', 'F1', 'S3', 'S2', 'S1', 'X', 'LX'];

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
        setError(loadError.message || 'Failed to load keeper data');
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
                League / Keepers
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Keeper Board</h1>
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
            <div className="text-sm text-slate-600">Loading keeper data...</div>
          </div>
        ) : (
          <>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <KeeperBoardTable
              leagueId={leagueId}
              draftState={draftState}
              config={league.config}
              selectedPlayer={selectedPlayer}
              onSaved={setDraftState}
            />
          </>
        )}
      </section>
    </>
  );
}

//Sub components

function buildRowPlan(rosterSlots = {}) {
  const rows = [];
  for (const slot of SLOT_ORDER) {
    const count = Number(rosterSlots?.[slot] || 0);
    for (let index = 0; index < count; index += 1) {
      rows.push({ slot, slotIndex: index });
    }
  }
  return rows;
}

function isEntryEmpty(entry) {
  return !entry?.playerId && !entry?.contract && (entry?.cost === '' || entry?.cost == null);
}

function findEntry(rows, slot, slotIndex) {
  return (rows || []).find((row) => row.slot === slot && row.slotIndex === slotIndex);
}

function draftStateTeamsToBoard(teams = []) {
  const nextBoard = {};

  for (const team of teams) {
    const boardKey = team.teamKey;
    const slotCounts = {};

    nextBoard[boardKey] = (team.players || []).map((player) => {
      const slot = String(
        player.assignedSlot || (Array.isArray(player.assignedSlots) ? player.assignedSlots[0] : '') || 'BN'
      )
        .trim()
        .toUpperCase();
      const slotIndex = slotCounts[slot] || 0;
      slotCounts[slot] = slotIndex + 1;

      return {
        slot,
        slotIndex,
        playerId: player.playerId ?? null,
        playerName: player.playerName || '',
        cost: player.cost ?? '',
        status: player.status || 'KEEPER',
        contract: player.contract || '',
        countsAgainstBudget:
          typeof player.countsAgainstBudget === 'boolean' ? player.countsAgainstBudget : true,
      };
    });
  }

  return nextBoard;
}

function boardToDraftStateTeams(board, existingTeams = []) {
  return existingTeams.map((team) => {
    const rows = board[team.teamKey] || [];

    const players = rows
      .filter((row) => row?.playerId)
      .map((row) => {
        const assignedSlot = String(row.slot || '').trim().toUpperCase();
        return {
          playerId: Number(row.playerId),
          playerName: row.playerName || '',
          cost: row.cost === '' || row.cost == null ? 0 : Number(row.cost),
          status: row.status || 'KEEPER',
          countsAgainstBudget: assignedSlot !== 'BN',
          assignedSlot,
          assignedSlots: assignedSlot ? [assignedSlot] : [],
          contract: row.contract || undefined,
        };
      });

    const spentBudget = players.reduce((sum, player) => {
      return player.countsAgainstBudget ? sum + Number(player.cost || 0) : sum;
    }, 0);

    const filledSlots = players.reduce((accumulator, player) => {
      const slot = String(player.assignedSlot || 'BN').trim().toUpperCase();
      accumulator[slot] = Number(accumulator[slot] || 0) + 1;
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

function getDraftStatePlayerIds(teams = []) {
  const ids = new Set();
  for (const team of teams) {
    for (const player of team.players || []) {
      if (player?.playerId != null) ids.add(Number(player.playerId));
    }
  }
  return Array.from(ids);
}

function KeeperBoardTable({ leagueId, draftState, config, selectedPlayer, onSaved }) {
  const teams = draftState?.teams || [];
  const teamOptions = teams.map((team) => ({
    key: team.teamKey,
    label: team.teamName || team.teamKey,
  }));
  const rowPlan = useMemo(() => buildRowPlan(config?.rosterSlots || {}), [config]);
  const [board, setBoard] = useState(() => draftStateTeamsToBoard(teams));
  const [playerPool, setPlayerPool] = useState({});
  const [selectedTeamKey, setSelectedTeamKey] = useState(teamOptions[0]?.key || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBoard(draftStateTeamsToBoard(teams));
  }, [teams]);

  useEffect(() => {
    if (!selectedTeamKey || !teamOptions.some((team) => team.key === selectedTeamKey)) {
      setSelectedTeamKey(teamOptions[0]?.key || '');
    }
  }, [selectedTeamKey, teamOptions]);

  const draftStatePlayerIds = useMemo(() => getDraftStatePlayerIds(teams), [teams]);

  useEffect(() => {
    const missingIds = draftStatePlayerIds.filter((id) => !playerPool[id]);
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
        console.error('Failed to hydrate keeper player pool', loadError);
      });
  }, [draftStatePlayerIds, playerPool]);

  function updateEntry(teamKey, slot, slotIndex, updates) {
    setBoard((current) => {
      const teamRows = current[teamKey] || [];
      const existingIndex = teamRows.findIndex((row) => row.slot === slot && row.slotIndex === slotIndex);
      const existingEntry =
        existingIndex >= 0
          ? teamRows[existingIndex]
          : {
              slot,
              slotIndex,
              playerId: null,
              playerName: '',
              cost: '',
              status: 'KEEPER',
              contract: '',
              countsAgainstBudget: true,
            };

      const nextEntry = { ...existingEntry, ...updates };
      const nextTeamRows = [...teamRows];

      if (isEntryEmpty(nextEntry)) {
        return {
          ...current,
          [teamKey]: teamRows.filter((row) => !(row.slot === slot && row.slotIndex === slotIndex)),
        };
      }

      if (existingIndex >= 0) {
        nextTeamRows[existingIndex] = nextEntry;
      } else {
        nextTeamRows.push(nextEntry);
      }

      return {
        ...current,
        [teamKey]: nextTeamRows,
      };
    });
  }

  function handlePlayerClick(teamKey, slot, slotIndex) {
    if (!selectedPlayer?.mlbPlayerId) return;

    setPlayerPool((current) => ({
      ...current,
      [Number(selectedPlayer.mlbPlayerId)]: selectedPlayer,
    }));

    updateEntry(teamKey, slot, slotIndex, {
      playerId: Number(selectedPlayer.mlbPlayerId),
      playerName: selectedPlayer.name || selectedPlayer.canonicalName || '',
      status: 'KEEPER',
      cost: '',
      contract: '',
      countsAgainstBudget: slot !== 'BN',
    });
  }

  const budgets = useMemo(() => {
    const result = {};
    for (const team of teams) {
      const rows = board[team.teamKey] || [];
      const budget = Number(team.budget || 260);

      const spent = rows.reduce((sum, row) => {
        const cost = Number(row.cost);
        return row.countsAgainstBudget && row.cost !== '' && Number.isFinite(cost) ? sum + cost : sum;
      }, 0);

      result[team.teamKey] = {
        budget,
        spent,
        remaining: budget - spent,
      };
    }
    return result;
  }, [board, teams]);

  async function handleSaveBoard() {
    try {
      setSaving(true);
      setError('');
      const updatedTeams = boardToDraftStateTeams(board, teams);
      console.log(updatedTeams);
      const response = await leagueApi.updateDraftState(leagueId, {
        ...draftState,
        teams: updatedTeams,
      });

      if (response?.draftState) {
        setBoard(draftStateTeamsToBoard(response.draftState.teams || []));
        onSaved?.(response.draftState);
      }
    } catch (saveError) {
      setError(saveError.message || 'Failed to save keepers');
    } finally {
      setSaving(false);
    }
  }

  const selectedTeam = teams.find((team) => team.teamKey === selectedTeamKey) || teams[0] || null;
  const currentRows = board[selectedTeamKey] || [];
  const selectedBudget = budgets[selectedTeamKey];

  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Keeper Board
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {selectedTeam?.teamName || selectedTeam?.teamKey || 'Unknown Team'}
              </h2>
              <p className="text-sm text-slate-600">
                Assign keepers and update contract values.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Budget Remaining</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    selectedBudget?.remaining < 0 ? 'text-red-400' : 'text-emerald-100'
                  }`}
                >
                  ${selectedBudget?.remaining ?? 0}
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
                Manage keeper assignments by roster slot.
              </p>
            </div>
            <div className="text-sm text-slate-300">
              <span className="font-medium text-white">Spent:</span> ${selectedBudget?.spent ?? 0}
              <span className="mx-2 text-slate-600">•</span>
              <span className="font-medium text-white">Remaining:</span>{' '}
              <span className={selectedBudget?.remaining < 0 ? 'text-red-400' : 'text-emerald-100'}>
                ${selectedBudget?.remaining ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-950">
              <tr className="border-b border-slate-200 text-left">
                <th className="w-16 px-3 py-3 font-medium text-white">Pos</th>
                <th className="min-w-64 px-3 py-3 font-medium text-white">Player</th>
                <th className="w-28 px-3 py-3 font-medium text-white">Contract</th>
                <th className="w-24 px-3 py-3 font-medium text-white">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rowPlan.map(({ slot, slotIndex }, rowIndex) => {
                const entry = findEntry(currentRows, slot, slotIndex) || {
                  slot,
                  slotIndex,
                  playerId: null,
                  playerName: '',
                  cost: '',
                  status: 'KEEPER',
                  contract: '',
                  countsAgainstBudget: true,
                };
                const player = entry.playerId ? playerPool[Number(entry.playerId)] : null;

                return (
                  <tr
                    key={`${selectedTeamKey}-${slot}-${slotIndex}-${rowIndex}`}
                    className="border-b border-slate-200/70 transition hover:bg-white/5"
                  >
                    <td className="w-16 px-3 py-3 align-middle text-sm font-semibold text-slate-200">
                      {slot}
                    </td>
                    <td className="min-w-64 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handlePlayerClick(selectedTeamKey, slot, slotIndex)}
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
                          <span className="text-sm text-slate-500">Click to assign selected player</span>
                        )}
                        {entry.playerId ? (
                          <span
                            onClick={(event) => {
                              event.stopPropagation();
                              updateEntry(selectedTeamKey, slot, slotIndex, {
                                playerId: null,
                                playerName: '',
                                contract: '',
                                cost: '',
                                countsAgainstBudget: true,
                              });
                            }}
                            className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                          >
                            Clear
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="w-28 px-3 py-3">
                      <select
                        className="input w-full"
                        value={entry.contract ?? ''}
                        onChange={(event) =>
                          updateEntry(selectedTeamKey, slot, slotIndex, { contract: event.target.value })
                        }
                      >
                        <option value=""></option>
                        {CONTRACT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="w-24 px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        className="input w-full text-right"
                        value={entry.cost ?? ''}
                        onChange={(event) =>
                          updateEntry(selectedTeamKey, slot, slotIndex, {
                            cost: event.target.value === '' ? '' : Number(event.target.value),
                          })
                        }
                      />
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

