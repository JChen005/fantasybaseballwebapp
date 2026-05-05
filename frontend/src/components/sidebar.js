'use client';

import LeagueFlowNav from 'components/LeagueFlowNav';

export default function SideBar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[13.75rem] p-3">
      <LeagueFlowNav compact />
    </aside>
  );
}
