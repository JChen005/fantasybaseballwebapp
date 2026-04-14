'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { playerApi } from 'lib/playerApi';
import { leagueApi } from 'lib/leagueApi';
import SideBar from 'components/sidebar';

const SEARCH_LIMIT = 50;
const DRAFT_VALUATION_LIMIT = 500;

const DRAFT_VIEW_TABS = [
  { id: 'draft', label: 'Draft Board' },
  { id: 'recent', label: 'Recent Picks' },
  { id: 'roster', label: 'Team Roster' },
  { id: 'budget', label: 'Budget' },
  { id: 'lookup', label: 'Player Lookup' },
  { id: 'pool', label: 'Valuation Pool' },
  { id: 'depth', label: 'Player Depth' },
];

const MLB_DEPTH_CHART_TEAMS = [
  { id: 108, code: 'LAA', label: 'Angels' },
  { id: 109, code: 'AZ', label: 'Diamondbacks' },
  { id: 110, code: 'BAL', label: 'Orioles' },
  { id: 111, code: 'BOS', label: 'Red Sox' },
  { id: 112, code: 'CHC', label: 'Cubs' },
  { id: 113, code: 'CIN', label: 'Reds' },
  { id: 114, code: 'CLE', label: 'Guardians' },
  { id: 115, code: 'COL', label: 'Rockies' },
  { id: 116, code: 'DET', label: 'Tigers' },
  { id: 117, code: 'HOU', label: 'Astros' },
  { id: 118, code: 'KC', label: 'Royals' },
  { id: 119, code: 'LAD', label: 'Dodgers' },
  { id: 120, code: 'WSH', label: 'Nationals' },
  { id: 121, code: 'NYM', label: 'Mets' },
  { id: 133, code: 'OAK', label: 'Athletics' },
  { id: 134, code: 'PIT', label: 'Pirates' },
  { id: 135, code: 'SD', label: 'Padres' },
  { id: 136, code: 'SEA', label: 'Mariners' },
  { id: 137, code: 'SF', label: 'Giants' },
  { id: 138, code: 'STL', label: 'Cardinals' },
  { id: 139, code: 'TB', label: 'Rays' },
  { id: 140, code: 'TEX', label: 'Rangers' },
  { id: 141, code: 'TOR', label: 'Blue Jays' },
  { id: 142, code: 'MIN', label: 'Twins' },
  { id: 143, code: 'PHI', label: 'Phillies' },
  { id: 144, code: 'ATL', label: 'Braves' },
  { id: 145, code: 'CWS', label: 'White Sox' },
  { id: 146, code: 'MIA', label: 'Marlins' },
  { id: 147, code: 'NYY', label: 'Yankees' },
  { id: 158, code: 'MIL', label: 'Brewers' },
];

function resolveDraftView(rawView) {
  return DRAFT_VIEW_TABS.some((tab) => tab.id === rawView) ? rawView : 'draft';
}

function getDraftViewHref(leagueId, viewId) {
  if (viewId === 'draft') {
    return `/league/${leagueId}/draft`;
  }

  return `/league/${leagueId}/draft?view=${viewId}`;
}

function formatAverage(value) {
  return typeof value === 'number' ? value.toFixed(3) : '---';
}

function normalizeRosterSlot(position) {
  const normalized = String(position || '').trim().toUpperCase();

  if (!normalized) return '';
  if (normalized === '1B' || normalized === '3' || normalized === 'FIRSTBASE') return '1B';
  if (normalized === '2B' || normalized === '4' || normalized === 'SECONDBASE') return '2B';
  if (normalized === '3B' || normalized === '5' || normalized === 'THIRDBASE') return '3B';
  if (normalized === 'C' || normalized === '2' || normalized === 'CATCHER') return 'C';
  if (normalized === 'SS' || normalized === '6' || normalized === 'SHORTSTOP') return 'SS';
  if (
    normalized === 'LF' ||
    normalized === 'CF' ||
    normalized === 'RF' ||
    normalized === 'OF' ||
    normalized === '7' ||
    normalized === '8' ||
    normalized === '9' ||
    normalized === 'OUTFIELDER'
  ) {
    return 'OF';
  }
  if (
    normalized === 'SP' ||
    normalized === 'RP' ||
    normalized === 'CP' ||
    normalized === 'P' ||
    normalized === '1' ||
    normalized === 'PITCHER'
  ) {
    return 'P';
  }
  if (normalized === 'DH' || normalized === 'UT' || normalized === 'UTIL' || normalized === 'DESIGNATEDHITTER') {
    return 'UTIL';
  }
  if (normalized === 'TWOWAYPLAYER' || normalized === 'TWP' || normalized === 'Y') return 'TWOWAYPLAYER';

  return '';
}

