'use client';

import { useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import KeeperPlayerRail from 'components/KeeperPlayerRail';
import KeeperBoardView from './KeeperBoardView';
import KeeperHeader from './KeeperHeader';
import useKeeperPageData from './useKeeperPageData';

export default function Page() {
  const params = useParams();
  const pathname = usePathname();
  const basePath = pathname?.substring(0, pathname.lastIndexOf('/')) || '';
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const keeperData = useKeeperPageData({ leagueId, selectedPlayer });
  const { draftState, league, loadingError } = keeperData;
  const excludedPlayerIds = (draftState?.teams || []).flatMap((team) =>
    (team.players || []).map((player) => Number(player.playerId)).filter(Number.isFinite)
  );

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
            {loadingError ? <p className="text-sm text-red-600">{loadingError}</p> : null}
            <KeeperBoardView {...keeperData} />
          </>
        )}
      </section>
    </>
  );
}
