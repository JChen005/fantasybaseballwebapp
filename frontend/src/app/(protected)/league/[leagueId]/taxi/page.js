'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import LeaguePlayerRail from 'components/LeaguePlayerRail';
import TaxiBoardView from './TaxiBoardView';
import TaxiHeader from './TaxiHeader';
import useTaxiPageData from './useTaxiPageData';

export default function Page() {
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const taxiData = useTaxiPageData({ leagueId, selectedPlayer, setSelectedPlayer });
  const { board, draftState, league, loadingError } = taxiData;

  const rosterPlayerIds = useMemo(() => {
    return (draftState?.teams || []).flatMap((team) =>
      (team.players || [])
        .filter((player) => String(player.status || '').trim().toUpperCase() !== 'TAXI')
        .map((player) => Number(player.playerId))
        .filter(Number.isFinite)
    );
  }, [draftState]);

  const taxiBoardPlayerIds = useMemo(() => {
    return Object.values(board || {})
      .flat()
      .map((row) => Number(row?.playerId))
      .filter(Number.isFinite);
  }, [board]);

  const excludedPlayerIds = useMemo(() => {
    return Array.from(new Set([...rosterPlayerIds, ...taxiBoardPlayerIds]));
  }, [rosterPlayerIds, taxiBoardPlayerIds]);

  return (
    <>
      <LeaguePlayerRail
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
        leagueType={league?.config?.leagueType || null}
        excludedPlayerIds={excludedPlayerIds}
      />

      <section className="space-y-4">
        <TaxiHeader
          action={
            <Link
              href={`/league/${leagueId}/post-draft`}
              className="rounded-lg border border-emerald-300/70 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/30"
            >
              Post-Draft
            </Link>
          }
        />

        {loadingError && (!draftState || !league) ? (
          <p className="text-sm text-red-600">{loadingError}</p>
        ) : !draftState || !league ? (
          <div className="panel">
            <div className="text-sm text-slate-600">Loading taxi data...</div>
          </div>
        ) : (
          <>
            {loadingError ? <p className="text-sm text-red-600">{loadingError}</p> : null}
            <TaxiBoardView {...taxiData} />
          </>
        )}
      </section>
    </>
  );
}
