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
  const [isUndoingLastPick, setIsUndoingLastPick] = useState(false); // undo last pick state
  const [isRedoingLastPick, setIsRedoingLastPick] = useState(false); // redo last undone pick state
  const [customDraftPlayer, setCustomDraftPlayer] = useState(null); // manually entered unvalued draft player

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

  const recentPicks = useMemo(
    () => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 12),
    [picks],
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

    if (selectedRosterMove.teamKey !== teamKey) {
      setRosterMoveError(
        "Players can only be moved within their current team.",
      );
      return;
    }

    if (selectedRosterMove.slot === targetSlot) {
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

    const team = teams.find((candidate) => candidate.teamKey === teamKey);
    const movingPlayer = team?.players?.find(
      (player) =>
        String(player.playerId) === String(selectedRosterMove.playerId),
    );

    if (!team || !movingPlayer) {
      setRosterMoveError("Could not find that player on the selected roster.");
      return;
    }

    if (getOpenCountForSlot(team, targetSlot, rosterSlots) <= 0) {
      setRosterMoveError(
        `${targetSlot} is already full for ${team.teamName || team.teamKey}.`,
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
      const latestTeam = latestTeams.find(
        (candidate) => candidate.teamKey === teamKey,
      );
      const latestMovingPlayer = latestTeam?.players?.find(
        (player) =>
          String(player.playerId) === String(selectedRosterMove.playerId),
      );

      if (!latestTeam || !latestMovingPlayer) {
        setRosterMoveError("Could not find that player on the latest roster.");
        return;
      }

      if (getOpenCountForSlot(latestTeam, targetSlot, rosterSlots) <= 0) {
        setRosterMoveError(
          `${targetSlot} is already full for ${latestTeam.teamName || latestTeam.teamKey}.`,
        );
        return;
      }

      const updatedTeams = latestTeams.map((candidateTeam) => {
        if (candidateTeam.teamKey !== teamKey) return candidateTeam;

        return {
          ...candidateTeam,
          players: (candidateTeam.players || []).map((player) => {
            if (String(player.playerId) !== String(latestMovingPlayer.playerId))
              return player;

            return {
              ...player,
              assignedSlot: targetSlot,
              assignedSlots: [targetSlot],
            };
          }),
        };
      });

      await leagueApi.updateDraftState(leagueId, {
        teams: updatedTeams,
        redoStack: [],
      });

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

  async function handleUndoLastPick() {
    const currentPicks = Array.isArray(draftState?.picks)
      ? draftState.picks
      : [];
    const lastPick = currentPicks[currentPicks.length - 1];

    if (!lastPick) {
      setDraftActionError("No picks to undo.");
      return;
    }

    try {
      setIsUndoingLastPick(true);
      setDraftActionError("");

      let undonePlayer = null;
      const updatedTeams = teams.map((team) => {
        if (team.teamKey !== lastPick.teamKey) {
          return team;
        }

        const nextPlayers = Array.isArray(team.players)
          ? [...team.players]
          : [];
        const playerIndex = nextPlayers.findIndex(
          (player) => String(player.playerId) === String(lastPick.playerId),
        );

        if (playerIndex === -1) {
          return team;
        }

        const [removedPlayer] = nextPlayers.splice(playerIndex, 1);
        undonePlayer = removedPlayer;
        const filledSlots = { ...(team.filledSlots || {}) };

        for (const slot of getPersistedAssignedSlots(removedPlayer)) {
          filledSlots[slot] = Math.max(0, Number(filledSlots[slot] || 0) - 1);
        }

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

      if (!undonePlayer) {
        throw new Error("Could not find the last picked player on that roster.");
      }

      await leagueApi.updateDraftState(leagueId, {
        userTeamKey: draftState?.userTeamKey,
        nominationTeamKey: draftState?.nominationTeamKey,
        currentPickNumber: Math.max(
          1,
          Number(draftState?.currentPickNumber || 1) - 1,
        ),
        teams: updatedTeams,
        picks: currentPicks.slice(0, -1),
        redoStack: undonePlayer
          ? [
              ...redoStack,
              {
                pick: lastPick,
                player: undonePlayer,
              },
            ]
          : redoStack,
      });

      if (String(selectedDraftPlayerId) === String(lastPick.playerId)) {
        setSelectedDraftPlayerId("");
        setDraftAssignedSlot("");
        setDraftCost("");
      }

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to undo last pick");
    } finally {
      setIsUndoingLastPick(false);
    }
  }

  async function handleRedoLastPick() {
    const redoEntry = redoStack[redoStack.length - 1];

    if (!redoEntry?.pick || !redoEntry?.player) {
      setDraftActionError("No picks to redo.");
      return;
    }

    try {
      setIsRedoingLastPick(true);
      setDraftActionError("");

      const { pick, player } = redoEntry;
      const targetTeam = teams.find((team) => team.teamKey === pick.teamKey);
      if (!targetTeam) {
        throw new Error("Original draft team no longer exists.");
      }

      if (draftedPlayerIds.has(String(player.playerId))) {
        throw new Error(`${player.playerName || pick.playerName} is already on a roster.`);
      }

      for (const slot of getPersistedAssignedSlots(player)) {
        if (getOpenCountForSlot(targetTeam, slot, rosterSlots) <= 0) {
          throw new Error(`${slot} is already full for ${targetTeam.teamName}.`);
        }
      }

      const updatedTeams = teams.map((team) => {
        if (team.teamKey !== pick.teamKey) {
          return team;
        }

        const nextPlayers = [
          ...(Array.isArray(team.players) ? team.players : []),
          player,
        ];
        const filledSlots = { ...(team.filledSlots || {}) };

        for (const slot of getPersistedAssignedSlots(player)) {
          filledSlots[slot] = Number(filledSlots[slot] || 0) + 1;
        }

        return {
          ...team,
          spentBudget: nextPlayers.reduce(
            (sum, rosterPlayer) =>
              sum +
              (rosterPlayer.countsAgainstBudget === false
                ? 0
                : Number(rosterPlayer.cost || 0)),
            0,
          ),
          filledSlots,
          players: nextPlayers,
        };
      });

      await leagueApi.updateDraftState(leagueId, {
        userTeamKey: draftState?.userTeamKey,
        nominationTeamKey: draftState?.nominationTeamKey,
        currentPickNumber: Math.max(
          Number(draftState?.currentPickNumber || 1),
          Number(pick.pickNumber || 0) + 1,
        ),
        teams: updatedTeams,
        picks: [...picks, pick],
        redoStack: redoStack.slice(0, -1),
      });

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to redo last pick");
    } finally {
      setIsRedoingLastPick(false);
    }
  }

  return {
    league,
    rows,
    picks,
    teams,
    rosterRows,
    teamNameByKey,
    recentPicks,
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
    handleUndoLastPick,
    isUndoingLastPick,
    handleRedoLastPick,
    isRedoingLastPick,
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
