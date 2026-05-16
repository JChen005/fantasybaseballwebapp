"use client";

import { useMemo, useState } from "react";
import {
  formatPlayerStatValue,
  getPlayerStatsSortValue,
  isPlayerStatApplicable,
} from "./draftPageUtils";

function SortableHeader({ label, columnKey, sortConfig, onSort }) {
  const isActive = sortConfig.key === columnKey;
  const indicator = !isActive ? "↕" : sortConfig.direction === "asc" ? "▲" : "▼";

  return (
    <th className="px-2 py-2 font-medium">
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium text-white transition hover:text-cyan-200"
        onClick={() => onSort(columnKey)}
        aria-label={`Sort by ${label}`}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className="min-w-3 text-xs text-slate-400">{indicator}</span>
      </button>
    </th>
  );
}

export default function PlayerStatsView({
  rows,
  teams,
  lookupQuery,
  setLookupQuery,
  isLoadingDraft,
  draftError,
  PlayerCell,
}) {
  const statColumns = [
    { key: "hr", label: "HR" },
    { key: "rbi", label: "RBI" },
    { key: "sb", label: "SB" },
    { key: "avg", label: "AVG" },
    { key: "w", label: "W" },
    { key: "k", label: "K" },
    { key: "era", label: "ERA" },
    { key: "whip", label: "WHIP" },
  ];

  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const draftedPlayerIds = useMemo(
    () =>
      new Set(
        (Array.isArray(teams) ? teams : []).flatMap((team) =>
          (Array.isArray(team.players) ? team.players : [])
            .map((player) => String(player.playerId || "").trim())
            .filter(Boolean),
        ),
      ),
    [teams],
  );

  const searchTokens = useMemo(
    () =>
      lookupQuery
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    [lookupQuery],
  );

  const sortedRows = useMemo(() => {
    const filteredRows = (Array.isArray(rows) ? rows : []).filter((row) => {
      if (draftedPlayerIds.has(String(row.id))) return false;
      if (!searchTokens.length) return true;

      const haystack = [row.name, row.team, row.position]
        .join(" ")
        .toLowerCase();

      return searchTokens.some((token) => haystack.includes(token));
    });

    return [...filteredRows].sort((left, right) => {
      const leftValue = getPlayerStatsSortValue(left, sortConfig.key);
      const rightValue = getPlayerStatsSortValue(right, sortConfig.key);

      if (leftValue === rightValue) {
        return left.name.localeCompare(right.name);
      }

      if (typeof leftValue === "string" || typeof rightValue === "string") {
        return sortConfig.direction === "asc"
          ? String(leftValue).localeCompare(String(rightValue))
          : String(rightValue).localeCompare(String(leftValue));
      }

      return sortConfig.direction === "asc"
        ? leftValue - rightValue
        : rightValue - leftValue;
    });
  }, [draftedPlayerIds, rows, searchTokens, sortConfig]);

  function handleSort(columnKey) {
    setSortConfig((current) => {
      if (current.key === columnKey) {
        return {
          key: columnKey,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key: columnKey,
        direction: columnKey === "name" || columnKey === "position" ? "asc" : "desc",
      };
    });
  }

  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Player Stats</h2>
          <p className="text-sm text-slate-600">
            Draft board pool with last-season player stats and sortable stat columns.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Click any column header to sort. Inactive stat categories for a player's role show as `-`.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-white">Search</span>
          <input
            className="input"
            value={lookupQuery}
            onChange={(event) => setLookupQuery(event.target.value)}
            placeholder="Player name, team, role"
          />
        </label>
      </div>

      {isLoadingDraft ? (
        <p className="text-sm text-slate-600">Loading player stats...</p>
      ) : draftError ? (
        <p className="text-sm text-red-600">{draftError}</p>
      ) : !sortedRows.length ? (
        <p className="text-sm text-slate-600">
          No players match the current player stats search.
        </p>
      ) : (
        <div className="max-h-[720px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-950">
              <tr className="border-b border-slate-200 text-left">
                <SortableHeader label="Player" columnKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Pos" columnKey="position" sortConfig={sortConfig} onSort={handleSort} />
                {statColumns.map((column) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    columnKey={column.key}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={`stats-${row.id}`}
                  className="border-b border-slate-200/70 transition hover:bg-white/5"
                >
                  <td className="px-2 py-2 font-medium">
                    <PlayerCell row={row} />
                  </td>
                  <td className="px-2 py-2">{row.position}</td>
                  {statColumns.map((column) => {
                    const applicable = isPlayerStatApplicable(row, column.key);
                    return (
                      <td key={`${row.id}-${column.key}`} className="px-2 py-2">
                        {applicable
                          ? formatPlayerStatValue(
                              getPlayerStatsSortValue(row, column.key),
                              column.key,
                            )
                          : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
