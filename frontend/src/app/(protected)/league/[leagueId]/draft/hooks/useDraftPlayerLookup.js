import { useDeferredValue, useEffect, useState } from "react";
import { playerApi } from "lib/playerApi";
import { SEARCH_LIMIT } from "../draftPageConstants";
import { toSearchRow } from "../draftPageUtils";

export function useDraftPlayerLookup({
  activeView,
  leagueType,
  rosterSlots,
}) {
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [playerSearchRows, setPlayerSearchRows] = useState([]);
  const [playerSearchError, setPlayerSearchError] = useState("");
  const [isLoadingPlayerSearch, setIsLoadingPlayerSearch] = useState(false);

  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const normalizedPlayerSearchQuery = deferredPlayerSearchQuery.trim();
  const isSearchingPlayers = normalizedPlayerSearchQuery.length > 0;

  useEffect(() => {
    if (activeView !== "lookup" || !isSearchingPlayers) {
      setPlayerSearchRows([]);
      setPlayerSearchError("");
      setIsLoadingPlayerSearch(false);
      return undefined;
    }

    let cancelled = false;

    async function loadPlayerSearch() {
      setIsLoadingPlayerSearch(true);
      setPlayerSearchError("");

      try {
        const data = await playerApi.searchPlayers({
          q: normalizedPlayerSearchQuery,
          limit: SEARCH_LIMIT,
          leagueType: leagueType || null,
          rosterSlots: rosterSlots || {},
          filledSlots: {},
        });
        if (cancelled) return;

        setPlayerSearchRows(
          Array.isArray(data.players) ? data.players.map(toSearchRow) : [],
        );
      } catch (err) {
        if (cancelled) return;
        setPlayerSearchRows([]);
        setPlayerSearchError(err.message || "Failed to search players");
      } finally {
        if (!cancelled) {
          setIsLoadingPlayerSearch(false);
        }
      }
    }

    loadPlayerSearch();

    return () => {
      cancelled = true;
    };
  }, [
    activeView,
    isSearchingPlayers,
    normalizedPlayerSearchQuery,
    leagueType,
    rosterSlots,
  ]);

  return {
    playerSearchQuery,
    setPlayerSearchQuery,
    playerSearchRows,
    playerSearchError,
    isLoadingPlayerSearch,
    isSearchingPlayers,
    normalizedPlayerSearchQuery,
  };
}
