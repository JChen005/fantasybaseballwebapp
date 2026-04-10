"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { leagueApi } from "lib/leagueApi";
import { draftkitApi } from "lib/draftkitApi";
import { playerApi } from 'lib/playerApi';
import SideBar from "components/SideBar";

const SLOT_ORDER = ["C", "1B", "2B", "3B", "CI", "MI", "SS", "OF", "U", "P"];
const CONTRACT_OPTIONS = ["F3", "F2", "F1", "S3", "S2", "S1", "X", "LX"];

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
    !entry?.playerId &&
    !entry?.contract &&
    (entry?.cost === "" || entry?.cost === null || entry?.cost === undefined)
  );
}

function findEntry(rows, slot, slotIndex) {
  return (rows || []).find(
    (row) => row.slot === slot && row.slotIndex === slotIndex
  );
}

function draftStateTeamsToBoard(teams = []) {
  const nextBoard = {};

  for (const team of teams) {
    const teamName = team.teamName || team.teamKey;
    const slotCounts = {};

    nextBoard[teamName] = (team.players || []).map((player) => {
      const slot = player.assignedSlot || "BN";
      const slotIndex = slotCounts[slot] || 0;
      slotCounts[slot] = slotIndex + 1;

      return {
        slot,
        slotIndex,
        playerId: player.playerId ?? null,
        playerName: player.playerName || "",
        cost: player.cost ?? "",
        status: player.status || "KEEPER",
        contract: player.contract || "",
        assignedSlots: player.assignedSlot ? [player.assignedSlot] : [],
        countsAgainstBudget:
          typeof player.countsAgainstBudget === "boolean"
            ? player.countsAgainstBudget
            : true,
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
      .map((row) => ({
        playerId: Number(row.playerId),
        playerName: row.playerName || "",
        cost:
          row.cost === "" || row.cost === null || row.cost === undefined
            ? 0
            : Number(row.cost),
        status: row.status || "KEEPER",
        countsAgainstBudget:
          typeof row.countsAgainstBudget === "boolean"
            ? row.countsAgainstBudget
            : row.status === "RESERVE" || row.status === "TAXI"
              ? false
              : true,
        assignedSlot: row.slot || "",
        contract: row.contract || undefined,
      }));

    const spentBudget = players.reduce((sum, player) => {
      return player.countsAgainstBudget ? sum + Number(player.cost || 0) : sum;
    }, 0);

    const filledSlots = players.reduce((acc, player) => {
      const slot = player.assignedSlot || "BN";
      acc[slot] = Number(acc[slot] || 0) + 1;
      return acc;
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
      if (player?.playerId != null) {
        ids.add(Number(player.playerId));
      }
    }
  }

  return Array.from(ids);
}

function DraftBoardTable({
  draftState,
  config,
  selectedPlayer,
  leagueId,
  initialPlayerPool = {},
}) {
  const teams = draftState?.teams || [];
  const teamNames = teams.map((team) => team.teamName || team.teamKey);

  const rowPlan = useMemo(
    () => buildRowPlan(config?.rosterSlots || {}),
    [config]
  );

  const [board, setBoard] = useState(() => draftStateTeamsToBoard(teams));
  const [playerPool, setPlayerPool] = useState(() => initialPlayerPool);
  const [selectedTeam, setSelectedTeam] = useState(teamNames[0] || "");

  useEffect(() => {
    setBoard(draftStateTeamsToBoard(teams));
  }, [teams]);

  useEffect(() => {
    if (!selectedTeam || !teamNames.includes(selectedTeam)) {
      setSelectedTeam(teamNames[0] || "");
    }
  }, [teamNames, selectedTeam]);

  const draftStatePlayerIds = useMemo(
    () => getDraftStatePlayerIds(teams),
    [teams]
  );

  useEffect(() => {
    const missingIds = draftStatePlayerIds.filter((id) => !playerPool[id]);

    if (missingIds.length === 0) return;

    Promise.all(missingIds.map((playerId) => playerApi.getPlayerById(playerId)))
      .then((results) => {
        setPlayerPool((prev) => {
          const next = { ...prev };

          for (const res of results) {
            const player = res?.player || res;
            const id = player?.mlbPlayerId ?? player?.playerId;

            if (id != null) {
              next[Number(id)] = player;
            }
          }

          return next;
        });
      })
      .catch((err) => {
        console.error("Failed to hydrate player pool from draft state", err);
      });
  }, [draftStatePlayerIds]);

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
              playerId: null,
              playerName: "",
              cost: "",
              status: "KEEPER",
              contract: "",
              assignedSlots: [],
              countsAgainstBudget: true,
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
      [Number(selectedPlayer.mlbPlayerId)]: selectedPlayer,
    }));

    updateEntry(teamName, slot, slotIndex, {
      playerId: Number(selectedPlayer.mlbPlayerId),
      playerName: selectedPlayer.name || selectedPlayer.canonicalName || "",
      status: "KEEPER",
      assignedSlots: selectedPlayer.positions || [],
      countsAgainstBudget: true,
    });
  };

  const budgets = useMemo(() => {
    const result = {};

    for (const team of teams) {
      const teamName = team.teamName || team.teamKey;
      const rows = board[teamName] || [];
      const budget = Number(team.budget || 260);

      let spent = 0;
      for (const row of rows) {
        const cost = Number(row.cost);
        const countsAgainstBudget =
          typeof row.countsAgainstBudget === "boolean"
            ? row.countsAgainstBudget
            : row.status !== "RESERVE" && row.status !== "TAXI";

        if (
          countsAgainstBudget &&
          row.cost !== "" &&
          Number.isFinite(cost)
        ) {
          spent += cost;
        }
      }

      result[teamName] = {
        budget,
        spent,
        remaining: budget - spent,
      };
    }

    return result;
  }, [board, teams]);

  const handleSaveBoard = async () => {
    const updatedTeams = boardToDraftStateTeams(board, teams);

    const payload = {
      ...draftState,
      teams: updatedTeams,
    };

    console.log("SAVING PAYLOAD", JSON.stringify(payload, null, 2));

    const res = await leagueApi.updateDraftState(leagueId, payload);

    if (res?.draftState) {
      setBoard(draftStateTeamsToBoard(res.draftState.teams || []));
    }
  };

  const currentRows = board[selectedTeam] || [];
  const selectedBudget = budgets[selectedTeam];

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
          Budget{" "}
          <span className={selectedBudget?.remaining < 0 ? "text-red-600" : ""}>
            ${selectedBudget?.remaining ?? 0}
          </span>
        </div>

        <button type="button" className="btn btn-sm" onClick={handleSaveBoard}>
          Save Board
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
                  Spent: ${selectedBudget?.spent ?? 0} | Remaining: $
                  {selectedBudget?.remaining ?? 0}
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
                Cost
              </th>
            </tr>
          </thead>

          <tbody>
            {rowPlan.map(({ slot, slotIndex }, rowIndex) => {
              const entry = findEntry(currentRows, slot, slotIndex) || {
                slot,
                slotIndex,
                playerId: null,
                playerName: "",
                cost: "",
                status: "KEEPER",
                contract: "",
                assignedSlots: [],
                countsAgainstBudget: true,
              };

              const player = entry.playerId ? playerPool[Number(entry.playerId)] : null;

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
                            <div className="truncate text-sm text-black">
                              {entry.playerName}
                            </div>
                            <div className="truncate text-xs text-gray-600">
                              {entry.assignedSlots?.join(", ")}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Click to assign selected player
                        </span>
                      )}

                      {entry.playerId && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            updateEntry(selectedTeam, slot, slotIndex, {
                              playerId: null,
                              playerName: "",
                              assignedSlots: [],
                              contract: "",
                              cost: "",
                              countsAgainstBudget: true,
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
                      value={entry.contract ?? ""}
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
                      value={entry.cost ?? ""}
                      onChange={(e) =>
                        updateEntry(selectedTeam, slot, slotIndex, {
                          cost: e.target.value === "" ? "" : Number(e.target.value),
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

export default function Page() {
  const { leagueId } = useParams();
  const [draftState, setDraftState] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    Promise.all([
      leagueApi.getDraftState(leagueId),
      draftkitApi.getLeague(leagueId),
    ])
      .then(([draftStateRes, leagueRes]) => {
        setDraftState(draftStateRes.draftState);
        setConfig(leagueRes.league.config);
      })
      .catch((err) => {
        console.error("Failed to load keeper page data", err);
      });
  }, [leagueId]);

  if (!draftState || !config) {
    return (
      <>
        <SideBar
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
        />
        <div className="panel mb-5">
          <h1 className="text-lg font-bold">Keeper</h1>
        </div>
        <div className="text-sm text-gray-600">Loading...</div>
      </>
    );
  }

  return (
    <>
      <SideBar
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
      />
      <div className="panel mb-5">
        <h1 className="text-lg font-bold">Keeper</h1>
      </div>
      <DraftBoardTable
        draftState={draftState}
        config={config}
        selectedPlayer={selectedPlayer}
        leagueId={leagueId}
      />
    </>
  );
}