import { useCallback, useEffect, useMemo, useState } from "react";
import { playerApi } from "lib/playerApi";
import { leagueApi } from "lib/leagueApi";
import { DRAFT_VALUATION_LIMIT } from "../draftPageConstants";
import {
  buildExcludedPlayersFromTeams,
  resolveValuationTeamKey,
  toValuationRow,
} from "../draftPageUtils";

export function useDraftCoreData({ leagueId, draftTargetTeamKey }) {
  const [rows, setRows] = useState([]);
  const [league, setLeague] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [draftError, setDraftError] = useState("");
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

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
          buildExcludedPlayersFromTeams(
            draftStateData.teams,
            valuationTeamKey,
          );

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
    refreshDraftBoard();
  }, [refreshDraftBoard]);

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

  return {
    league,
    draftState,
    rows,
    draftError,
    isLoadingDraft,
    refreshDraftBoard,
    teams,
    picks,
    redoStack,
    draftedPlayerIds,
    rosterRows,
    teamNameByKey,
    rosterSlots,
    myTeamKey,
    valuationTeamKey,
    draftTargetTeam,
  };
}
