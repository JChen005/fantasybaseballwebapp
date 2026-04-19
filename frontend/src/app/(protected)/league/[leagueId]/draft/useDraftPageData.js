import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { playerApi } from 'lib/playerApi';
import { leagueApi } from 'lib/leagueApi';
import { DRAFT_VALUATION_LIMIT, MLB_DEPTH_CHART_TEAMS, SEARCH_LIMIT } from './draftPageConstants';
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
} from './draftPageUtils';

export default function useDraftPageData({ activeView, leagueId }) {
  const [rows, setRows] = useState([]);
  const [league, setLeague] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(113);
  const [depthChart, setDepthChart] = useState(null);
  const [draftError, setDraftError] = useState('');
  const [depthError, setDepthError] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [draftTeamFilter, setDraftTeamFilter] = useState('ALL');
  const [draftRoleFilter, setDraftRoleFilter] = useState('ALL');
  const [draftNeedFilter, setDraftNeedFilter] = useState('ALL');
  const [selectedDraftPlayerId, setSelectedDraftPlayerId] = useState('');
  const [draftTargetTeamKey, setDraftTargetTeamKey] = useState('');
  const [draftAssignedSlot, setDraftAssignedSlot] = useState('');
  const [draftCost, setDraftCost] = useState('');
  const [draftActionError, setDraftActionError] = useState('');
  const [isSavingDraftAction, setIsSavingDraftAction] = useState(false);
  const [isUndoingLastPick, setIsUndoingLastPick] = useState(false);
  const [draftSearchRows, setDraftSearchRows] = useState([]);
  const [draftSearchError, setDraftSearchError] = useState('');
  const [isLoadingDraftSearch, setIsLoadingDraftSearch] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerSearchRows, setPlayerSearchRows] = useState([]);
  const [playerSearchError, setPlayerSearchError] = useState('');
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isLoadingDepth, setIsLoadingDepth] = useState(false);
  const [isLoadingPlayerSearch, setIsLoadingPlayerSearch] = useState(false);
  const [contract, setContract] = useState('F3');

  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const normalizedPlayerSearchQuery = deferredPlayerSearchQuery.trim();
  const isSearchingPlayers = normalizedPlayerSearchQuery.length > 0;

  const refreshDraftBoard = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!leagueId) return;

    try {
      setDraftError('');
      if (!silent) {
        setIsLoadingDraft(true);
      }

      const [{ league: leagueData }, { draftState: draftStateData }] = await Promise.all([
        leagueApi.getLeague(leagueId),
        leagueApi.getDraftState(leagueId),
      ]);

      setLeague(leagueData);
      setDraftState(draftStateData);

      const valuationTeamKey = resolveValuationTeamKey(draftStateData.teams, draftTargetTeamKey, draftStateData.userTeamKey);
      const { valuationTeamState, excludedPlayers } = buildExcludedPlayersFromTeams(draftStateData.teams, valuationTeamKey);

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
      setDraftError(err.message || 'Failed to load draft board');
    } finally {
      if (!silent) {
        setIsLoadingDraft(false);
      }
    }
  }, [draftTargetTeamKey, leagueId]);

  useEffect(() => {
    async function loadDraftBoard() {
      await refreshDraftBoard();
    }

    loadDraftBoard();
  }, [refreshDraftBoard]);

  useEffect(() => {
    if (activeView !== 'depth') return undefined;

    let cancelled = false;

    async function loadDepthChart() {
      setIsLoadingDepth(true);
      setDepthError('');

      try {
        const data = await playerApi.getTeamDepthChart({ teamId: selectedTeamId });
        if (cancelled) return;
        setDepthChart(data);
      } catch (err) {
        if (cancelled) return;
        setDepthError(err.message || 'Failed to load depth chart');
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
    if (activeView !== 'lookup' || !isSearchingPlayers) {
      setPlayerSearchRows([]);
      setPlayerSearchError('');
      setIsLoadingPlayerSearch(false);
      return undefined;
    }

    let cancelled = false;

    async function loadPlayerSearch() {
      setIsLoadingPlayerSearch(true);
      setPlayerSearchError('');

      try {
        const data = await playerApi.searchPlayers({
          q: normalizedPlayerSearchQuery,
          limit: SEARCH_LIMIT,
          leagueType: league?.config?.leagueType || null,
          rosterSlots: league?.config?.rosterSlots || {},
          filledSlots: {},
        });
        if (cancelled) return;

        setPlayerSearchRows(Array.isArray(data.players) ? data.players.map(toSearchRow) : []);
      } catch (err) {
        if (cancelled) return;
        setPlayerSearchRows([]);
        setPlayerSearchError(err.message || 'Failed to search players');
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
  }, [activeView, isSearchingPlayers, normalizedPlayerSearchQuery, league?.config?.leagueType, league?.config?.rosterSlots]);

  const teams = Array.isArray(draftState?.teams) ? draftState.teams : [];
  const picks = Array.isArray(draftState?.picks) ? draftState.picks : [];

  const draftedPlayerIds = useMemo(
    () => new Set(
      teams.flatMap((team) =>
        (Array.isArray(team.players) ? team.players : []).map((player) => String(player.playerId || '').trim()).filter(Boolean)
      )
    ),
    [teams]
  );

  const rosterRows = useMemo(
    () => teams.map((team) => ({
      teamKey: team.teamKey,
      teamName: team.teamName,
      spentBudget: Number(team.spentBudget || 0),
      budget: Number(team.budget || league?.config?.budget || 0),
      playerCount: Array.isArray(team.players) ? team.players.length : 0,
      players: Array.isArray(team.players) ? team.players : [],
    })),
    [league?.config?.budget, teams]
  );

  const teamNameByKey = useMemo(
    () => new Map(teams.map((team) => [team.teamKey, team.teamName || team.teamKey])),
    [teams]
  );

  const recentPicks = useMemo(() => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 12), [picks]);

  const rosterSlots = league?.config?.rosterSlots || {};
  const myTeamKey = draftState?.userTeamKey || teams[0]?.teamKey || '';
  const valuationTeamKey = resolveValuationTeamKey(teams, draftTargetTeamKey, myTeamKey);
  const draftTargetTeam = teams.find((team) => team.teamKey === valuationTeamKey) || null;

  const draftTeamOptions = useMemo(() => {
    const options = new Set(rows.map((row) => row.team).filter(Boolean));
    return ['ALL', ...Array.from(options).sort()];
  }, [rows]);

  const draftRoleOptions = useMemo(() => {
    const options = new Set(rows.flatMap((row) => parsePositionList(row.position)));
    return ['ALL', ...Array.from(options).sort()];
  }, [rows]);

  const valuationRowsById = useMemo(() => new Map(rows.map((row) => [String(row.id), row])), [rows]);

  useEffect(() => {
    if (activeView !== 'draft') return undefined;

    const normalizedLookupQuery = lookupQuery.trim();
    if (!normalizedLookupQuery) {
      setDraftSearchRows([]);
      setDraftSearchError('');
      setIsLoadingDraftSearch(false);
      return undefined;
    }

    let cancelled = false;

    async function loadDraftSearch() {
      setIsLoadingDraftSearch(true);
      setDraftSearchError('');

      try {
        const data = await playerApi.searchPlayers({
          q: normalizedLookupQuery,
          limit: SEARCH_LIMIT,
          leagueType: league?.config?.leagueType || null,
          includeInactive: false,
          rosterSlots: league?.config?.rosterSlots || {},
          filledSlots: draftTargetTeam?.filledSlots || {},
        });
        if (cancelled) return;

        const searchedRows = Array.isArray(data.players)
          ? data.players.map((player) => toDraftSearchRow(player, valuationRowsById))
          : [];
        setDraftSearchRows(searchedRows);
      } catch (err) {
        if (cancelled) return;
        setDraftSearchRows([]);
        setDraftSearchError(err.message || 'Failed to search draft players');
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
  }, [activeView, draftTargetTeamKey, league?.config?.leagueType, league?.config?.rosterSlots, lookupQuery, valuationRowsById, draftTargetTeam]);

  const filteredDraftRows = useMemo(() => {
    const sourceRows = lookupQuery.trim() ? draftSearchRows : rows;
    return sourceRows.filter((row) => {
      if (draftedPlayerIds.has(String(row.id))) return false;
      if (draftTeamFilter !== 'ALL' && row.team !== draftTeamFilter) return false;
      if (draftRoleFilter !== 'ALL' && !parsePositionList(row.position).includes(draftRoleFilter)) return false;
      if (draftNeedFilter === 'YES' && !row.fillsNeed) return false;
      if (draftNeedFilter === 'NO' && row.fillsNeed) return false;
      return true;
    });
  }, [draftNeedFilter, draftRoleFilter, draftSearchRows, draftTeamFilter, draftedPlayerIds, lookupQuery, rows]);

  const selectedDraftPlayer = filteredDraftRows.find((row) => row.id === selectedDraftPlayerId)
    || rows.find((row) => row.id === selectedDraftPlayerId)
    || null;

  const draftEligibleSlots = useMemo(
    () => getDraftEligibleSlots(selectedDraftPlayer, rosterSlots),
    [selectedDraftPlayer, rosterSlots]
  );

  const lookupRows = useMemo(() => {
    const search = lookupQuery.trim().toLowerCase();
    if (!search) return rows;

    return rows.filter((row) =>
      [row.name, row.team, row.position, String(row.mlbPlayerId || '')].join(' ').toLowerCase().includes(search)
    );
  }, [lookupQuery, rows]);

  useEffect(() => {
    if (!draftTargetTeamKey) {
      setDraftTargetTeamKey(myTeamKey);
    }
  }, [draftTargetTeamKey, myTeamKey]);

  useEffect(() => {
    if (!selectedDraftPlayer || !draftTargetTeam) {
      setDraftAssignedSlot('');
      return;
    }

    const nextSlot = getDefaultAssignedSlot(selectedDraftPlayer, draftTargetTeam, rosterSlots);
    setDraftAssignedSlot((current) => (current && draftEligibleSlots.includes(current) ? current : nextSlot));
  }, [draftEligibleSlots, draftTargetTeam, rosterSlots, selectedDraftPlayer]);

  function handleSelectDraftPlayer(row) {
    setSelectedDraftPlayerId(row.id);
    setDraftActionError('');
    setDraftCost(String(row.adjustedValue || row.marketValue || 0));
  }

 async function handleDraftPlayer() {
  if (!selectedDraftPlayer || !draftTargetTeam) {
    setDraftActionError('Select a player and target team.');
    return;
  }

  if (draftedPlayerIds.has(String(selectedDraftPlayer.id))) {
    setDraftActionError(`${selectedDraftPlayer.name} has already been drafted.`);
    return;
  }

  const numericCost = Number(draftCost);
  if (!Number.isFinite(numericCost) || numericCost < 0) {
    setDraftActionError('Cost must be a non-negative number.');
    return;
  }

  if (!draftAssignedSlot) {
    setDraftActionError('Choose a roster slot for this player.');
    return;
  }

  if (getOpenCountForSlot(draftTargetTeam, draftAssignedSlot, rosterSlots) <= 0) {
    setDraftActionError(`${draftAssignedSlot} is already full for ${draftTargetTeam.teamName}.`);
    return;
  }

  try {
    setIsSavingDraftAction(true);
    setDraftActionError('');

    const selectedContract = contract || getDraftContract('DRAFTED');

    const updatedTeams = teams.map((team) => {
      const existingPlayers = Array.isArray(team.players)
        ? team.players.filter((player) => String(player.playerId) !== selectedDraftPlayer.id)
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
        filledSlots[draftAssignedSlot] = Number(filledSlots[draftAssignedSlot] || 0) + 1;
      }

      const countsAgainstBudget = true;
      const nextPlayers = [
        ...existingPlayers,
        {
          playerId: selectedDraftPlayer.id,
          playerName: selectedDraftPlayer.name,
          cost: numericCost,
          status: 'DRAFTED',
          countsAgainstBudget,
          assignedSlot: draftAssignedSlot,
          assignedSlots,
          contract: selectedContract,
        },
      ];

      return {
        ...team,
        spentBudget: nextPlayers.reduce(
          (sum, player) => sum + (player.countsAgainstBudget === false ? 0 : Number(player.cost || 0)),
          0
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
        round: getDraftPickRound(nextPickNumber, league?.config?.teamCount || teams.length || 1),
        teamKey: draftTargetTeam.teamKey,
        playerId: selectedDraftPlayer.id,
        playerName: selectedDraftPlayer.name,
        cost: numericCost,
        status: 'DRAFTED',
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
    });

    setSelectedDraftPlayerId('');
    setDraftAssignedSlot('');
    setDraftCost('');
    await refreshDraftBoard({ silent: true });
  } catch (err) {
    setDraftActionError(err.message || 'Failed to save draft action');
  } finally {
    setIsSavingDraftAction(false);
  }
}

  async function handleUndoLastPick() {
    const currentPicks = Array.isArray(draftState?.picks) ? draftState.picks : [];
    const lastPick = currentPicks[currentPicks.length - 1];

    if (!lastPick) {
      setDraftActionError('No picks to undo.');
      return;
    }

    try {
      setIsUndoingLastPick(true);
      setDraftActionError('');

      const updatedTeams = teams.map((team) => {
        if (team.teamKey !== lastPick.teamKey) {
          return team;
        }

        const nextPlayers = Array.isArray(team.players) ? [...team.players] : [];
        const playerIndex = nextPlayers.findIndex((player) => String(player.playerId) === String(lastPick.playerId));

        if (playerIndex === -1) {
          return team;
        }

        const [removedPlayer] = nextPlayers.splice(playerIndex, 1);
        const filledSlots = { ...(team.filledSlots || {}) };

        for (const slot of getPersistedAssignedSlots(removedPlayer)) {
          filledSlots[slot] = Math.max(0, Number(filledSlots[slot] || 0) - 1);
        }

        return {
          ...team,
          spentBudget: nextPlayers.reduce((sum, player) => sum + (player.countsAgainstBudget === false ? 0 : Number(player.cost || 0)), 0),
          filledSlots,
          players: nextPlayers,
        };
      });

      await leagueApi.updateDraftState(leagueId, {
        userTeamKey: draftState?.userTeamKey,
        nominationTeamKey: draftState?.nominationTeamKey,
        currentPickNumber: Math.max(1, Number(draftState?.currentPickNumber || 1) - 1),
        teams: updatedTeams,
        picks: currentPicks.slice(0, -1),
      });

      if (String(selectedDraftPlayerId) === String(lastPick.playerId)) {
        setSelectedDraftPlayerId('');
        setDraftAssignedSlot('');
        setDraftCost('');
      }

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || 'Failed to undo last pick');
    } finally {
      setIsUndoingLastPick(false);
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
    handleUndoLastPick,
    isUndoingLastPick,
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
    setContract
  };
}


