'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { playerApi } from 'lib/playerApi';

function PlayerBox({ player, selectedPlayer, setSelectedPlayer }) {
  const isSelected = selectedPlayer?.mlbPlayerId === player.mlbPlayerId;

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
      </div>
    </button>
  );
}

export default function KeeperPlayerRail({ selectedPlayer, setSelectedPlayer, leagueType = null }) {
  const [players, setPlayers] = useState(null);
  const pathname = usePathname();
  const basePath = pathname?.substring(0, pathname.lastIndexOf('/')) || '';

  function handleSearch(event) {
    if (event.key !== 'Enter') return;

    if (event.currentTarget.value.length < 3) {
      setPlayers([]);
      return;
    }

    const query = event.currentTarget.value;
    playerApi.getPlayersByName(query, { leagueType, limit: 20 }).then((data) => {
      setPlayers(data.players);
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
      {players && players.map((player, index) => (
        <PlayerBox
          key={index}
          player={player}
          selectedPlayer={selectedPlayer}
          setSelectedPlayer={setSelectedPlayer}
        />
      ))}
    </div>
  );
}