function formatPlayerPositions(positions) {
  const rawPositions = Array.isArray(positions) ? positions : [];
  const normalizedPositions = new Set(rawPositions.map(normalizeRosterSlot).filter(Boolean));
  const displayPositions = [];

  if (normalizedPositions.has('C')) displayPositions.push('C');
  if (normalizedPositions.has('1B')) displayPositions.push('1B');
  if (normalizedPositions.has('2B')) displayPositions.push('2B');
  if (normalizedPositions.has('3B')) displayPositions.push('3B');
  if (normalizedPositions.has('SS')) displayPositions.push('SS');
  if (normalizedPositions.has('OF')) displayPositions.push('OF');
  if (normalizedPositions.has('P') || normalizedPositions.has('TWOWAYPLAYER')) displayPositions.push('P');

  const hitterEligible = displayPositions.some((position) => ['C', '1B', '2B', '3B', 'SS', 'OF'].includes(position));
  const pitcherEligible = displayPositions.includes('P');
  if (hitterEligible || normalizedPositions.has('UTIL') || normalizedPositions.has('TWOWAYPLAYER')) {
    if (!(pitcherEligible && !hitterEligible && !normalizedPositions.has('TWOWAYPLAYER'))) {
      displayPositions.push('UTIL');
    }
  }

  return displayPositions.length ? displayPositions.join(', ') : 'N/A';
}

function buildPlayerRow(player) {
  const neededSlots = Array.isArray(player.neededSlots) ? player.neededSlots : [];
  const position = Array.isArray(player.displayPositions) && player.displayPositions.length
    ? player.displayPositions.join(', ')
    : formatPlayerPositions(player.positions);

  return {
    id: String(player.mlbPlayerId || player._id),
    name: player.name || 'Unknown player',
    team: player.team || 'FA',
    position,
    fillsNeed: Boolean(player.fillsNeed),
    neededSlots,
    mlbPlayerId: player.mlbPlayerId,
    headshotUrl: player.headshotUrl,
  };
}

function toValuationRow(player) {
  return {
    ...buildPlayerRow(player),
    marketValue: player.marketValue || 0,
    adjustedValue: player.adjustedValue || 0,
  };
}

function toSearchRow(player) {
  return {
    ...buildPlayerRow(player),
    avgLastYear: formatAverage(player.statsLastYear?.avg),
    avg3yr: formatAverage(player.stats3Year?.avg),
  };
}

function toDraftSearchRow(player, valuationRowsById) {
  const fallbackRow = toSearchRow(player);
  const matchingValuationRow = valuationRowsById.get(String(fallbackRow.id));

  return {
    ...fallbackRow,
    adjustedValue: matchingValuationRow?.adjustedValue ?? null,
    marketValue: matchingValuationRow?.marketValue ?? null,
    fillsNeed: matchingValuationRow?.fillsNeed ?? Boolean(player.fillsNeed),
    neededSlots: matchingValuationRow?.neededSlots ?? fallbackRow.neededSlots,
  };
}

function sortDepthSlots(slots) {
  return [...slots].sort((left, right) => {
    const leftPitcher = left.normalizedSlot === 'P' ? 1 : 0;
    const rightPitcher = right.normalizedSlot === 'P' ? 1 : 0;
    if (leftPitcher !== rightPitcher) return leftPitcher - rightPitcher;
    return left.slot.localeCompare(right.slot);
  });
}

