import { useEffect, useMemo, useState } from 'react';
import { draftkitApi } from 'lib/draftkitApi';
import { leagueApi } from 'lib/leagueApi';
import { playerApi } from 'lib/playerApi';
import {
  boardToDraftStateTeams,
  buildRowPlan,
  createEmptyKeeperEntry,
  draftStateTeamsToBoard,
  getDraftStatePlayerIds,
  isEntryEmpty,
} from './keeperPageUtils';

export default function useKeeperPageData({ leagueId, selectedPlayer }) {
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
        setLoadingError(loadError.message || 'Failed to load keeper data');
      });
  }, [leagueId]);

  const teams = draftState?.teams || [];
  const config = league?.config || null;

  const teamOptions = useMemo(
    () =>
      teams.map((team) => ({
        key: team.teamKey,
        label: team.teamName || team.teamKey,
      })),
    [teams]
  );

  const rowPlan = useMemo(() => buildRowPlan(config?.rosterSlots || {}), [config]);

  useEffect(() => {
    setBoard(draftStateTeamsToBoard(teams));
  }, [teams]);

  useEffect(() => {
    if (!selectedTeamKey || !teamOptions.some((team) => team.key === selectedTeamKey)) {
      setSelectedTeamKey(teamOptions[0]?.key || '');
    }
  }, [selectedTeamKey, teamOptions]);

  const draftStatePlayerIds = useMemo(() => getDraftStatePlayerIds(teams), [teams]);

  useEffect(() => {
    const missingIds = draftStatePlayerIds.filter((id) => !playerPool[id]);
    if (!missingIds.length) return;

    Promise.all(missingIds.map((playerId) => playerApi.getPlayerById(playerId)))
      .then((results) => {
        setPlayerPool((current) => {
          const next = { ...current };
          for (const result of results) {
            const player = result?.player || result;
            const id = player?.mlbPlayerId ?? player?.playerId;
            if (id != null) next[Number(id)] = player;
          }
          return next;
        });
      })
      .catch((loadError) => {
        console.error('Failed to hydrate keeper player pool', loadError);
      });
  }, [draftStatePlayerIds, playerPool]);

  function updateEntry(teamKey, slot, slotIndex, updates) {
    setBoard((current) => {
      const teamRows = current[teamKey] || [];
      const existingIndex = teamRows.findIndex((row) => row.slot === slot && row.slotIndex === slotIndex);
      const existingEntry = existingIndex >= 0 ? teamRows[existingIndex] : createEmptyKeeperEntry(slot, slotIndex);

      const nextEntry = { ...existingEntry, ...updates };
      const nextTeamRows = [...teamRows];

      if (isEntryEmpty(nextEntry)) {
        return {
          ...current,
          [teamKey]: teamRows.filter((row) => !(row.slot === slot && row.slotIndex === slotIndex)),
        };
      }

      if (existingIndex >= 0) {
        nextTeamRows[existingIndex] = nextEntry;
      } else {
        nextTeamRows.push(nextEntry);
      }

      return {
        ...current,
        [teamKey]: nextTeamRows,
      };
    });
  }

  function handlePlayerClick(teamKey, slot, slotIndex) {
    if (!selectedPlayer?.mlbPlayerId) return;

    setPlayerPool((current) => ({
      ...current,
      [Number(selectedPlayer.mlbPlayerId)]: selectedPlayer,
    }));

    updateEntry(teamKey, slot, slotIndex, {
      playerId: Number(selectedPlayer.mlbPlayerId),
      playerName: selectedPlayer.name || selectedPlayer.canonicalName || '',
      status: 'KEEPER',
      cost: '',
      contract: '',
      countsAgainstBudget: slot !== 'BN',
    });
  }

  function clearEntry(teamKey, slot, slotIndex) {
    updateEntry(teamKey, slot, slotIndex, {
      playerId: null,
      playerName: '',
      contract: '',
      cost: '',
      countsAgainstBudget: true,
    });
  }

  const budgets = useMemo(() => {
    const result = {};
    for (const team of teams) {
      const rows = board[team.teamKey] || [];
      const budget = Number(team.budget || 260);

      const spent = rows.reduce((sum, row) => {
        const cost = Number(row.cost);
        return row.countsAgainstBudget && row.cost !== '' && Number.isFinite(cost) ? sum + cost : sum;
      }, 0);

      result[team.teamKey] = {
        budget,
        spent,
        remaining: budget - spent,
      };
    }
    return result;
  }, [board, teams]);

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
        setBoard(draftStateTeamsToBoard(response.draftState.teams || []));
        setDraftState(response.draftState);
      }
    } catch (saveErrorValue) {
      setSaveError(saveErrorValue.message || 'Failed to save keepers');
    } finally {
      setSaving(false);
    }
  }

  const selectedTeam = teams.find((team) => team.teamKey === selectedTeamKey) || teams[0] || null;
  const currentRows = board[selectedTeamKey] || [];
  const selectedBudget = budgets[selectedTeamKey];

  return {
    board,
    config,
    currentRows,
    draftState,
    league,
    loadingError,
    playerPool,
    rowPlan,
    saveError,
    saving,
    selectedBudget,
    selectedTeam,
    selectedTeamKey,
    setSelectedTeamKey,
    teamOptions,
    clearEntry,
    handlePlayerClick,
    handleSaveBoard,
    updateEntry,
  };
}
