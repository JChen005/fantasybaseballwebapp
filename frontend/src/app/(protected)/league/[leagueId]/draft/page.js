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
import PlayerStatsView from './PlayerStatsView';
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
  const { historyBanner, dismissHistoryBanner } = pageData;

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

      {historyBanner ? (
        <DraftHistoryBanner
          historyBanner={historyBanner}
          onDismiss={dismissHistoryBanner}
        />
      ) : null}

      {activeView === 'draft' ? <DraftBoardView {...sharedProps} /> : null}
      {activeView === 'stats' ? <PlayerStatsView {...sharedProps} /> : null}
      {activeView === 'recent' ? <RecentPicksView {...sharedProps} /> : null}
      {activeView === 'roster' ? <RosterView {...sharedProps} /> : null}
      {activeView === 'budget' ? <BudgetView {...sharedProps} /> : null}
      {activeView === 'lookup' ? <PlayerLookupView {...sharedProps} /> : null}
      {activeView === 'pool' ? <ValuationPoolView {...sharedProps} /> : null}
      {activeView === 'depth' ? <DepthView {...sharedProps} /> : null}
    </section>
  );
}

function DraftHistoryBanner({ historyBanner, onDismiss }) {
  const isUndo = historyBanner.type === 'undo';
  const title = isUndo ? 'Undid' : 'Redid';

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        isUndo
          ? 'border-amber-300/25 bg-amber-300/[0.08] text-amber-50'
          : 'border-violet-300/25 bg-violet-300/[0.08] text-violet-50'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 truncate text-sm opacity-90">{historyBanner.description}</p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold transition hover:bg-white/10 ${
            isUndo ? 'border-amber-200/25' : 'border-violet-200/25'
          }`}
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

