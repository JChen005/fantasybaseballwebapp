'use client';

import { useMemo, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import KeeperPlayerRail from 'components/KeeperPlayerRail';
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

  const keeperData = useKeeperPageData({ leagueId, selectedPlayer });
  const { draftState, league, loadingError, currentRows } = keeperData;

  // 👇 derive excluded players from board
  const excludedPlayerIds = useMemo(() => {
    if (!currentRows) return [];

    return Array.from(
      new Set(
        currentRows
          .map(row => row.player?.mlbPlayerId || row.mlbPlayerId || row.playerId)
          .filter(Boolean)
      )
    );
  }, [currentRows]);

  // 👇 wrap the original handler
  const handlePlayerClick = (...args) => {
    keeperData.handlePlayerClick?.(...args);

    // 👇 reset after assignment
    setSelectedPlayer(null);
  };

  return (
    <>
      <KeeperPlayerRail
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
        leagueType={league?.config?.leagueType || null}
        excludedPlayerIds={excludedPlayerIds}
      />

      <section className="space-y-4">
        <KeeperHeader basePath={basePath} />

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
              handlePlayerClick={handlePlayerClick} // 👈 override here
            />
          </>
        )}
      </section>
    </>
  );
}