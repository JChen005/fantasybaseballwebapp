import { useEffect, useMemo, useState } from "react";
import { playerApi } from "lib/playerApi";
import { SEARCH_LIMIT } from "../draftPageConstants";
import { parsePositionList, toDraftSearchRow } from "../draftPageUtils";

export function useDraftBoardSearch({
  activeView,
  rows,
  leagueType,
  rosterSlots,
  draftTargetTeam,
  draftTargetTeamKey,
  draftedPlayerIds,
}) {
  const [lookupQuery, setLookupQuery] = useState("");
  const [draftTeamFilter, setDraftTeamFilter] = useState("ALL");
  const [draftRoleFilter, setDraftRoleFilter] = useState("ALL");
  const [draftNeedFilter, setDraftNeedFilter] = useState("ALL");
  const [draftSearchRows, setDraftSearchRows] = useState([]);
  const [draftSearchError, setDraftSearchError] = useState("");
  const [isLoadingDraftSearch, setIsLoadingDraftSearch] = useState(false);

  const draftTeamOptions = useMemo(() => {
    const options = new Set(rows.map((row) => row.team).filter(Boolean));
    return ["ALL", ...Array.from(options).sort()];
  }, [rows]);

  const draftRoleOptions = useMemo(() => {
    const options = new Set(
      rows.flatMap((row) => parsePositionList(row.position)),
    );
    return ["ALL", ...Array.from(options).sort()];
  }, [rows]);

  const valuationRowsById = useMemo(
    () => new Map(rows.map((row) => [String(row.id), row])),
    [rows],
  );

  useEffect(() => {
    if (activeView !== "draft") return undefined;

    const queries = lookupQuery
      .split(",")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (queries.length === 0) {
      setDraftSearchRows([]);
      setDraftSearchError("");
      setIsLoadingDraftSearch(false);
      return undefined;
    }

    let cancelled = false;

    async function loadDraftSearch() {
      setIsLoadingDraftSearch(true);
      setDraftSearchError("");

      try {
        const results = await Promise.all(
          queries.map((query) =>
            playerApi.searchPlayers({
              q: query,
              limit: SEARCH_LIMIT,
              leagueType: leagueType || null,
              includeInactive: false,
              rosterSlots: rosterSlots || {},
              filledSlots: draftTargetTeam?.filledSlots || {},
            }),
          ),
        );

        if (cancelled) return;

        const combinedPlayers = results.flatMap((data) =>
          Array.isArray(data.players) ? data.players : [],
        );

        const uniquePlayers = Array.from(
          new Map(
            combinedPlayers.map((player) => [player.mlbPlayerId, player]),
          ).values(),
        );

        const searchedRows = uniquePlayers.map((player) =>
          toDraftSearchRow(player, valuationRowsById),
        );

        setDraftSearchRows(searchedRows);
      } catch (err) {
        if (cancelled) return;
        setDraftSearchRows([]);
        setDraftSearchError(err.message || "Failed to search draft players");
      } finally {
        if (!cancelled) {
          setIsLoadingDraftSearch(false);
        }
      }
    }

    loadDraftSearch();

    return () => {
      cancelled = true;
    };
  }, [
    activeView,
    draftTargetTeamKey,
    leagueType,
    rosterSlots,
    lookupQuery,
    valuationRowsById,
    draftTargetTeam,
  ]);

  const filteredDraftRows = useMemo(() => {
    const sourceRows = lookupQuery.trim() ? draftSearchRows : rows;

    return sourceRows
      .filter((row) => {
        if (draftedPlayerIds.has(String(row.id))) return false;
        if (draftTeamFilter !== "ALL" && row.team !== draftTeamFilter)
          return false;
        if (
          draftRoleFilter !== "ALL" &&
          !parsePositionList(row.position).includes(draftRoleFilter)
        )
          return false;
        if (draftNeedFilter === "YES" && !row.fillsNeed) return false;
        if (draftNeedFilter === "NO" && row.fillsNeed) return false;
        return true;
      })
      .sort(
        (a, b) => Number(b.adjustedValue || 0) - Number(a.adjustedValue || 0),
      );
  }, [
    draftNeedFilter,
    draftRoleFilter,
    draftSearchRows,
    draftTeamFilter,
    draftedPlayerIds,
    lookupQuery,
    rows,
  ]);

  const lookupRows = useMemo(() => {
    const search = lookupQuery.trim().toLowerCase();
    if (!search) return rows;

    return rows.filter((row) =>
      [row.name, row.team, row.position, String(row.mlbPlayerId || "")]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [lookupQuery, rows]);

  return {
    lookupQuery,
    setLookupQuery,
    draftTeamFilter,
    setDraftTeamFilter,
    draftRoleFilter,
    setDraftRoleFilter,
    draftNeedFilter,
    setDraftNeedFilter,
    draftTeamOptions,
    draftRoleOptions,
    filteredDraftRows,
    draftSearchError,
    isLoadingDraftSearch,
    lookupRows,
  };
}
