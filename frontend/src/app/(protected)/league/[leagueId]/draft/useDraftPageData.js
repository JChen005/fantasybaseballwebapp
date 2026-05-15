import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { playerApi } from "lib/playerApi";
import { leagueApi } from "lib/leagueApi";
import {
  DRAFT_VALUATION_LIMIT,
  SEARCH_LIMIT,
} from "./draftPageConstants";
import {
  buildExcludedPlayersFromTeams,
  getDefaultAssignedSlot,
  getDraftContract,
  getDraftEligibleSlots,
  getDraftPickRound,
  getOpenCountForSlot,
  getPersistedAssignedSlots,
  parsePositionList,
  resolveValuationTeamKey,
  sortDepthSlots,
  toDraftSearchRow,
  toSearchRow,
  toValuationRow,
} from "./draftPageUtils";

// Max number of session edits we retain for undo/redo. Each entry stores
// before/after snapshots of teams + picks + currentPickNumber.
const ACTION_HISTORY_LIMIT = 50;

function cloneDraftSnapshot(snapshot) {
  try {
    return structuredClone(snapshot);
  } catch {
    return JSON.parse(JSON.stringify(snapshot));
  }
}

function buildDraftSnapshot({ teams, picks, currentPickNumber }) {
  return cloneDraftSnapshot({
    teams: Array.isArray(teams) ? teams : [],
    picks: Array.isArray(picks) ? picks : [],
    currentPickNumber: Number(currentPickNumber) > 0 ? Number(currentPickNumber) : 1,
  });
}

