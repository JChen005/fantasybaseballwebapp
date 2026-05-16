'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import SideBar from 'components/sidebar';
import { leagueApi } from 'lib/leagueApi';

const SLOT_ORDER = ['C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'P', 'BN'];
const INCLUDED_PLAYER_STATUSES = new Set(['KEEPER', 'DRAFTED', 'TAXI']);

const DRAFT_HISTORY_TAB = 'draft-history';

export default function Page() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;

  const [league, setLeague] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leagueId) return undefined;

    let cancelled = false;

    async function loadPostDraftData() {
      try {
        setIsLoading(true);
        setError('');

        const [{ league: leagueData }, { draftState: draftStateData }] = await Promise.all([
          leagueApi.getLeague(leagueId),
          leagueApi.getDraftState(leagueId),
        ]);

        if (cancelled) return;

        setLeague(leagueData);
        setDraftState(draftStateData);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || 'Failed to load post-draft data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPostDraftData();

    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const teams = Array.isArray(draftState?.teams) ? draftState.teams : [];
  const picks = Array.isArray(draftState?.picks) ? draftState.picks : [];
  const rosterSlots = league?.config?.rosterSlots || {};

  useEffect(() => {
    if (!teams.length) return;

    const isTeamTab = teams.some((team) => team.teamKey === activeTab);
    const isDraftHistoryTab = activeTab === DRAFT_HISTORY_TAB;

    if (!activeTab || (!isTeamTab && !isDraftHistoryTab)) {
      setActiveTab(teams[0].teamKey);
    }
  }, [teams, activeTab]);

  const selectedTeam =
    activeTab === DRAFT_HISTORY_TAB
      ? null
      : teams.find((team) => team.teamKey === activeTab) || teams[0] || null;

  const rosteredPlayerCount = useMemo(() => {
    return teams.reduce((count, team) => count + getPostDraftPlayers(team.players).length, 0);
  }, [teams]);

  return (
    <>
      <SideBar />

      <section className="space-y-4">
        <div className="panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            League / Post-Draft
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Post-Draft Review</h1>
          <p className="mt-2 text-sm text-slate-600">
            Review every keeper, drafted player, and taxi player by roster slot and draft pick order.
          </p>
        </div>

        {isLoading ? (
          <div className="panel">
            <p className="text-sm text-slate-600">Loading post-draft data...</p>
          </div>
        ) : error ? (
          <div className="panel">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : !teams.length ? (
          <div className="panel">
            <p className="text-sm text-slate-600">No draft state is available yet.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Teams" value={teams.length} />
              <SummaryCard label="Rostered Players" value={rosteredPlayerCount} />
              <SummaryCard label="Recorded Picks" value={picks.length} />
            </div>

            <PostDraftReviewView
              teams={teams}
              picks={picks}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedTeam={selectedTeam}
              rosterSlots={rosterSlots}
            />
          </>
        )}
      </section>
    </>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PostDraftReviewView({
  teams,
  picks,
  activeTab,
  setActiveTab,
  selectedTeam,
  rosterSlots,
}) {
  const isDraftHistory = activeTab === DRAFT_HISTORY_TAB;

  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Post-Draft Review</h2>
          <p className="text-sm text-slate-600">
            {isDraftHistory
              ? 'Complete draft-pick history from the persisted draft log.'
              : 'Keepers, drafted players, and taxi players by roster slot.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportPostDraftCsv({ picks, teams, rosterSlots })}
          className="rounded-lg border border-emerald-300/70 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/30"
        >
          Export All Teams
        </button>
      </div>

      <nav
        className="mb-4 flex flex-wrap items-center gap-2"
        aria-label="Post-draft teams and draft history"
      >
        {teams.map((team) => (
          <PostDraftTabButton
            key={team.teamKey}
            active={activeTab === team.teamKey}
            onClick={() => setActiveTab(team.teamKey)}
          >
            {team.teamName || team.teamKey}
          </PostDraftTabButton>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-slate-600/80 sm:inline-block" aria-hidden />
        <PostDraftTabButton
          active={isDraftHistory}
          onClick={() => setActiveTab(DRAFT_HISTORY_TAB)}
        >
          Draft History
        </PostDraftTabButton>
      </nav>

      {isDraftHistory ? (
        <DraftHistoryTable picks={picks} teams={teams} />
      ) : selectedTeam ? (
        <TeamSlotBoard team={selectedTeam} rosterSlots={rosterSlots} />
      ) : (
        <p className="text-sm text-slate-600">No team selected.</p>
      )}
    </div>
  );
}

function PostDraftTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-50'
          : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

function TeamSlotBoard({ team, rosterSlots }) {
  const rows = useMemo(() => buildSlotRows(team, rosterSlots), [team, rosterSlots]);
  const players = getPostDraftPlayers(team.players);
  const counts = countPlayersByStatus(players);

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <h3 className="text-base font-semibold text-white">{team.teamName || team.teamKey}</h3>
          <p className="text-xs text-slate-500">
            {players.length} players · {counts.KEEPER} keepers · {counts.DRAFTED} drafted · {counts.TAXI} taxi
          </p>
        </div>
        <p className="text-sm font-semibold text-emerald-100">
          ${Math.max(0, Number(team.budget || 0) - Number(team.spentBudget || 0))} left
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-2">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="w-20 px-3 py-3 font-medium text-white">Slot</th>
              <th className="min-w-44 px-3 py-3 font-medium text-white">Player</th>
              <th className="w-24 px-3 py-3 font-medium text-white">Contract</th>
              <th className="w-24 px-3 py-3 font-medium text-white">Cost</th>
              <th className="w-28 px-3 py-3 font-medium text-white">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ slot, slotIndex, player, isOverflow }) => (
              <tr
                key={`${team.teamKey}-${slot}-${slotIndex}-${player?.playerId || 'empty'}`}
                className="border-b border-slate-700/50 last:border-0"
              >
                <td className="px-3 py-3 font-semibold text-slate-100">
                  {slot} {slotIndex + 1}
                  {isOverflow ? ' +' : ''}
                </td>
                <td className="px-3 py-3">
                  {player ? (
                    <p className="font-medium text-white">
                      {player.playerName || 'Unnamed player'}
                    </p>
                  ) : (
                    <span className="text-slate-600">Empty</span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-300">{player?.contract || '—'}</td>
                <td className="px-3 py-3 font-semibold text-slate-200">
                  {player ? `$${Number(player.cost || 0)}` : '—'}
                </td>
                <td className="px-3 py-3 text-slate-300">{player?.status || 'OPEN'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DraftHistoryTable({ picks, teams }) {
  const teamNameByKey = useMemo(
    () => new Map(teams.map((team) => [team.teamKey, team.teamName || team.teamKey])),
    [teams]
  );

  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => Number(a.pickNumber || 0) - Number(b.pickNumber || 0)),
    [picks]
  );

  if (!sortedPicks.length) {
    return <p className="text-sm text-slate-600">No picks have been recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/45 p-2">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="w-24 px-3 py-3 font-medium text-white">Pick</th>
            <th className="w-24 px-3 py-3 font-medium text-white">Round</th>
            <th className="min-w-44 px-3 py-3 font-medium text-white">Player</th>
            <th className="min-w-40 px-3 py-3 font-medium text-white">Team</th>
            <th className="w-24 px-3 py-3 font-medium text-white">Contract</th>
            <th className="w-24 px-3 py-3 font-medium text-white">Cost</th>
            <th className="w-36 px-3 py-3 font-medium text-white">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedPicks.map((pick) => (
            <tr
              key={`${pick.pickNumber}-${pick.playerId}`}
              className="border-b border-slate-700/50 last:border-0"
            >
              <td className="px-3 py-3 font-semibold text-white">{pick.pickNumber || '—'}</td>
              <td className="px-3 py-3 text-slate-300">{pick.round || '—'}</td>
              <td className="px-3 py-3 font-medium text-white">
                {pick.playerName || 'Unnamed player'}
              </td>
              <td className="px-3 py-3 text-slate-300">
                {teamNameByKey.get(pick.teamKey) || pick.teamKey || '—'}
              </td>
              <td className="px-3 py-3 text-slate-300">{pick.contract || '—'}</td>
              <td className="px-3 py-3 font-semibold text-slate-200">${Number(pick.cost || 0)}</td>
              <td className="px-3 py-3 text-slate-300">{pick.status || 'DRAFTED'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildSlotRows(team, rosterSlots = {}) {
  const rowPlan = buildRowPlan(rosterSlots);
  const playersBySlot = groupPostDraftPlayersBySlot(team.players);
  const slotUsage = {};

  const plannedRows = rowPlan.map(({ slot, slotIndex }) => {
    const usedIndex = slotUsage[slot] || 0;
    const slotPlayers = playersBySlot[slot] || [];
    const player = slotPlayers[usedIndex] || null;

    slotUsage[slot] = usedIndex + 1;

    return { slot, slotIndex, player };
  });

  const overflowRows = Object.entries(playersBySlot).flatMap(([slot, slotPlayers]) => {
    const usedCount = slotUsage[slot] || 0;

    return slotPlayers.slice(usedCount).map((player, index) => ({
      slot,
      slotIndex: usedCount + index,
      player,
      isOverflow: true,
    }));
  });

  return [...plannedRows, ...overflowRows];
}

function buildRowPlan(rosterSlots = {}) {
  const rows = [];

  for (const slot of SLOT_ORDER) {
    const count = Number(rosterSlots?.[slot] || 0);

    for (let index = 0; index < count; index += 1) {
      rows.push({ slot, slotIndex: index });
    }
  }

  return rows;
}

function groupPostDraftPlayersBySlot(players = []) {
  return getPostDraftPlayers(players).reduce((grouped, player) => {
    const assignedSlots = getAssignedSlots(player);
    const primarySlot = assignedSlots[0] || fallbackSlotForStatus(player.status);

    if (!grouped[primarySlot]) grouped[primarySlot] = [];
    grouped[primarySlot].push(player);

    return grouped;
  }, {});
}

function getPostDraftPlayers(players = []) {
  return (Array.isArray(players) ? players : []).filter((player) => {
    if (!player?.playerId) return false;

    const status = normalizeStatus(player.status);
    return INCLUDED_PLAYER_STATUSES.has(status);
  });
}

function countPlayersByStatus(players = []) {
  return players.reduce(
    (counts, player) => {
      const status = normalizeStatus(player.status);
      counts[status] = Number(counts[status] || 0) + 1;
      return counts;
    },
    { KEEPER: 0, DRAFTED: 0, TAXI: 0 }
  );
}

function getAssignedSlots(player) {
  if (Array.isArray(player?.assignedSlots) && player.assignedSlots.length) {
    return player.assignedSlots.map(normalizeSlot).filter(Boolean);
  }

  const assignedSlot = normalizeSlot(player?.assignedSlot);
  return assignedSlot ? [assignedSlot] : [];
}

function fallbackSlotForStatus(status) {
  return normalizeStatus(status) === 'TAXI' ? 'BN' : 'BN';
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}

function normalizeSlot(slot) {
  return String(slot || '').trim().toUpperCase();
}

function exportPostDraftCsv({ picks, teams, rosterSlots }) {
  const teamNameByKey = new Map(
    teams.map((team) => [team.teamKey, team.teamName || team.teamKey])
  );

  const slotRows = teams.flatMap((team) =>
    buildSlotRows(team, rosterSlots).map(({ slot, slotIndex, player, isOverflow }) => ({
      table: 'Roster Slots',
      team: team.teamName || team.teamKey,
      slot: `${slot} ${slotIndex + 1}${isOverflow ? ' +' : ''}`,
      player: player?.playerName || '',
      playerId: player?.playerId || '',
      contract: player?.contract || '',
      cost: player ? Number(player.cost || 0) : '',
      status: player?.status || 'OPEN',
    }))
  );

  const pickRows = [...picks]
    .sort((a, b) => Number(a.pickNumber || 0) - Number(b.pickNumber || 0))
    .map((pick) => ({
      table: 'Draft Picks',
      pick: pick.pickNumber || '',
      round: pick.round || '',
      player: pick.playerName || '',
      playerId: pick.playerId || '',
      team: teamNameByKey.get(pick.teamKey) || pick.teamKey || '',
      contract: pick.contract || '',
      cost: Number(pick.cost || 0),
      status: pick.status || 'DRAFTED',
    }));

  const csv = [
    toCsvSection('Roster Slots', slotRows),
    '',
    toCsvSection('Draft Picks', pickRows),
  ].join('\n');

  downloadTextFile(csv, 'post-draft-all-teams.csv', 'text/csv;charset=utf-8;');
}

function toCsvSection(title, rows) {
  if (!rows.length) return `${title}\nNo rows`;

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  return [
    title,
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function csvEscape(value) {
  const stringValue = String(value ?? '');

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}