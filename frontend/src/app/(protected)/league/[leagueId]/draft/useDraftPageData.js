import { useRef, useState } from "react";
import {
  getOpenCountForSlot,
  getPersistedAssignedSlots,
  sortDepthSlots,
} from "./draftPageUtils";
import { useDraftActionHistory } from "./hooks/useDraftActionHistory";
import { useDraftBoardSearch } from "./hooks/useDraftBoardSearch";
import { useDraftCoreData } from "./hooks/useDraftCoreData";
import { useDraftDepthChart } from "./hooks/useDraftDepthChart";
import { useDraftNotifications } from "./hooks/useDraftNotifications";
import { useDraftPlayerLookup } from "./hooks/useDraftPlayerLookup";
import { useDraftPlayerSelection } from "./hooks/useDraftPlayerSelection";
import { useRosterMoves } from "./hooks/useRosterMoves";

export default function useDraftPageData({ activeView, leagueId }) {
  const [selectedTeamId, setSelectedTeamId] = useState(113);
  const [draftTargetTeamKey, setDraftTargetTeamKey] = useState("");

  const core = useDraftCoreData({ leagueId, draftTargetTeamKey });

  const board = useDraftBoardSearch({
    activeView,
    rows: core.rows,
    leagueType: core.league?.config?.leagueType,
    rosterSlots: core.rosterSlots,
    draftTargetTeam: core.draftTargetTeam,
    draftTargetTeamKey,
    draftedPlayerIds: core.draftedPlayerIds,
  });

  const playerSelectionRef = useRef({});
  const rosterMovesRef = useRef({});

  const history = useDraftActionHistory({
    leagueId,
    draftState: core.draftState,
    refreshDraftBoard: core.refreshDraftBoard,
    onHistoryApplied: () => {
      playerSelectionRef.current.clearDraftSelection?.();
      rosterMovesRef.current.clearRosterMoveSelection?.();
    },
    setDraftActionError: (message) => {
      playerSelectionRef.current.setDraftActionError?.(message);
    },
    setRosterMoveError: (message) => {
      rosterMovesRef.current.setRosterMoveError?.(message);
    },
  });

  const player = useDraftPlayerSelection({
    leagueId,
    league: core.league,
    draftState: core.draftState,
    teams: core.teams,
    draftedPlayerIds: core.draftedPlayerIds,
    draftTargetTeam: core.draftTargetTeam,
    myTeamKey: core.myTeamKey,
    rosterSlots: core.rosterSlots,
    filteredDraftRows: board.filteredDraftRows,
    rows: core.rows,
    refreshDraftBoard: core.refreshDraftBoard,
    recordAction: history.recordAction,
    draftTargetTeamKey,
    setDraftTargetTeamKey,
  });

  const roster = useRosterMoves({
    leagueId,
    teams: core.teams,
    draftState: core.draftState,
    rosterSlots: core.rosterSlots,
    refreshDraftBoard: core.refreshDraftBoard,
    recordAction: history.recordAction,
  });

  playerSelectionRef.current = player;
  rosterMovesRef.current = roster;

  const depth = useDraftDepthChart({ activeView, selectedTeamId });

  const lookup = useDraftPlayerLookup({
    activeView,
    leagueType: core.league?.config?.leagueType,
    rosterSlots: core.rosterSlots,
  });

  const notifications = useDraftNotifications({ activeView });

  return {
    league: core.league,
    rows: core.rows,
    picks: core.picks,
    teams: core.teams,
    rosterRows: core.rosterRows,
    teamNameByKey: core.teamNameByKey,
    rosterSlots: core.rosterSlots,
    lookupQuery: board.lookupQuery,
    setLookupQuery: board.setLookupQuery,
    draftError: core.draftError,
    isLoadingDraft: core.isLoadingDraft,
    playerSearchQuery: lookup.playerSearchQuery,
    setPlayerSearchQuery: lookup.setPlayerSearchQuery,
    playerSearchRows: lookup.playerSearchRows,
    playerSearchError: lookup.playerSearchError,
    isLoadingPlayerSearch: lookup.isLoadingPlayerSearch,
    isSearchingPlayers: lookup.isSearchingPlayers,
    normalizedPlayerSearchQuery: lookup.normalizedPlayerSearchQuery,
    lookupRows: board.lookupRows,
    selectedTeamId,
    setSelectedTeamId,
    depthChart: depth.depthChart,
    depthError: depth.depthError,
    isLoadingDepth: depth.isLoadingDepth,
    filteredDraftRows: board.filteredDraftRows,
    draftSearchError: board.draftSearchError,
    isLoadingDraftSearch: board.isLoadingDraftSearch,
    draftNotification: notifications.draftNotification,
    dismissDraftNotification: notifications.dismissDraftNotification,
    draftTeamFilter: board.draftTeamFilter,
    setDraftTeamFilter: board.setDraftTeamFilter,
    draftRoleFilter: board.draftRoleFilter,
    setDraftRoleFilter: board.setDraftRoleFilter,
    draftNeedFilter: board.draftNeedFilter,
    setDraftNeedFilter: board.setDraftNeedFilter,
    draftTeamOptions: board.draftTeamOptions,
    draftRoleOptions: board.draftRoleOptions,
    selectedDraftPlayerId: player.selectedDraftPlayerId,
    selectedDraftPlayer: player.selectedDraftPlayer,
    draftActionError: player.draftActionError,
    handleSelectDraftPlayer: player.handleSelectDraftPlayer,
    handleSelectCustomDraftPlayer: player.handleSelectCustomDraftPlayer,
    handleCancelCustomDraftPlayer: player.handleCancelCustomDraftPlayer,
    handleSelectRosterMove: roster.handleSelectRosterMove,
    handleMoveRosterPlayer: roster.handleMoveRosterPlayer,
    handleUndo: history.handleUndo,
    handleRedo: history.handleRedo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    nextUndoDescription: history.nextUndoDescription,
    nextRedoDescription: history.nextRedoDescription,
    isProcessingHistory: history.isProcessingHistory,
    historyBanner: history.historyBanner,
    dismissHistoryBanner: history.dismissHistoryBanner,
    redoStack: core.redoStack,
    draftTargetTeamKey: player.draftTargetTeamKey,
    setDraftTargetTeamKey: player.setDraftTargetTeamKey,
    draftCost: player.draftCost,
    setDraftCost: player.setDraftCost,
    draftAssignedSlot: player.draftAssignedSlot,
    setDraftAssignedSlot: player.setDraftAssignedSlot,
    draftEligibleSlots: player.draftEligibleSlots,
    draftTargetTeam: core.draftTargetTeam,
    handleDraftPlayer: player.handleDraftPlayer,
    isSavingDraftAction: player.isSavingDraftAction,
    getOpenCountForSlot,
    getPersistedAssignedSlots,
    sortDepthSlots,
    contract: player.contract,
    setContract: player.setContract,
    selectedRosterMove: roster.selectedRosterMove,
    rosterMoveError: roster.rosterMoveError,
    isMovingRosterPlayer: roster.isMovingRosterPlayer,
    customDraftPlayer: player.customDraftPlayer,
  };
}
