'use client';

import CreateLeagueForm from './CreateLeagueForm';
import DashboardHeader from './DashboardHeader';
import DashboardLeagueList from './DashboardLeagueList';
import useDashboardPageData from './useDashboardPageData';

export default function DashboardPage() {
  const dashboardData = useDashboardPageData();

  return (
    <section className="space-y-4">
      <DashboardHeader
        draftkitHealth={dashboardData.draftkitHealth}
        leagueCountLabel={dashboardData.leagueCountLabel}
        userDisplayName={dashboardData.userDisplayName}
      />
      <CreateLeagueForm {...dashboardData} />
      <DashboardLeagueList {...dashboardData} />
    </section>
  );
}
