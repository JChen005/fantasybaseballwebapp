'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { playerApi } from 'lib/playerApi';

function normalizePositions(player) {
  const raw =
    player?.eligiblePositions ||
    player?.positions ||
    player?.position ||
    player?.primaryPosition ||
    '';

  const positions = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(/[,\s/]+/)
        .map((pos) => pos.trim())
        .filter(Boolean);

  return Array.from(new Set(positions.map((pos) => pos.toUpperCase())));
}

function getEligibleKeeperSlots(player) {
  const positions = normalizePositions(player);
  const slots = new Set();

  for (const pos of positions) {
    if (pos === 'SP' || pos === 'RP' || pos === 'P') {
      slots.add('P');
    } else if (pos === 'LF' || pos === 'CF' || pos === 'RF' || pos === 'OF') {
      slots.add('OF');
    } else if (['C', '1B', '2B', '3B', 'SS'].includes(pos)) {
      slots.add(pos);
    }
  }

  if ([...slots].some((slot) => slot !== 'P')) {
    slots.add('UTIL');
  }

  slots.add('BN');

  return Array.from(slots);
}

export { normalizePositions, getEligibleKeeperSlots };

export default function KeeperPlayerRail({
  selectedPlayer,
  setSelectedPlayer,
  leagueType = null,
  excludedPlayerIds = [],
  showEligible = false
}) {
  const [players, setPlayers] = useState(null);
  const pathname = usePathname();
  const basePath = pathname?.substring(0, pathname.lastIndexOf('/')) || '';

  useEffect(() => {
    setPlayers((prevPlayers) => {
      if (!prevPlayers) return prevPlayers;

      return prevPlayers.filter(
        (player) => !excludedPlayerIds.includes(Number(player.mlbPlayerId))
      );
    });
  }, [excludedPlayerIds]);

  function handleSearch(event) {
    const value = event.currentTarget.value;

    if (value.length < 3) {
      setPlayers([]);
      return;
    }

    const queries = value
      .split(',')
      .map((q) => q.trim())
      .filter((q) => q.length >= 3);

    if (queries.length === 0) {
      setPlayers([]);
      return;
    }

    Promise.all(
      queries.map((query) =>
        playerApi.getPlayersByName(query, { leagueType, limit: 20 })
      )
    ).then((results) => {
      const combinedPlayers = results.flatMap((result) => result.players || []);

      const uniquePlayers = Array.from(
        new Map(combinedPlayers.map((player) => [player.mlbPlayerId, player])).values()
      );

      const filteredPlayers = uniquePlayers.filter(
        (player) => !excludedPlayerIds.includes(Number(player.mlbPlayerId))
      );

      setPlayers(filteredPlayers);
    });
  }

  return (
    <div className="fixed left-0 top-0 h-full w-55 p-3">
      <div className="rounded border border-slate-200 flex">
        <Link className="text-s px-1" href={`${basePath}/config`}>
          Config
        </Link>
        <Link className="text-s px-1" href={`${basePath}/keeper`}>
          Keeper
        </Link>
        <Link className="text-s px-1" href={`${basePath}/draft`}>
          Draft
        </Link>
        <Link className="text-s px-1" href={`${basePath}/taxi`}>
          Taxi
        </Link>
      </div>

      <input
        className="input input-bordered my-2"
        placeholder="Search Players..."
        onKeyDown={handleSearch}
      />

      {players &&
        players.map((player) => (
          <PlayerBox
            key={player.mlbPlayerId}
            player={player}
            selectedPlayer={selectedPlayer}
            setSelectedPlayer={setSelectedPlayer}
            showEligible={showEligible}
          />
        ))}
    </div>
  );
}

// sub components

function PlayerBox({ player, selectedPlayer, setSelectedPlayer, showEligible }) {
  const isSelected = selectedPlayer?.mlbPlayerId === player.mlbPlayerId;
  const positions = normalizePositions(player);
  const eligibleSlots = getEligibleKeeperSlots(player);

  return (
    <button
      type="button"
      onClick={() => setSelectedPlayer(player)}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left shadow-sm transition ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      {player.headshotUrl ? (
        <img
          src={player.headshotUrl}
          alt={player.name}
          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">
          {player.name?.[0]}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">
          {player.name}
        </div>

        {showEligible && <div className="text-[11px] text-slate-400">
          {eligibleSlots.join(', ')}
        </div>}
      </div>
    </button>
  );
}