function buildExcludedPlayersFromTeams(teams, userTeamKey) {
  const safeTeams = Array.isArray(teams) ? teams : [];
  const myTeamState = safeTeams.find((team) => team.teamKey === userTeamKey) || safeTeams[0];
  const otherTeamStates = safeTeams.filter((team) => team.teamKey !== myTeamState?.teamKey);

  return {
    myTeamState,
    excludedPlayers: [
      ...((myTeamState?.players || []).map((player) => ({
        playerId: player.playerId,
        status: player.status,
        cost: player.cost,
        countsAgainstBudget: player.countsAgainstBudget !== false,
      }))),
      ...otherTeamStates.flatMap((team) =>
        (team.players || []).map((player) => ({
          playerId: player.playerId,
          status: player.status,
          cost: player.cost,
          countsAgainstBudget: false,
        }))
      ),
    ],
  };
}

function getDraftContract(status = 'DRAFTED') {
  return status === 'KEEPER' ? 'F1' : 'X';
}

function parsePositionList(positionText) {
  return String(positionText || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getDraftEligibleSlots(row, rosterSlots = {}) {
  const configuredSlots = new Set(Object.keys(rosterSlots || {}));
  return parsePositionList(row?.position).filter((slot) => configuredSlots.has(slot));
}

function getOpenCountForSlot(team, slot, rosterSlots = {}) {
  const total = Number(rosterSlots?.[slot] || 0);
  const filled = Number(team?.filledSlots?.[slot] || 0);
  return Math.max(0, total - filled);
}

function getDefaultAssignedSlot(row, team, rosterSlots = {}) {
  const eligibleSlots = getDraftEligibleSlots(row, rosterSlots);
  const openEligibleSlot = eligibleSlots.find((slot) => getOpenCountForSlot(team, slot, rosterSlots) > 0);
  return openEligibleSlot || eligibleSlots[0] || '';
}

function getPersistedAssignedSlots(player) {
  if (Array.isArray(player?.assignedSlots) && player.assignedSlots.length) {
    return player.assignedSlots.map((slot) => normalizeRosterSlot(slot)).filter(Boolean);
  }

  const assignedSlot = normalizeRosterSlot(player?.assignedSlot);
  return assignedSlot ? [assignedSlot] : [];
}

function getDraftPickRound(currentPickNumber, teamCount) {
  const teams = Math.max(1, Number(teamCount) || 1);
  return Math.floor((Math.max(1, Number(currentPickNumber) || 1) - 1) / teams) + 1;
}

function PlayerCell({ row, href = null }) {
  const content = (
    <div className="flex items-center gap-3">
      {row.headshotUrl ? (
        <img
          src={row.headshotUrl}
          alt={row.name}
          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
        />
      ) : null}
      <div>
        <div>{row.name}</div>
        <div className="text-xs font-normal text-slate-500">{row.team || 'No Team'}</div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-lg px-1 py-1 transition hover:bg-white/5">
      {content}
    </Link>
  );
}

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const activeView = resolveDraftView(searchParams?.get('view'));

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

      const myTeamKey = draftStateData.userTeamKey || draftStateData.teams?.[0]?.teamKey || '';
      const { myTeamState, excludedPlayers } = buildExcludedPlayersFromTeams(draftStateData.teams, myTeamKey);

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
          filledSlots: myTeamState?.filledSlots || {},
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
  }, [leagueId]);

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
  }, [activeView, isSearchingPlayers, normalizedPlayerSearchQuery, league?.config?.leagueType]);

  const teams = Array.isArray(draftState?.teams) ? draftState.teams : [];
  const picks = Array.isArray(draftState?.picks) ? draftState.picks : [];
  const draftedPlayerIds = useMemo(
    () =>
      new Set(
        teams.flatMap((team) =>
          (Array.isArray(team.players) ? team.players : []).map((player) => String(player.playerId || '').trim()).filter(Boolean)
        )
      ),
    [teams]
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
    [league?.config?.budget, teams]
  );
  const teamNameByKey = useMemo(
    () =>
      new Map(
        teams.map((team) => [team.teamKey, team.teamName || team.teamKey])
      ),
    [teams]
  );

  const recentPicks = useMemo(() => [...picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 12), [picks]);

  const rosterSlots = league?.config?.rosterSlots || {};
  const myTeamKey = draftState?.userTeamKey || teams[0]?.teamKey || '';
  const draftTargetTeam = teams.find((team) => team.teamKey === draftTargetTeamKey) || teams.find((team) => team.teamKey === myTeamKey) || teams[0] || null;
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
  }, [activeView, draftTargetTeamKey, league?.config?.leagueType, lookupQuery, valuationRowsById]);
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

      const updatedTeams = teams.map((team) => {
        const existingPlayers = Array.isArray(team.players) ? team.players.filter((player) => String(player.playerId) !== selectedDraftPlayer.id) : [];
        const filledSlots = { ...(team.filledSlots || {}) };

        if (team.teamKey !== draftTargetTeam.teamKey) {
          return {
            ...team,
            players: existingPlayers,
          };
        }

        const assignedSlots = draftAssignedSlot ? [draftAssignedSlot] : [];
        if (assignedSlots.length) {
          filledSlots[draftAssignedSlot] = (Number(filledSlots[draftAssignedSlot] || 0) + 1);
        }

        const countsAgainstBudget = true;
        const contract = getDraftContract('DRAFTED');
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
            contract,
          },
        ];

        return {
          ...team,
          spentBudget: nextPlayers.reduce((sum, player) => sum + (player.countsAgainstBudget === false ? 0 : Number(player.cost || 0)), 0),
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

  return (
    <section className="space-y-4">
      <SideBar />

      <div className="panel">
        <h1 className="text-2xl font-semibold">League / Draft</h1>
      </div>

      <div className="panel">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Draft Views</p>
        <nav className="mt-3 flex flex-wrap gap-2.5" aria-label="Draft view tabs">
          {DRAFT_VIEW_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={getDraftViewHref(leagueId, tab.id)}
              className={`rounded-[1rem] border px-3.5 py-2.5 text-sm font-semibold transition ${
                activeView === tab.id
                  ? 'border-emerald-300/70 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
                  : 'border-slate-300/20 bg-slate-300/7 text-slate-100 hover:bg-slate-200/12'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {activeView === 'draft' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <div className="panel">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">Draft Board</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-white">Search</span>
                  <input
                    className="input"
                    value={lookupQuery}
                    onChange={(event) => setLookupQuery(event.target.value)}
                    placeholder="Player name, team, role"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-white">Team</span>
                  <select className="input" value={draftTeamFilter} onChange={(event) => setDraftTeamFilter(event.target.value)}>
                    {draftTeamOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'ALL' ? 'All Teams' : option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-white">Role</span>
                  <select className="input" value={draftRoleFilter} onChange={(event) => setDraftRoleFilter(event.target.value)}>
                    {draftRoleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'ALL' ? 'All Roles' : option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-white">Role Need</span>
                  <select className="input" value={draftNeedFilter} onChange={(event) => setDraftNeedFilter(event.target.value)}>
                    <option value="ALL">All</option>
                    <option value="YES">Need Only</option>
                    <option value="NO">No Need</option>
                  </select>
                </label>
              </div>
            </div>
            {isLoadingDraft ? (
              <p className="text-sm text-slate-600">Loading draft valuations...</p>
            ) : draftError ? (
              <p className="text-sm text-red-600">{draftError}</p>
            ) : isLoadingDraftSearch ? (
              <p className="text-sm text-slate-600">Searching players...</p>
            ) : draftSearchError ? (
              <p className="text-sm text-red-600">{draftSearchError}</p>
            ) : !filteredDraftRows.length ? (
              <p className="text-sm text-slate-600">No players match the current draft filters.</p>
            ) : (
              <div className="max-h-[720px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-950">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-2 py-2 font-medium">Player</th>
                      <th className="px-2 py-2 font-medium">Pos</th>
                      <th className="px-2 py-2 font-medium">Value</th>
                      <th className="px-2 py-2 font-medium">Role Need</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDraftRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer border-b border-slate-200/70 transition hover:bg-white/5 ${
                          selectedDraftPlayerId === row.id ? 'bg-white/6' : ''
                        }`}
                        onClick={() => handleSelectDraftPlayer(row)}
                      >
                        <td className="px-2 py-2 font-medium">
                          <PlayerCell row={row} />
                        </td>
                        <td className="px-2 py-2">{row.position}</td>
                        <td className="px-2 py-2 font-semibold text-white">
                          {typeof row.adjustedValue === 'number' ? `$${row.adjustedValue}` : 'N/A'}
                        </td>
                        <td className="px-2 py-2">
                          {typeof row.fillsNeed === 'boolean'
                            ? row.fillsNeed
                              ? `Yes${row.neededSlots?.length ? ` · ${row.neededSlots.join(', ')}` : ''}`
                              : 'No'
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Draft Control</h2>
              <p className="text-sm text-slate-600">Click a player from the valuation pool to populate this panel.</p>
            </div>
            {!selectedDraftPlayer ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/35 p-4">
                  <p className="text-sm text-slate-500">Select a player from the pool to draft them.</p>
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleUndoLastPick}
                  disabled={isUndoingLastPick || !picks.length}
                >
                  {isUndoingLastPick ? 'Undoing...' : 'Undo Last Pick'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-4">
                  <div className="flex items-center gap-3">
                    {selectedDraftPlayer.headshotUrl ? (
                      <img
                        src={selectedDraftPlayer.headshotUrl}
                        alt={selectedDraftPlayer.name}
                        className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                      />
                    ) : null}
                    <div>
                      <h3 className="text-base font-semibold text-white">{selectedDraftPlayer.name}</h3>
                      <p className="text-sm text-slate-500">
                        {selectedDraftPlayer.team || 'No Team'} · {selectedDraftPlayer.position}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-white">Draft To Team</span>
                    <select className="input" value={draftTargetTeamKey} onChange={(event) => setDraftTargetTeamKey(event.target.value)}>
                      {teams.map((team) => (
                        <option key={team.teamKey} value={team.teamKey}>
                          {team.teamName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-white">Cost</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="1"
                        value={draftCost}
                        onChange={(event) => setDraftCost(event.target.value)}
                        placeholder="0"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-white">Assigned Slot</span>
                    <select
                      className="input"
                      value={draftAssignedSlot}
                      onChange={(event) => setDraftAssignedSlot(event.target.value)}
                      disabled={!draftEligibleSlots.length}
                    >
                      {!draftEligibleSlots.length ? <option value="">No eligible slots</option> : null}
                      {draftEligibleSlots.map((slot) => {
                        const openCount = getOpenCountForSlot(draftTargetTeam, slot, rosterSlots);
                        return (
                          <option key={slot} value={slot} disabled={openCount <= 0}>
                            {slot}{openCount > 0 ? ` (${openCount} open)` : ' (full)'}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                {draftActionError ? <p className="text-sm text-red-600">{draftActionError}</p> : null}

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleDraftPlayer}
                    disabled={isSavingDraftAction}
                  >
                    {isSavingDraftAction ? 'Saving...' : 'Draft Player'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleUndoLastPick}
                    disabled={isUndoingLastPick || !picks.length}
                  >
                    {isUndoingLastPick ? 'Undoing...' : 'Undo Last Pick'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeView === 'recent' ? (
        <div className="panel">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent Picks</h2>
            <p className="text-sm text-slate-600">Most recent picks from persisted draft history.</p>
          </div>
          {!recentPicks.length ? (
            <p className="text-sm text-slate-600">No picks have been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPicks.map((pick) => (
                <div
                  key={`${pick.pickNumber}-${pick.playerId}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/55 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Pick {pick.pickNumber} · {pick.playerName || pick.playerId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {teamNameByKey.get(pick.teamKey) || pick.teamKey} · {pick.status || 'DRAFTED'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-100">${pick.cost || 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'roster' ? (
        <div className="panel">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Team Roster</h2>
            <p className="text-sm text-slate-600">Current roster state for each team in the league.</p>
          </div>
          {!rosterRows.length ? (
            <p className="text-sm text-slate-600">No team state available yet.</p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {rosterRows.map((team) => (
                <section key={team.teamKey} className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{team.teamName}</h3>
                      <p className="text-xs text-slate-500">{team.playerCount} players · ${team.spentBudget} spent</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-100">
                      ${Math.max(0, team.budget - team.spentBudget)} left
                    </p>
                  </div>
                  {!team.players.length ? (
                    <p className="text-sm text-slate-600">No players on this roster yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {team.players.map((player) => (
                        <div key={`${team.teamKey}-${player.playerId}`} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium text-white">{player.playerName || player.playerId}</p>
                            <p className="text-xs text-slate-500">
                              {player.status} {getPersistedAssignedSlots(player).length ? `· ${getPersistedAssignedSlots(player).join(', ')}` : ''}
                            </p>
                          </div>
                          <p className="font-semibold text-slate-200">${player.cost || 0}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'budget' ? (
        <div className="panel">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Budget Overview</h2>
            <p className="text-sm text-slate-600">League budget totals and current spend by team.</p>
          </div>
          {!rosterRows.length ? (
            <p className="text-sm text-slate-600">No budget data available yet.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">League Budget</p>
                <p className="mt-2 text-3xl font-semibold text-white">${league?.config?.budget || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4 lg:col-span-2">
                <div className="space-y-3">
                  {rosterRows
                    .slice()
                    .sort((a, b) => b.budget - b.spentBudget - (a.budget - a.spentBudget))
                    .map((team) => (
                      <div key={team.teamKey}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-white">{team.teamName}</span>
                          <span className="text-slate-300">
                            ${team.spentBudget} spent · ${Math.max(0, team.budget - team.spentBudget)} left
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-400"
                            style={{
                              width: `${team.budget > 0 ? Math.min(100, (team.spentBudget / team.budget) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {activeView === 'lookup' ? (
        <div className="panel">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Player Lookup</h2>
              <p className="text-sm text-slate-600">
                Search MLB players during the draft without the valuation-pool table competing for space.
              </p>
            </div>
            <label className="relative w-full lg:max-w-md">
              <span className="mb-1 block text-sm font-medium text-white">Search all players</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-[2.35rem] left-3 h-4 w-4 text-slate-500"
              />
              <input
                className="input pl-10"
                type="search"
                value={playerSearchQuery}
                onChange={(event) => setPlayerSearchQuery(event.target.value)}
                placeholder="Start typing a player name"
              />
            </label>
          </div>

          {isSearchingPlayers ? (
            <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-white">Player Search Results</h3>
                <p className="text-sm text-slate-600">
                  {league?.config?.leagueType
                    ? `Showing ${league.config.leagueType} player matches for "${normalizedPlayerSearchQuery}".`
                    : `Showing player matches for "${normalizedPlayerSearchQuery}".`}
                </p>
              </div>

              {isLoadingPlayerSearch ? (
                <p className="text-sm text-slate-600">Searching players...</p>
              ) : playerSearchError ? (
                <p className="text-sm text-red-600">{playerSearchError}</p>
              ) : !playerSearchRows.length ? (
                <p className="text-sm text-slate-600">No players matched that search. Try a different name.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-2 py-2 font-medium">Player</th>
                      <th className="px-2 py-2 font-medium">Pos</th>
                      <th className="px-2 py-2 font-medium">AVG (Last Year)</th>
                      <th className="px-2 py-2 font-medium">AVG (3YR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerSearchRows.map((row) => (
                      <tr key={`search-${row.id}`} className="border-b border-slate-200/70">
                        <td className="px-2 py-2 font-medium">
                          <PlayerCell row={row} href={`/league/${leagueId}/players/${row.id}`} />
                        </td>
                        <td className="px-2 py-2">{row.position}</td>
                        <td className="px-2 py-2">{row.avgLastYear}</td>
                        <td className="px-2 py-2">{row.avg3yr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Use the search box to look up players across the wider player pool.</p>
          )}
        </div>
      ) : null}

      {activeView === 'pool' ? (
        <div className="panel overflow-x-auto">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Valuation Pool</h2>
              <p className="text-sm text-slate-600">Filter the current valuation pool without the draft-board framing.</p>
            </div>
            <label className="flex w-full max-w-sm flex-col gap-1 text-sm">
              <span className="font-medium text-white">Filter valuation pool</span>
              <input
                className="input"
                value={lookupQuery}
                onChange={(event) => setLookupQuery(event.target.value)}
                placeholder="Player name, team, position, MLB ID"
              />
            </label>
          </div>
          {isLoadingDraft ? (
            <p className="text-sm text-slate-600">Loading valuation pool...</p>
          ) : draftError ? (
            <p className="text-sm text-red-600">{draftError}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-2 py-2 font-medium">Player</th>
                  <th className="px-2 py-2 font-medium">Team</th>
                  <th className="px-2 py-2 font-medium">Pos</th>
                  <th className="px-2 py-2 font-medium">Adjusted</th>
                </tr>
              </thead>
              <tbody>
                {lookupRows.map((row) => (
                  <tr key={`lookup-${row.id}`} className="border-b border-slate-200/70">
                    <td className="px-2 py-2 font-medium">
                      <PlayerCell row={row} href={`/league/${leagueId}/players/${row.id}`} />
                    </td>
                    <td className="px-2 py-2">{row.team}</td>
                    <td className="px-2 py-2">{row.position}</td>
                    <td className="px-2 py-2 font-semibold text-white">${row.adjustedValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {activeView === 'depth' ? (
        <div className="panel space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Player Depth</h2>
              <p className="text-sm text-slate-600">MLB depth-chart data moved into its own draft view.</p>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-white">Team</span>
              <select
                className="rounded-md border border-emerald-300/70 bg-slate-950/80 px-3 py-2 text-sm text-white shadow-[0_0_0_1px_rgba(45,212,191,0.22)]"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(Number(event.target.value))}
              >
                {MLB_DEPTH_CHART_TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label} ({team.code})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoadingDepth ? (
            <p className="text-sm text-slate-600">Loading depth chart...</p>
          ) : depthError ? (
            <p className="text-sm text-red-600">{depthError}</p>
          ) : depthChart ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700/70 bg-slate-900/75 px-4 py-3 text-sm text-slate-100">
                {depthChart.team.name} ({depthChart.team.code}) · {depthChart.team.league} · Season {depthChart.season}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortDepthSlots(depthChart.slots).map((slot) => (
                  <section
                    key={slot.slot}
                    className="rounded-xl border border-slate-700/60 bg-[linear-gradient(170deg,rgba(17,20,42,0.82),rgba(20,24,50,0.94))] p-4 shadow-[0_18px_44px_rgba(5,7,18,0.34)]"
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-slate-700/60 pb-2">
                      <div>
                        <h3 className="text-base font-semibold text-white">{slot.slot}</h3>
                        <p className="text-xs uppercase tracking-wide text-slate-600">{slot.label}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{slot.normalizedSlot}</span>
                    </div>

                    <div className="space-y-3">
                      {slot.players.map((player) => (
                        <div key={`${slot.slot}-${player.mlbPlayerId}`} className="flex items-center gap-3">
                          <img
                            src={player.headshotUrl}
                            alt={player.name}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">
                              {player.depthRank}. {player.name}
                            </div>
                            <div className="text-xs text-slate-600">
                              {player.teamPosition} · {player.status || 'Active'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Choose a team to view its current depth chart.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
