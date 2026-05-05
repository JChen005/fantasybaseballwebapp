'use client';

import LeagueFlowNav from 'components/LeagueFlowNav';

export default function SideBar() {
  return (
    <aside className="panel mb-4 h-fit lg:w-48 xl:fixed xl:inset-y-0 xl:left-0 xl:z-10 xl:mb-0 xl:h-screen xl:w-48 xl:rounded-none xl:border-y-0 xl:border-l-0 xl:bg-[linear-gradient(180deg,rgba(13,17,37,0.98),rgba(14,21,49,0.95))] xl:px-3.5 xl:pt-28 xl:pb-6">
      <LeagueFlowNav />
    </aside>
  );
}
