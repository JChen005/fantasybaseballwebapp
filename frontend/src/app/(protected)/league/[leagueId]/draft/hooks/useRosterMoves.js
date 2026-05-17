import { useRef, useState } from "react";
import { playerApi } from "lib/playerApi";
import { leagueApi } from "lib/leagueApi";
import {
  getDraftEligibleSlots,
  getOpenCountForSlot,
  getPersistedAssignedSlots,
  toSearchRow,
} from "../draftPageUtils";
import { buildDraftSnapshot } from "./draftSnapshotUtils";

function getRosterMoveEligibleSlots(player, rosterSlots) {
  const eligibleSlots = getDraftEligibleSlots(toSearchRow(player), rosterSlots);
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

export function useRosterMoves({
  leagueId,
  teams,
  draftState,
  rosterSlots,
  refreshDraftBoard,
  recordAction,
}) {
  const [selectedRosterMove, setSelectedRosterMove] = useState(null);
  const [rosterMoveError, setRosterMoveError] = useState("");
  const [isMovingRosterPlayer, setIsMovingRosterPlayer] = useState(false);
  const rosterMoveSelectionKeyRef = useRef("");

  function clearRosterMoveSelection() {
    rosterMoveSelectionKeyRef.current = "";
    setSelectedRosterMove(null);
  }

  async function handleSelectRosterMove(teamKey, player, slot, slotIndex) {
    if (!player?.playerId) return;

    const isSamePlayer =
      selectedRosterMove?.teamKey === teamKey &&
      String(selectedRosterMove?.playerId) === String(player.playerId) &&
      selectedRosterMove?.slot === slot &&
      selectedRosterMove?.slotIndex === slotIndex;

    if (isSamePlayer) {
      clearRosterMoveSelection();
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
      const eligibleSlots = getRosterMoveEligibleSlots(fullPlayer, rosterSlots);

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
      clearRosterMoveSelection();
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

      clearRosterMoveSelection();
      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setRosterMoveError(err.message || "Failed to move player");
    } finally {
      setIsMovingRosterPlayer(false);
    }
  }

  return {
    selectedRosterMove,
    rosterMoveError,
    setRosterMoveError,
    isMovingRosterPlayer,
    handleSelectRosterMove,
    handleMoveRosterPlayer,
    clearRosterMoveSelection,
    rosterMoveSelectionKeyRef,
  };
}
