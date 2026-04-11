'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import KeeperPlayerRail from 'components/KeeperPlayerRail';
import { draftkitApi } from 'lib/draftkitApi';
import { leagueApi } from 'lib/leagueApi';
import { playerApi } from 'lib/playerApi';

const SLOT_ORDER = ['C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'P', 'BN'];
const CONTRACT_OPTIONS = ['F3', 'F2', 'F1', 'S3', 'S2', 'S1', 'X', 'LX'];
const SLOT_DISPLAY_LABELS = {
  '1B': 'B1',
  '2B': 'B2',
  '3B': 'B3',
};

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
    const teamName = team.teamName || team.teamKey;
    const slotCounts = {};

    nextBoard[teamName] = (team.players || []).map((player) => {
      const slot = String(player.assignedSlot || (Array.isArray(player.assignedSlots) ? player.assignedSlots[0] : '') || 'BN').trim().toUpperCase();
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
        countsAgainstBudget: typeof player.countsAgainstBudget === 'boolean' ? player.countsAgainstBudget : true,
      };
    });
  }

  return nextBoard;
}

function boardToDraftStateTeams(board, existingTeams = []) {
  return existingTeams.map((team) => {
    const teamName = team.teamName || team.teamKey;
    const rows = board[teamName] || [];

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
  const teamNames = teams.map((team) => team.teamName || team.teamKey);
  const rowPlan = useMemo(() => buildRowPlan(config?.rosterSlots || {}), [config]);
  const [board, setBoard] = useState(() => draftStateTeamsToBoard(teams));
  const [playerPool, setPlayerPool] = useState({});
  const [selectedTeam, setSelectedTeam] = useState(teamNames[0] || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBoard(draftStateTeamsToBoard(teams));
  }, [teams]);

  useEffect(() => {
    if (!selectedTeam || !teamNames.includes(selectedTeam)) {
      setSelectedTeam(teamNames[0] || '');
    }
  }, [selectedTeam, teamNames]);

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

  function updateEntry(teamName, slot, slotIndex, updates) {
    setBoard((current) => {
      const teamRows = current[teamName] || [];
      const existingIndex = teamRows.findIndex((row) => row.slot === slot && row.slotIndex === slotIndex);
      const existingEntry = existingIndex >= 0
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
          [teamName]: teamRows.filter((row) => !(row.slot === slot && row.slotIndex === slotIndex)),
        };
      }

      if (existingIndex >= 0) {
        nextTeamRows[existingIndex] = nextEntry;
      } else {
        nextTeamRows.push(nextEntry);
      }

      return {
        ...current,
        [teamName]: nextTeamRows,
      };
    });
  }

  function handlePlayerClick(teamName, slot, slotIndex) {
    if (!selectedPlayer?.mlbPlayerId) return;

    setPlayerPool((current) => ({
      ...current,
      [Number(selectedPlayer.mlbPlayerId)]: selectedPlayer,
    }));

    updateEntry(teamName, slot, slotIndex, {
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
      const teamName = team.teamName || team.teamKey;
      const rows = board[teamName] || [];
      const budget = Number(team.budget || 260);

      const spent = rows.reduce((sum, row) => {
        const cost = Number(row.cost);
        return row.countsAgainstBudget && row.cost !== '' && Number.isFinite(cost) ? sum + cost : sum;
      }, 0);

      result[teamName] = {
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

  const currentRows = board[selectedTeam] || [];
  const selectedBudget = budgets[selectedTeam];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white">Team</label>
        <select
          className="select select-bordered select-sm !bg-white !text-black"
          value={selectedTeam}
          onChange={(event) => setSelectedTeam(event.target.value)}
        >
          {teamNames.map((teamName) => (
            <option key={teamName} value={teamName}>
              {teamName}
            </option>
          ))}
        </select>

        <div className="text-sm text-black">
          Budget{' '}
          <span className={selectedBudget?.remaining < 0 ? 'text-red-600' : ''}>
            ${selectedBudget?.remaining ?? 0}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-sm"
          disabled={saving}
          onClick={handleSaveBoard}
        >
          {saving ? 'Saving...' : 'Save Board'}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                colSpan={4}
                className="border border-slate-500 bg-slate-200 px-2 py-1 text-center text-black"
              >
                <div className="font-semibold">{selectedTeam}</div>
                <div className="text-xs font-normal">
                  Spent: ${selectedBudget?.spent ?? 0} | Remaining: ${selectedBudget?.remaining ?? 0}
                </div>
              </th>
            </tr>
            <tr>
              <th className="w-12 border border-slate-400 bg-slate-100 px-2 py-1 text-black">Pos</th>
              <th className="min-w-64 border border-slate-400 bg-slate-100 px-2 py-1 text-black">Player</th>
              <th className="w-20 border border-slate-400 bg-slate-100 px-2 py-1 text-black">Contract</th>
              <th className="w-20 border border-slate-400 bg-slate-100 px-2 py-1 text-black">Cost</th>
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
                <tr key={`${selectedTeam}-${slot}-${slotIndex}-${rowIndex}`}>
                  <td className="w-12 border border-slate-300 bg-white px-2 py-1 text-black">{SLOT_DISPLAY_LABELS[slot] || slot}</td>
                  <td className="min-w-64 border border-slate-300 bg-white px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handlePlayerClick(selectedTeam, slot, slotIndex)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      {entry.playerId ? (
                        <div className="flex min-w-0 items-center gap-2">
                          {player?.headshotUrl ? (
                            <img
                              src={player.headshotUrl}
                              alt={entry.playerName}
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <div className="truncate text-sm text-black">{entry.playerName}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Click to assign selected player</span>
                      )}
                      {entry.playerId ? (
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            updateEntry(selectedTeam, slot, slotIndex, {
                              playerId: null,
                              playerName: '',
                              contract: '',
                              cost: '',
                              countsAgainstBudget: true,
                            });
                          }}
                          className="shrink-0 cursor-pointer text-xs text-red-600"
                        >
                          Clear
                        </span>
                      ) : null}
                    </button>
                  </td>
                  <td className="w-20 border border-slate-300 bg-white px-1 py-1">
                    <select
                      className="select select-bordered select-xs !bg-white !text-black w-full"
                      value={entry.contract ?? ''}
                      onChange={(event) => updateEntry(selectedTeam, slot, slotIndex, { contract: event.target.value })}
                    >
                      <option value=""></option>
                      {CONTRACT_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td className="w-20 border border-slate-300 bg-white px-1 py-1">
                    <input
                      type="number"
                      min="0"
                      className="input input-bordered input-xs !bg-white !text-black w-full text-right"
                      value={entry.cost ?? ''}
                      onChange={(event) =>
                        updateEntry(selectedTeam, slot, slotIndex, {
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
  );
}

export default function Page() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const [draftState, setDraftState] = useState(null);
  const [league, setLeague] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leagueId) return;

    Promise.all([
      leagueApi.getDraftState(leagueId),
      draftkitApi.getLeague(leagueId),
    ])
      .then(([draftStateResponse, leagueResponse]) => {
        setDraftState(draftStateResponse.draftState);
        setLeague(leagueResponse.league);
      })
      .catch((loadError) => {
        setError(loadError.message || 'Failed to load keeper data');
      });
  }, [leagueId]);

  if (!draftState || !league) {
    return (
      <>
        <KeeperPlayerRail
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
          leagueType={league?.config?.leagueType || null}
        />
        <div>
          <div className="panel mb-5">
            <h1 className="text-lg font-bold">Keeper</h1>
          </div>
          <div className="text-sm text-gray-600">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <KeeperPlayerRail
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
        leagueType={league?.config?.leagueType || null}
      />
      <div>
        <div className="panel mb-5">
          <h1 className="text-lg font-bold">Keeper</h1>
        </div>
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        <div>
          <KeeperBoardTable
            leagueId={leagueId}
            draftState={draftState}
            config={league.config}
            selectedPlayer={selectedPlayer}
            onSaved={setDraftState}
          />
        </div>
      </div>
    </>
  );
}
