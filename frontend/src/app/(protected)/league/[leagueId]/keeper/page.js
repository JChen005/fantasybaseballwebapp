"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { leagueApi } from "lib/leagueApi";
import { draftkitApi } from "lib/draftkitApi";
import SideBar from 'components/SideBar'


const SLOT_ORDER = ['C', 'B1', 'B2', 'B3', 'SS', 'OF', 'UTIL', 'P', 'BN'];
const CONTRACT_OPTIONS = ['F3', 'F2', 'F1', 'S3', 'S2', 'S1', 'X', 'LX'];

function buildRowPlan(rosterSlots) {
  const rows = [];

  for (const slot of SLOT_ORDER) {
    const count = Number(rosterSlots?.[slot] || 0);
    for (let i = 0; i < count; i += 1) {
      rows.push({ slot, slotIndex: i });
    }
  }

  return rows;
}

function isEntryEmpty(entry) {
  return (
    !entry?.mlbPlayerId &&
    !entry?.contract &&
    (entry?.price === '' || entry?.price === null || entry?.price === undefined)
  );
}

function findEntry(rows, slot, slotIndex) {
  return (rows || []).find(
    (row) => row.slot === slot && row.slotIndex === slotIndex
  );
}

function DraftBoardTable({
  config,
  selectedPlayer,
  leagueId,
  initialBoard = {},
  initialPlayerPool = {},
}) {
  const teamNames = config?.teamNames || [];
  const leagueBudget = Number(config?.budget || 0);

  const rowPlan = useMemo(
    () => buildRowPlan(config?.rosterSlots || {}),
    [config]
  );

  const [board, setBoard] = useState(() => initialBoard);
  const [playerPool, setPlayerPool] = useState(() => initialPlayerPool);
  const [selectedTeam, setSelectedTeam] = useState(teamNames[0] || '');

  useEffect(() => {
    if (!selectedTeam || !teamNames.includes(selectedTeam)) {
      setSelectedTeam(teamNames[0] || '');
    }
  }, [teamNames, selectedTeam]);

  const updateEntry = (teamName, slot, slotIndex, updates) => {
    setBoard((prev) => {
      const teamRows = prev[teamName] || [];
      const existingIndex = teamRows.findIndex(
        (row) => row.slot === slot && row.slotIndex === slotIndex
      );

      const existing =
        existingIndex >= 0
          ? teamRows[existingIndex]
          : {
              slot,
              slotIndex,
              mlbPlayerId: null,
              contract: '',
              price: '',
            };

      const nextEntry = {
        ...existing,
        ...updates,
      };

      let nextTeamRows;

      if (isEntryEmpty(nextEntry)) {
        nextTeamRows = teamRows.filter(
          (row) => !(row.slot === slot && row.slotIndex === slotIndex)
        );
      } else if (existingIndex >= 0) {
        nextTeamRows = [...teamRows];
        nextTeamRows[existingIndex] = nextEntry;
      } else {
        nextTeamRows = [...teamRows, nextEntry];
      }

      return {
        ...prev,
        [teamName]: nextTeamRows,
      };
    });
  };

  const handlePlayerClick = (teamName, slot, slotIndex) => {
    if (!selectedPlayer?.mlbPlayerId) return;

    setPlayerPool((prev) => ({
      ...prev,
      [selectedPlayer.mlbPlayerId]: selectedPlayer,
    }));

    updateEntry(teamName, slot, slotIndex, {
      mlbPlayerId: selectedPlayer.mlbPlayerId,
    });
  };

  const budgets = useMemo(() => {
    const result = {};

    for (const teamName of teamNames) {
      const rows = board[teamName] || [];
      let spent = 0;

      for (const row of rows) {
        const price = Number(row.price);
        if (row.price !== '' && Number.isFinite(price)) {
          spent += price;
        }
      }

      result[teamName] = {
        spent,
        remaining: leagueBudget - spent,
      };
    }

    return result;
  }, [board, teamNames, leagueBudget]);

  const handleLogBoard = () => {
    console.log({
      config,
      board,
      playerPool,
      budgets,
    });
    leagueApi.updateTeams(leagueId, {teams:board, budgets: budgets})
  };

  const currentRows = board[selectedTeam] || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-black">Team</label>
        <select
          className="select select-bordered select-sm !bg-white !text-black"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          {teamNames.map((teamName) => (
            <option key={teamName} value={teamName}>
              {teamName}
            </option>
          ))}
        </select>

        <div className="text-sm text-black">
          Budget:{' '}
          <span className={budgets[selectedTeam]?.remaining < 0 ? 'text-red-600' : ''}>
            ${budgets[selectedTeam]?.remaining ?? leagueBudget}
          </span>
        </div>

        <button type="button" className="btn btn-sm" onClick={handleLogBoard}>
          Log Board
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                colSpan={4}
                className="border border-gray-500 bg-gray-200 px-2 py-1 text-center text-black"
              >
                <div className="font-semibold">{selectedTeam}</div>
                <div className="text-xs font-normal">
                  Spent: ${budgets[selectedTeam]?.spent ?? 0} | Remaining: $
                  {budgets[selectedTeam]?.remaining ?? leagueBudget}
                </div>
              </th>
            </tr>
            <tr>
              <th className="w-12 border border-gray-400 bg-gray-100 px-2 py-1 text-black">
                Pos
              </th>
              <th className="min-w-64 border border-gray-400 bg-gray-100 px-2 py-1 text-black">
                Player
              </th>
              <th className="w-20 border border-gray-400 bg-gray-100 px-2 py-1 text-black">
                Contract
              </th>
              <th className="w-20 border border-gray-400 bg-gray-100 px-2 py-1 text-black">
                Price
              </th>
            </tr>
          </thead>

          <tbody>
            {rowPlan.map(({ slot, slotIndex }, rowIndex) => {
              const entry = findEntry(currentRows, slot, slotIndex) || {
                slot,
                slotIndex,
                mlbPlayerId: null,
                contract: '',
                price: '',
              };

              const player = entry.mlbPlayerId
                ? playerPool[entry.mlbPlayerId]
                : null;

              return (
                <tr key={`${selectedTeam}-${slot}-${slotIndex}-${rowIndex}`}>
                  <td className="w-12 border border-gray-300 bg-white px-2 py-1 text-black">
                    {slot}
                  </td>

                  <td className="min-w-64 border border-gray-300 bg-white px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handlePlayerClick(selectedTeam, slot, slotIndex)}
                      className="flex w-full items-center justify-between gap-2 text-left"
                    >
                      {player ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <img
                            src={player.headshotUrl}
                            alt={player.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm text-black">
                              {player.name}
                            </div>
                            <div className="truncate text-xs text-gray-600">
                              {player.team} · {player.positions?.join(', ')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Click to assign selected player
                        </span>
                      )}

                      {player && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            updateEntry(selectedTeam, slot, slotIndex, {
                              mlbPlayerId: null,
                            });
                          }}
                          className="shrink-0 cursor-pointer text-xs text-red-600"
                        >
                          Clear
                        </span>
                      )}
                    </button>
                  </td>

                  <td className="w-20 border border-gray-300 bg-white px-1 py-1">
                    <select
                      className="select select-bordered select-xs !bg-white !text-black w-full"
                      value={entry.contract ?? ''}
                      onChange={(e) =>
                        updateEntry(selectedTeam, slot, slotIndex, {
                          contract: e.target.value,
                        })
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

                  <td className="w-20 border border-gray-300 bg-white px-1 py-1">
                    <input
                      type="number"
                      min="0"
                      value={entry.price ?? ''}
                      onChange={(e) =>
                        updateEntry(selectedTeam, slot, slotIndex, {
                          price: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="input input-bordered input-xs !bg-white !text-black w-full text-right"
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

export default function Page({}) {
  const { leagueId } = useParams();
  const [config, setConfig] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  useEffect(() => {
    draftkitApi.getLeague(leagueId).then((res) => {
      setConfig(res.league.config);
    });
  }, [leagueId]);

  return (
    <>
    <SideBar selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} />
    <div className="panel mb-5">
        <h1 className="text-lg font-bold">Keeper</h1>
    </div>
    <DraftBoardTable config={config} selectedPlayer = {selectedPlayer} leagueId = {leagueId} />
    </>
  );
}
