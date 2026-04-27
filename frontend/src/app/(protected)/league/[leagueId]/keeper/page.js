'use client';

import { useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import KeeperPlayerRail, { getEligibleKeeperSlots } from 'components/KeeperPlayerRail';
import KeeperBoardView from './KeeperBoardView';
import KeeperHeader from './KeeperHeader';
import useKeeperPageData from './useKeeperPageData';

export default function Page() {
  const params = useParams();
  const pathname = usePathname();

  const basePath = pathname?.substring(0, pathname.lastIndexOf('/')) || '';

  const leagueId = Array.isArray(params?.leagueId)
    ? params.leagueId[0]
    : params?.leagueId;

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [slotError, setSlotError] = useState('');

  const keeperData = useKeeperPageData({ leagueId, selectedPlayer });
  const { draftState, league, loadingError, currentRows } = keeperData;

  const excludedPlayerIds = useMemo(() => {
    if (!currentRows) return [];

    return Array.from(
      new Set(
        currentRows
          .map((row) => row.player?.mlbPlayerId || row.mlbPlayerId || row.playerId)
          .filter(Boolean)
      )
    );
  }, [currentRows]);

  const handlePlayerClick = (...args) => {
    if (!selectedPlayer?.mlbPlayerId) return;

    const slot = args[1];
    const eligibleSlots = getEligibleKeeperSlots(selectedPlayer);

    if (!eligibleSlots.includes(slot)) {
      setSlotError(
        `${selectedPlayer.name || 'Selected player'} is not eligible for ${slot}. Eligible: ${eligibleSlots.join(', ')}`
      );
      return;
    }

    setSlotError('');

    keeperData.handlePlayerClick?.(...args);

    setSelectedPlayer(null);
  };

  return (
    <>
      <KeeperPlayerRail
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={(player) => {
          setSlotError('');
          setSelectedPlayer(player);
        }}
        leagueType={league?.config?.leagueType || null}
        excludedPlayerIds={excludedPlayerIds}
        showEligible
      />

      <section className="space-y-4">
        <KeeperHeader basePath={basePath} />

        {slotError ? (
          <p className="text-sm text-red-600">{slotError}</p>
        ) : null}

        {loadingError && (!draftState || !league) ? (
          <p className="text-sm text-red-600">{loadingError}</p>
        ) : !draftState || !league ? (
          <div className="panel">
            <div className="text-sm text-slate-600">Loading keeper data...</div>
          </div>
        ) : (
          <>
            {loadingError ? (
              <p className="text-sm text-red-600">{loadingError}</p>
            ) : null}

            <KeeperBoardView
              {...keeperData}
              handlePlayerClick={handlePlayerClick}
            />
          </>
        )}
      </section>
    </>
  );
}