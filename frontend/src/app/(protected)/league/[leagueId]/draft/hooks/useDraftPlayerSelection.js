import { useEffect, useMemo, useState } from "react";
import { leagueApi } from "lib/leagueApi";
import {
  getDefaultAssignedSlot,
  getDraftContract,
  getDraftEligibleSlots,
  getDraftPickRound,
  getOpenCountForSlot,
} from "../draftPageUtils";
import { buildDraftSnapshot } from "./draftSnapshotUtils";

export function useDraftPlayerSelection({
  leagueId,
  league,
  draftState,
  teams,
  draftedPlayerIds,
  draftTargetTeam,
  myTeamKey,
  rosterSlots,
  filteredDraftRows,
  rows,
  refreshDraftBoard,
  recordAction,
  draftTargetTeamKey,
  setDraftTargetTeamKey,
}) {
  const [selectedDraftPlayerId, setSelectedDraftPlayerId] = useState("");
  const [draftAssignedSlot, setDraftAssignedSlot] = useState("");
  const [draftCost, setDraftCost] = useState("");
  const [contract, setContract] = useState("F3");
  const [draftActionError, setDraftActionError] = useState("");
  const [isSavingDraftAction, setIsSavingDraftAction] = useState(false);
  const [customDraftPlayer, setCustomDraftPlayer] = useState(null);

  const selectedDraftPlayer =
    customDraftPlayer ||
    filteredDraftRows.find((row) => row.id === selectedDraftPlayerId) ||
    rows.find((row) => row.id === selectedDraftPlayerId) ||
    null;

  const draftEligibleSlots = useMemo(
    () => getDraftEligibleSlots(selectedDraftPlayer, rosterSlots),
    [selectedDraftPlayer, rosterSlots],
  );

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

  function clearDraftSelection() {
    setSelectedDraftPlayerId("");
    setCustomDraftPlayer(null);
    setDraftAssignedSlot("");
    setDraftCost("");
  }

  async function handleDraftPlayer() {
    if (!selectedDraftPlayer || !draftTargetTeam) {
      setDraftActionError("Select a player and target team.");
      return;
    }

    if (
      !selectedDraftPlayer.isCustomPlayer &&
      draftedPlayerIds.has(String(selectedDraftPlayer.id))
    ) {
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

      clearDraftSelection();
      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to save draft action");
    } finally {
      setIsSavingDraftAction(false);
    }
  }

  return {
    selectedDraftPlayerId,
    selectedDraftPlayer,
    draftTargetTeamKey,
    setDraftTargetTeamKey,
    draftAssignedSlot,
    setDraftAssignedSlot,
    draftCost,
    setDraftCost,
    contract,
    setContract,
    draftActionError,
    setDraftActionError,
    isSavingDraftAction,
    customDraftPlayer,
    draftEligibleSlots,
    handleSelectDraftPlayer,
    handleSelectCustomDraftPlayer,
    handleCancelCustomDraftPlayer,
    handleDraftPlayer,
    clearDraftSelection,
  };
}
