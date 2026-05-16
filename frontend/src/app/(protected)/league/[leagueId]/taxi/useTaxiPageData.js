import { useEffect, useMemo, useState } from 'react';
import { draftkitApi } from 'lib/draftkitApi';
import { leagueApi } from 'lib/leagueApi';
import { playerApi } from 'lib/playerApi';
import { TAXI_SLOT } from './taxiPageConstants';
import {
  boardToDraftStateTeams,
  buildTaxiRowPlan,
  createEmptyTaxiEntry,
  createEmptyTaxiRows,
  draftStateTeamsToTaxiBoard,
  getTaxiPlayerIds,
  getTaxiSlotCount,
  isEntryEmpty,
} from './taxiPageUtils';

const EMPTY_TEAMS = [];
const EMPTY_ROSTER_SLOTS = {};

export default function useTaxiPageData({ leagueId, selectedPlayer, setSelectedPlayer }) {
  const [draftState, setDraftState] = useState(null);
  const [league, setLeague] = useState(null);
  const [board, setBoard] = useState({});
  const [playerPool, setPlayerPool] = useState({});
  const [selectedTeamKey, setSelectedTeamKey] = useState('');
  const [loadingError, setLoadingError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!leagueId) return;

    Promise.all([leagueApi.getDraftState(leagueId), draftkitApi.getLeague(leagueId)])
      .then(([draftStateResponse, leagueResponse]) => {
        setDraftState(draftStateResponse.draftState);
        setLeague(leagueResponse.league);
        setLoadingError('');
      })
      .catch((loadError) => {
        setLoadingError(loadError.message || 'Failed to load taxi data');
      });
  }, [leagueId]);

  const teams = draftState?.teams || EMPTY_TEAMS;
  const rosterSlots = league?.config?.rosterSlots || EMPTY_ROSTER_SLOTS;
  const taxiSlotCount = getTaxiSlotCount(rosterSlots);

  const teamOptions = useMemo(
    () =>
      teams.map((team) => ({
        key: team.teamKey,
        label: team.teamName || team.teamKey,
      })),
    [teams]
  );

  const rowPlan = useMemo(() => buildTaxiRowPlan(rosterSlots), [rosterSlots]);

  useEffect(() => {
    setBoard(draftStateTeamsToTaxiBoard(teams, rosterSlots));
  }, [teams, rosterSlots]);

  useEffect(() => {
    if (!selectedTeamKey || !teamOptions.some((team) => team.key === selectedTeamKey)) {
      setSelectedTeamKey(teamOptions[0]?.key || '');
    }
  }, [selectedTeamKey, teamOptions]);

  const taxiPlayerIds = useMemo(() => getTaxiPlayerIds(teams), [teams]);

  useEffect(() => {
    const missingIds = taxiPlayerIds.filter((id) => !playerPool[id]);
    if (!missingIds.length) return;

    playerApi.listPlayers({ limit: 500, includeInactive: true })
      .then((results) => {
        const players = Array.isArray(results?.players) ? results.players : [];

        setPlayerPool((current) => {
          const next = { ...current };

          for (const player of players) {
            const id = Number(player?.mlbPlayerId ?? player?.playerId);
            if (!Number.isInteger(id)) continue;
            if (!missingIds.includes(id)) continue;
            next[id] = player;
          }

          return next;
        });
      })
      .catch((loadError) => {
        console.error('Failed to hydrate taxi player pool', loadError);
      });
  }, [taxiPlayerIds, playerPool]);

  function updateEntry(teamKey, slotIndex, updates) {
    setBoard((current) => {
      const teamRows = current[teamKey] || createEmptyTaxiRows(rosterSlots);
      const existingIndex = teamRows.findIndex((row) => row.slotIndex === slotIndex);
      const existingEntry =
        existingIndex >= 0 ? teamRows[existingIndex] : createEmptyTaxiEntry(slotIndex);
      const nextEntry = {
        ...existingEntry,
        ...updates,
        slot: TAXI_SLOT,
        status: 'TAXI',
        taxiSlot: slotIndex,
      };
      const nextTeamRows = [...teamRows];

      if (isEntryEmpty(nextEntry)) {
        nextTeamRows[slotIndex] = createEmptyTaxiEntry(slotIndex);

        return {
          ...current,
          [teamKey]: nextTeamRows,
        };
      }

      nextTeamRows[slotIndex] = nextEntry;

      return {
        ...current,
        [teamKey]: nextTeamRows,
      };
    });
  }

  function handlePlayerClick(teamKey, slotIndex) {
    if (!selectedPlayer?.mlbPlayerId) return;

    setSaveError('');
    setPlayerPool((current) => ({
      ...current,
      [Number(selectedPlayer.mlbPlayerId)]: selectedPlayer,
    }));

    updateEntry(teamKey, slotIndex, {
      playerId: Number(selectedPlayer.mlbPlayerId),
      playerName: selectedPlayer.name || selectedPlayer.canonicalName || '',
    });

    setSelectedPlayer?.(null);
  }

  function clearEntry(teamKey, slotIndex) {
    updateEntry(teamKey, slotIndex, {
      playerId: null,
      playerName: '',
    });
  }

  async function handleSaveBoard() {
    try {
      setSaving(true);
      setSaveError('');

      const updatedTeams = boardToDraftStateTeams(board, teams);
      const response = await leagueApi.updateDraftState(leagueId, {
        ...draftState,
        teams: updatedTeams,
      });

      if (response?.draftState) {
        setBoard(draftStateTeamsToTaxiBoard(response.draftState.teams || [], rosterSlots));
        setDraftState(response.draftState);
      }
    } catch (saveErrorValue) {
      setSaveError(saveErrorValue.message || 'Failed to save taxi board');
    } finally {
      setSaving(false);
    }
  }

  const selectedTeam = teams.find((team) => team.teamKey === selectedTeamKey) || teams[0] || null;
  const currentRows = board[selectedTeamKey] || createEmptyTaxiRows(rosterSlots);
  const filledCount = currentRows.filter((row) => row?.playerId).length;

  return {
    board,
    currentRows,
    draftState,
    filledCount,
    league,
    loadingError,
    playerPool,
    rowPlan,
    saveError,
    saving,
    selectedTeam,
    selectedTeamKey,
    setSelectedTeamKey,
    teamOptions,
    taxiSlotCount,
    clearEntry,
    handlePlayerClick,
    handleSaveBoard,
    updateEntry,
  };
}