export default function useDraftPageData({ activeView, leagueId }) {
  // Core draft board data (from league and draftstate)
  const [rows, setRows] = useState([]); // valuation rows on draft board
  const [league, setLeague] = useState(null); // current league config
  const [draftState, setDraftState] = useState(null); // draft state for teams and picks
  const [draftError, setDraftError] = useState(""); // draft board load/save error message
  const [isLoadingDraft, setIsLoadingDraft] = useState(true); // initial draft board loading state

  // Depth chart tab state
  const [selectedTeamId, setSelectedTeamId] = useState(113); // selected MLB team for depth charts
  const [depthChart, setDepthChart] = useState(null); // loaded MLB depth chart response
  const [depthError, setDepthError] = useState(""); // depth chart load error message
  const [isLoadingDepth, setIsLoadingDepth] = useState(false); // depth chart loading state

  // Draft board search and filters
  const [lookupQuery, setLookupQuery] = useState(""); // draft board player search text
  const [draftTeamFilter, setDraftTeamFilter] = useState("ALL"); // team filter
  const [draftRoleFilter, setDraftRoleFilter] = useState("ALL"); // role/position filter
  const [draftNeedFilter, setDraftNeedFilter] = useState("ALL"); // roster-need filter
  const [draftSearchRows, setDraftSearchRows] = useState([]); // searched players rows
  const [draftSearchError, setDraftSearchError] = useState(""); // draft search error message
  const [isLoadingDraftSearch, setIsLoadingDraftSearch] = useState(false); // draft search loading state
  const [draftNotification, setDraftNotification] = useState(null); // latest mock player update notification
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]); // dismissed notification ids

  // Draft action form state for selecting and saving a new pick
  const [selectedDraftPlayerId, setSelectedDraftPlayerId] = useState(""); // selected player to draft
  const [draftTargetTeamKey, setDraftTargetTeamKey] = useState(""); // team receiving the drafted player
  const [draftAssignedSlot, setDraftAssignedSlot] = useState(""); // roster slot for the drafted player
  const [draftCost, setDraftCost] = useState(""); // entered auction/draft cost
  const [contract, setContract] = useState("F3"); // selected contract value for the drafted player
  const [draftActionError, setDraftActionError] = useState(""); // draft/undo action error message
  const [isSavingDraftAction, setIsSavingDraftAction] = useState(false); // draft save state
  const [isProcessingHistory, setIsProcessingHistory] = useState(false); // undo/redo dispatch in flight
  const [customDraftPlayer, setCustomDraftPlayer] = useState(null); // manually entered unvalued draft player

  // Session-scoped unified undo/redo log. Each entry captures the full state
  // snapshot before and after an editing action (picks and roster moves).
  // Snapshots are deep-cloned plain JSON to keep them stable across renders.
  const [actionLog, setActionLog] = useState({ past: [], future: [] });

  const recordAction = useCallback((description, prev, next) => {
    setActionLog((current) => {
      const nextPast = [...current.past, { description, prev, next }];
      const trimmed = nextPast.slice(-ACTION_HISTORY_LIMIT);
      return { past: trimmed, future: [] };
    });
  }, []);

  // Player lookup tab state
  const [playerSearchQuery, setPlayerSearchQuery] = useState(""); // lookup tab search text
  const [playerSearchRows, setPlayerSearchRows] = useState([]); // lookup tab search results
  const [playerSearchError, setPlayerSearchError] = useState(""); // lookup tab search error message
  const [isLoadingPlayerSearch, setIsLoadingPlayerSearch] = useState(false); // lookup tab loading state

  // Expanded roster move flow state
  const [selectedRosterMove, setSelectedRosterMove] = useState(null); // selected roster player being moved
  const [rosterMoveError, setRosterMoveError] = useState(""); // roster move error message
  const [isMovingRosterPlayer, setIsMovingRosterPlayer] = useState(false); // roster move save state
  const rosterMoveSelectionKeyRef = useRef("");

  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const normalizedPlayerSearchQuery = deferredPlayerSearchQuery.trim();
  const isSearchingPlayers = normalizedPlayerSearchQuery.length > 0;

  const refreshDraftBoard = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!leagueId) return;

      try {
        setDraftError("");
        if (!silent) {
          setIsLoadingDraft(true);
        }

        const [{ league: leagueData }, { draftState: draftStateData }] =
          await Promise.all([
            leagueApi.getLeague(leagueId),
            leagueApi.getDraftState(leagueId),
          ]);

        setLeague(leagueData);
        setDraftState(draftStateData);

        const valuationTeamKey = resolveValuationTeamKey(
          draftStateData.teams,
          draftTargetTeamKey,
          draftStateData.userTeamKey,
        );
        const { valuationTeamState, excludedPlayers } =
          buildExcludedPlayersFromTeams(draftStateData.teams, valuationTeamKey);

        const valuationData = await playerApi.getPlayerValuations({
          league: {
            leagueType: leagueData.config?.leagueType,
            budget: leagueData.config?.budget,
            teamCount: leagueData.config?.teamNames?.length || 1,
            rosterSlots: leagueData.config?.rosterSlots,
          },
          filters: {
            limit: DRAFT_VALUATION_LIMIT,
            includeInactive: false,
          },
          draftState: {
            excludedPlayers,
            filledSlots: valuationTeamState?.filledSlots || {},
          },
        });

        setRows((valuationData.players || []).map(toValuationRow));
      } catch (err) {
        setDraftError(err.message || "Failed to load draft board");
      } finally {
        if (!silent) {
          setIsLoadingDraft(false);
        }
      }
    },
    [draftTargetTeamKey, leagueId],
  );

  useEffect(() => {
    async function loadDraftBoard() {
      await refreshDraftBoard();
    }

    loadDraftBoard();
  }, [refreshDraftBoard]);

  useEffect(() => {
    if (activeView !== "depth") return undefined;

    let cancelled = false;

    async function loadDepthChart() {
      setIsLoadingDepth(true);
      setDepthError("");

      try {
        const data = await playerApi.getTeamDepthChart({
          teamId: selectedTeamId,
        });
        if (cancelled) return;
        setDepthChart(data);
      } catch (err) {
        if (cancelled) return;
        setDepthError(err.message || "Failed to load depth chart");
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
          leagueType: league?.config?.leagueType || null,
          rosterSlots: league?.config?.rosterSlots || {},
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
    league?.config?.leagueType,
    league?.config?.rosterSlots,
  ]);

  const teams = Array.isArray(draftState?.teams) ? draftState.teams : [];
  const picks = Array.isArray(draftState?.picks) ? draftState.picks : [];
  const redoStack = Array.isArray(draftState?.redoStack)
    ? draftState.redoStack
    : [];

  const draftedPlayerIds = useMemo(
    () =>
      new Set(
        teams.flatMap((team) =>
          (Array.isArray(team.players) ? team.players : [])
            .map((player) => String(player.playerId || "").trim())
            .filter(Boolean),
        ),
      ),
    [teams],
  );

  useEffect(() => {
    if (activeView !== "draft") return undefined;

    let cancelled = false;
    let latestSeenTimestamp = "";

    async function loadRecentNotifications() {
      try {
        const response = await playerApi.getRecentTransactionNotifications({
          since: latestSeenTimestamp,
        });
        if (cancelled) return;

        const notifications = Array.isArray(response?.notifications)
          ? response.notifications
          : [];
        const nextNotification = notifications.find(
          (notification) => !dismissedNotificationIds.includes(notification.id),
        );

        if (notifications[0]?.timestamp) {
          latestSeenTimestamp = notifications[0].timestamp;
        }

        if (nextNotification) {
          setDraftNotification(nextNotification);
        }
      } catch (err) {
        console.log(err);
      }
    }

    const intervalId = setInterval(loadRecentNotifications, 15_000);
    loadRecentNotifications();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeView, dismissedNotificationIds]);

  function dismissDraftNotification() {
    if (draftNotification?.id) {
      setDismissedNotificationIds((current) => [...current, draftNotification.id]);
    }
    setDraftNotification(null);
  }

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
    [league?.config?.budget, teams],
  );

  const teamNameByKey = useMemo(
    () =>
      new Map(
        teams.map((team) => [team.teamKey, team.teamName || team.teamKey]),
      ),
    [teams],
  );

  const rosterSlots = league?.config?.rosterSlots || {};
  const myTeamKey = draftState?.userTeamKey || teams[0]?.teamKey || "";
  const valuationTeamKey = resolveValuationTeamKey(
    teams,
    draftTargetTeamKey,
    myTeamKey,
  );
  const draftTargetTeam =
    teams.find((team) => team.teamKey === valuationTeamKey) || null;

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

    // Parse lookup query into individual queries by splitting on commas
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
              leagueType: league?.config?.leagueType || null,
              includeInactive: false,
              rosterSlots: league?.config?.rosterSlots || {},
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
    league?.config?.leagueType,
    league?.config?.rosterSlots,
    lookupQuery,
    valuationRowsById,
    draftTargetTeam,
  ]);

  const filteredDraftRows = useMemo(() => {
    const sourceRows = lookupQuery.trim() ? draftSearchRows : rows;
    console.log("sourceRows", sourceRows);
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
  console.log("filteredDraftRows", filteredDraftRows);

  const selectedDraftPlayer =
    customDraftPlayer ||
    filteredDraftRows.find((row) => row.id === selectedDraftPlayerId) ||
    rows.find((row) => row.id === selectedDraftPlayerId) ||
    null;

  const draftEligibleSlots = useMemo(
    () => getDraftEligibleSlots(selectedDraftPlayer, rosterSlots),
    [selectedDraftPlayer, rosterSlots],
  );

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

  useEffect(() => {
    if (!draftTargetTeamKey) {
      setDraftTargetTeamKey(myTeamKey);
    }
  }, [draftTargetTeamKey, myTeamKey]);

  useEffect(() => {
    if (!selectedDraftPlayer || !draftTargetTeam) {
      setDraftAssignedSlot("");
      return;
    }

    const nextSlot = getDefaultAssignedSlot(
      selectedDraftPlayer,
      draftTargetTeam,
      rosterSlots,
    );
    setDraftAssignedSlot((current) =>
      current && draftEligibleSlots.includes(current) ? current : nextSlot,
    );
  }, [draftEligibleSlots, draftTargetTeam, rosterSlots, selectedDraftPlayer]);

  function handleSelectDraftPlayer(row) {
    setCustomDraftPlayer(null);
    setSelectedDraftPlayerId(row.id);
    setDraftActionError("");
    setDraftCost(String(row.adjustedValue || row.marketValue || 0));
  }

  function handleSelectCustomDraftPlayer(player) {
    setCustomDraftPlayer({
      ...player,
      id: String(Date.now()),
      team: player.team || "CUSTOM",
      adjustedValue: null,
      marketValue: null,
      fillsNeed: false,
      neededSlots: [],
      isCustomPlayer: true,
    });
    setSelectedDraftPlayerId("");
    setDraftActionError("");
    setDraftCost("");
  }

  function handleCancelCustomDraftPlayer() {
    setCustomDraftPlayer(null);
    setSelectedDraftPlayerId("");
    setDraftAssignedSlot("");
    setDraftCost("");
    setDraftActionError("");
  }

  function getRosterMoveEligibleSlots(player) {
    const eligibleSlots = getDraftEligibleSlots(
      toSearchRow(player),
      rosterSlots,
    );
    if (Number(rosterSlots?.BN || 0) > 0) {
      eligibleSlots.push("BN");
    }

    return Array.from(new Set(eligibleSlots));
  }

  function getRosterMoveSelectionKey(teamKey, playerId, slot, slotIndex) {
    return [teamKey, playerId, slot, slotIndex]
      .map((value) => String(value ?? ""))
      .join(":");
  }

  async function handleSelectRosterMove(teamKey, player, slot, slotIndex) {
    if (!player?.playerId) return;

    const isSamePlayer =
      selectedRosterMove?.teamKey === teamKey &&
      String(selectedRosterMove?.playerId) === String(player.playerId) &&
      selectedRosterMove?.slot === slot &&
      selectedRosterMove?.slotIndex === slotIndex;

    if (isSamePlayer) {
      rosterMoveSelectionKeyRef.current = "";
      setSelectedRosterMove(null);
      setRosterMoveError("");
      return;
    }

    const selectionKey = getRosterMoveSelectionKey(
      teamKey,
      player.playerId,
      slot,
      slotIndex,
    );
    rosterMoveSelectionKeyRef.current = selectionKey;

    setSelectedRosterMove({
      teamKey,
      playerId: player.playerId,
      playerName: player.playerName || String(player.playerId),
      slot,
      slotIndex,
      eligibleSlots: [],
      isLoadingEligibleSlots: true,
    });
    setRosterMoveError("");

    try {
      const playerResponse = await playerApi.getPlayerById(player.playerId);
      const fullPlayer = playerResponse?.player || playerResponse;
      const eligibleSlots = getRosterMoveEligibleSlots(fullPlayer);

      setSelectedRosterMove((current) => {
        if (
          current?.teamKey !== teamKey ||
          String(current?.playerId) !== String(player.playerId) ||
          current?.slot !== slot ||
          current?.slotIndex !== slotIndex
        ) {
          return current;
        }

        return {
          ...current,
          eligibleSlots,
          isLoadingEligibleSlots: false,
        };
      });
    } catch (err) {
      if (rosterMoveSelectionKeyRef.current !== selectionKey) {
        return;
      }

      setSelectedRosterMove((current) => {
        if (
          current?.teamKey !== teamKey ||
          String(current?.playerId) !== String(player.playerId) ||
          current?.slot !== slot ||
          current?.slotIndex !== slotIndex
        ) {
          return current;
        }

        return {
          ...current,
          isLoadingEligibleSlots: false,
        };
      });
      setRosterMoveError(
        err.message || "Failed to load eligible slots for that player.",
      );
    }
  }

  async function handleMoveRosterPlayer(teamKey, targetSlot) {
    if (!selectedRosterMove) {
      return;
    }

    const sourceTeamKey = selectedRosterMove.teamKey;
    const targetTeamKey = teamKey;
    const isCrossTeamMove = sourceTeamKey !== targetTeamKey;

    if (!isCrossTeamMove && selectedRosterMove.slot === targetSlot) {
      rosterMoveSelectionKeyRef.current = "";
      setSelectedRosterMove(null);
      setRosterMoveError("");
      return;
    }

    if (selectedRosterMove.isLoadingEligibleSlots) {
      setRosterMoveError("Eligible slots are still loading for that player.");
      return;
    }

    if (!selectedRosterMove.eligibleSlots?.includes(targetSlot)) {
      setRosterMoveError(
        `${selectedRosterMove.playerName || "Selected player"} is not eligible for ${targetSlot}.`,
      );
      return;
    }

    const sourceTeam = teams.find((candidate) => candidate.teamKey === sourceTeamKey);
    const movingPlayer = sourceTeam?.players?.find(
      (player) =>
        String(player.playerId) === String(selectedRosterMove.playerId),
    );
    const targetTeam = teams.find((candidate) => candidate.teamKey === targetTeamKey);

    if (!sourceTeam || !movingPlayer) {
      setRosterMoveError("Could not find that player on the selected roster.");
      return;
    }

    if (!targetTeam) {
      setRosterMoveError("Could not find the destination team.");
      return;
    }

    if (getOpenCountForSlot(targetTeam, targetSlot, rosterSlots) <= 0) {
      setRosterMoveError(
        `${targetSlot} is already full for ${targetTeam.teamName || targetTeam.teamKey}.`,
      );
      return;
    }

    try {
      setIsMovingRosterPlayer(true);
      setRosterMoveError("");

      const latestDraftStateResponse = await leagueApi.getDraftState(leagueId);
      const latestDraftState = latestDraftStateResponse?.draftState || {};
      const latestTeams = Array.isArray(latestDraftState.teams)
        ? latestDraftState.teams
        : teams;
      const latestPicks = Array.isArray(latestDraftState.picks)
        ? latestDraftState.picks
        : Array.isArray(draftState?.picks)
          ? draftState.picks
          : [];
      const latestCurrentPickNumber = Number(
        latestDraftState.currentPickNumber || draftState?.currentPickNumber || 1,
      );
      const prevSnapshot = buildDraftSnapshot({
        teams: latestTeams,
        picks: latestPicks,
        currentPickNumber: latestCurrentPickNumber,
      });
      const latestSourceTeam = latestTeams.find(
        (candidate) => candidate.teamKey === sourceTeamKey,
      );
      const latestMovingPlayer = latestSourceTeam?.players?.find(
        (player) =>
          String(player.playerId) === String(selectedRosterMove.playerId),
      );
      const latestTargetTeam = latestTeams.find(
        (candidate) => candidate.teamKey === targetTeamKey,
      );

      if (!latestSourceTeam || !latestMovingPlayer) {
        setRosterMoveError("Could not find that player on the latest roster.");
        return;
      }

      if (!latestTargetTeam) {
        setRosterMoveError("Could not find the destination team.");
        return;
      }

      if (getOpenCountForSlot(latestTargetTeam, targetSlot, rosterSlots) <= 0) {
        setRosterMoveError(
          `${targetSlot} is already full for ${latestTargetTeam.teamName || latestTargetTeam.teamKey}.`,
        );
        return;
      }

      const movingPlayerSlots = getPersistedAssignedSlots(latestMovingPlayer);
      const updatedMovingPlayer = {
        ...latestMovingPlayer,
        assignedSlot: targetSlot,
        assignedSlots: [targetSlot],
      };

      const updatedTeams = latestTeams.map((candidateTeam) => {
        if (!isCrossTeamMove && candidateTeam.teamKey === sourceTeamKey) {
          return {
            ...candidateTeam,
            players: (candidateTeam.players || []).map((player) => {
              if (String(player.playerId) !== String(latestMovingPlayer.playerId))
                return player;

              return updatedMovingPlayer;
            }),
          };
        }

        if (isCrossTeamMove && candidateTeam.teamKey === sourceTeamKey) {
          const nextPlayers = (candidateTeam.players || []).filter(
            (player) =>
              String(player.playerId) !== String(latestMovingPlayer.playerId),
          );
          const filledSlots = { ...(candidateTeam.filledSlots || {}) };

          for (const slot of movingPlayerSlots) {
            filledSlots[slot] = Math.max(0, Number(filledSlots[slot] || 0) - 1);
          }

          return {
            ...candidateTeam,
            filledSlots,
            spentBudget: nextPlayers.reduce(
              (sum, player) =>
                sum +
                (player.countsAgainstBudget === false
                  ? 0
                  : Number(player.cost || 0)),
              0,
            ),
            players: nextPlayers,
          };
        }

        if (isCrossTeamMove && candidateTeam.teamKey === targetTeamKey) {
          const nextPlayers = [
            ...(Array.isArray(candidateTeam.players) ? candidateTeam.players : []),
            updatedMovingPlayer,
          ];
          const filledSlots = { ...(candidateTeam.filledSlots || {}) };
          filledSlots[targetSlot] = Number(filledSlots[targetSlot] || 0) + 1;

          return {
            ...candidateTeam,
            filledSlots,
            spentBudget: nextPlayers.reduce(
              (sum, player) =>
                sum +
                (player.countsAgainstBudget === false
                  ? 0
                  : Number(player.cost || 0)),
              0,
            ),
            players: nextPlayers,
          };
        }

        return candidateTeam;
      });

      await leagueApi.updateDraftState(leagueId, {
        teams: updatedTeams,
        redoStack: [],
      });

      const nextSnapshot = buildDraftSnapshot({
        teams: updatedTeams,
        picks: latestPicks,
        currentPickNumber: latestCurrentPickNumber,
      });

      const playerLabel =
        selectedRosterMove.playerName ||
        latestMovingPlayer.playerName ||
        String(latestMovingPlayer.playerId);
      const description = isCrossTeamMove
        ? `Traded ${playerLabel} to ${latestTargetTeam.teamName || latestTargetTeam.teamKey} (${targetSlot})`
        : `Moved ${playerLabel} to ${targetSlot}`;

      recordAction(description, prevSnapshot, nextSnapshot);

      rosterMoveSelectionKeyRef.current = "";
      setSelectedRosterMove(null);
      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setRosterMoveError(err.message || "Failed to move player");
    } finally {
      setIsMovingRosterPlayer(false);
    }
  }

  async function handleDraftPlayer() {
    if (!selectedDraftPlayer || !draftTargetTeam) {
      setDraftActionError("Select a player and target team.");
      return;
    }

    if (!selectedDraftPlayer.isCustomPlayer && draftedPlayerIds.has(String(selectedDraftPlayer.id))) {
      setDraftActionError(
        `${selectedDraftPlayer.name} has already been drafted.`,
      );
      return;
    }

    const numericCost = Number(draftCost);
    if (!Number.isFinite(numericCost) || numericCost < 0) {
      setDraftActionError("Cost must be a non-negative number.");
      return;
    }

    if (!draftAssignedSlot) {
      setDraftActionError("Choose a roster slot for this player.");
      return;
    }

    if (
      getOpenCountForSlot(draftTargetTeam, draftAssignedSlot, rosterSlots) <= 0
    ) {
      setDraftActionError(
        `${draftAssignedSlot} is already full for ${draftTargetTeam.teamName}.`,
      );
      return;
    }

    try {
      setIsSavingDraftAction(true);
      setDraftActionError("");

      const prevSnapshot = buildDraftSnapshot({
        teams,
        picks: Array.isArray(draftState?.picks) ? draftState.picks : [],
        currentPickNumber: Number(draftState?.currentPickNumber || 1),
      });

      const selectedContract = contract || getDraftContract("DRAFTED");
      const selectedPlayerId = selectedDraftPlayer.isCustomPlayer
        ? Number(selectedDraftPlayer.id)
        : selectedDraftPlayer.id;

      const updatedTeams = teams.map((team) => {
        const existingPlayers = Array.isArray(team.players)
          ? team.players.filter(
              (player) => String(player.playerId) !== String(selectedPlayerId),
            )
          : [];
        const filledSlots = { ...(team.filledSlots || {}) };

        if (team.teamKey !== draftTargetTeam.teamKey) {
          return {
            ...team,
            players: existingPlayers,
          };
        }

        const assignedSlots = draftAssignedSlot ? [draftAssignedSlot] : [];
        if (assignedSlots.length) {
          filledSlots[draftAssignedSlot] =
            Number(filledSlots[draftAssignedSlot] || 0) + 1;
        }

        const countsAgainstBudget = true;
        const nextPlayers = [
          ...existingPlayers,
          {
            playerId: selectedPlayerId,
            playerName: selectedDraftPlayer.name,
            cost: numericCost,
            status: "DRAFTED",
            countsAgainstBudget,
            assignedSlot: draftAssignedSlot,
            assignedSlots,
            contract: selectedContract,
          },
        ];

        return {
          ...team,
          spentBudget: nextPlayers.reduce(
            (sum, player) =>
              sum +
              (player.countsAgainstBudget === false
                ? 0
                : Number(player.cost || 0)),
            0,
          ),
          filledSlots,
          players: nextPlayers,
        };
      });

      const nextPickNumber = Number(draftState?.currentPickNumber || 1);
      const nextPicks = [
        ...(Array.isArray(draftState?.picks) ? draftState.picks : []),
        {
          pickNumber: nextPickNumber,
          round: getDraftPickRound(
            nextPickNumber,
            league?.config?.teamCount || teams.length || 1,
          ),
          teamKey: draftTargetTeam.teamKey,
          playerId: String(selectedPlayerId),
          playerName: selectedDraftPlayer.name,
          cost: numericCost,
          status: "DRAFTED",
          contract: selectedContract,
          timestamp: new Date().toISOString(),
        },
      ];

      await leagueApi.updateDraftState(leagueId, {
        userTeamKey: draftState?.userTeamKey,
        nominationTeamKey: draftState?.nominationTeamKey,
        currentPickNumber: nextPickNumber + 1,
        teams: updatedTeams,
        picks: nextPicks,
        redoStack: [],
      });

      const nextSnapshot = buildDraftSnapshot({
        teams: updatedTeams,
        picks: nextPicks,
        currentPickNumber: nextPickNumber + 1,
      });

      recordAction(
        `Drafted ${selectedDraftPlayer.name} to ${draftTargetTeam.teamName || draftTargetTeam.teamKey}`,
        prevSnapshot,
        nextSnapshot,
      );

      setSelectedDraftPlayerId("");
      setCustomDraftPlayer(null);
      setDraftAssignedSlot("");
      setDraftCost("");
      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to save draft action");
    } finally {
      setIsSavingDraftAction(false);
    }
  }

  async function applyHistorySnapshot(snapshot) {
    await leagueApi.updateDraftState(leagueId, {
      userTeamKey: draftState?.userTeamKey,
      nominationTeamKey: draftState?.nominationTeamKey,
      currentPickNumber: snapshot.currentPickNumber,
      teams: snapshot.teams,
      picks: snapshot.picks,
      redoStack: [],
    });
  }

  async function handleUndo() {
    if (!actionLog.past.length) {
      setDraftActionError("Nothing to undo.");
      return;
    }

    const entry = actionLog.past[actionLog.past.length - 1];

    try {
      setIsProcessingHistory(true);
      setDraftActionError("");
      setRosterMoveError("");

      await applyHistorySnapshot(entry.prev);

      setActionLog((current) => ({
        past: current.past.slice(0, -1),
        future: [...current.future, entry],
      }));

      // Clear in-flight selections that might reference state that just rolled
      // back (e.g. the player we just undrafted, or a slot move target).
      setSelectedDraftPlayerId("");
      setCustomDraftPlayer(null);
      setDraftAssignedSlot("");
      setDraftCost("");
      rosterMoveSelectionKeyRef.current = "";
      setSelectedRosterMove(null);

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to undo last action");
    } finally {
      setIsProcessingHistory(false);
    }
  }

  async function handleRedo() {
    if (!actionLog.future.length) {
      setDraftActionError("Nothing to redo.");
      return;
    }

    const entry = actionLog.future[actionLog.future.length - 1];

    try {
      setIsProcessingHistory(true);
      setDraftActionError("");
      setRosterMoveError("");

      await applyHistorySnapshot(entry.next);

      setActionLog((current) => ({
        past: [...current.past, entry],
        future: current.future.slice(0, -1),
      }));

      setSelectedDraftPlayerId("");
      setCustomDraftPlayer(null);
      setDraftAssignedSlot("");
      setDraftCost("");
      rosterMoveSelectionKeyRef.current = "";
      setSelectedRosterMove(null);

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to redo last action");
    } finally {
      setIsProcessingHistory(false);
    }
  }

  return {
    league,
    rows,
    picks,
    teams,
    rosterRows,
    teamNameByKey,
    rosterSlots,
    lookupQuery,
    setLookupQuery,
    draftError,
    isLoadingDraft,
    playerSearchQuery,
    setPlayerSearchQuery,
    playerSearchRows,
    playerSearchError,
    isLoadingPlayerSearch,
    isSearchingPlayers,
    normalizedPlayerSearchQuery,
    lookupRows,
    selectedTeamId,
    setSelectedTeamId,
    depthChart,
    depthError,
    isLoadingDepth,
    filteredDraftRows,
    draftSearchError,
    isLoadingDraftSearch,
    draftNotification,
    dismissDraftNotification,
    draftTeamFilter,
    setDraftTeamFilter,
    draftRoleFilter,
    setDraftRoleFilter,
    draftNeedFilter,
    setDraftNeedFilter,
    draftTeamOptions,
    draftRoleOptions,
    selectedDraftPlayerId,
    selectedDraftPlayer,
    draftActionError,
    handleSelectDraftPlayer,
    handleSelectCustomDraftPlayer,
    handleCancelCustomDraftPlayer,
    handleSelectRosterMove,
    handleMoveRosterPlayer,
    handleUndo,
    handleRedo,
    canUndo: actionLog.past.length > 0,
    canRedo: actionLog.future.length > 0,
    nextUndoDescription:
      actionLog.past[actionLog.past.length - 1]?.description || "",
    nextRedoDescription:
      actionLog.future[actionLog.future.length - 1]?.description || "",
    isProcessingHistory,
    redoStack,
    draftTargetTeamKey,
    setDraftTargetTeamKey,
    draftCost,
    setDraftCost,
    draftAssignedSlot,
    setDraftAssignedSlot,
    draftEligibleSlots,
    draftTargetTeam,
    handleDraftPlayer,
    isSavingDraftAction,
    getOpenCountForSlot,
    getPersistedAssignedSlots,
    sortDepthSlots,
    contract,
    setContract,
    selectedRosterMove,
    rosterMoveError,
    isMovingRosterPlayer,
    customDraftPlayer,
  };
}
