'use client';

import { Search } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import SideBar from 'components/sidebar';

import BudgetView from './BudgetView';
import DepthView from './DepthView';
import DraftBoardView from './DraftBoardView';
import DraftTabs from './DraftTabs';
import PlayerCell from './PlayerCell';
import PlayerLookupView from './PlayerLookupView';
import RecentPicksView from './RecentPicksView';
import RosterView from './RosterView';
import ValuationPoolView from './ValuationPoolView';
import { MLB_DEPTH_CHART_TEAMS } from './draftPageConstants';
import { resolveDraftView } from './draftPageUtils';
import useDraftPageData from './useDraftPageData';

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const activeView = resolveDraftView(searchParams?.get('view'));
  const pageData = useDraftPageData({ activeView, leagueId });

  const sharedProps = {
    leagueId,
    PlayerCell,
    SearchIcon: Search,
    MLB_DEPTH_CHART_TEAMS,
    ...pageData,
  };

  return (
    <section className="space-y-4">
      <SideBar />

      <div className="panel">
        <h1 className="text-2xl font-semibold">League / Draft</h1>
      </div>

      <DraftTabs activeView={activeView} leagueId={leagueId} />

      {activeView === 'draft' ? <DraftBoardView {...sharedProps} /> : null}
      {activeView === 'recent' ? <RecentPicksView {...sharedProps} /> : null}
      {activeView === 'roster' ? <RosterView {...sharedProps} /> : null}
      {activeView === 'budget' ? <BudgetView {...sharedProps} /> : null}
      {activeView === 'lookup' ? <PlayerLookupView {...sharedProps} /> : null}
      {activeView === 'pool' ? <ValuationPoolView {...sharedProps} /> : null}
      {activeView === 'depth' ? <DepthView {...sharedProps} /> : null}
    </section>
  );
}


