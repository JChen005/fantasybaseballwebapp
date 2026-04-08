'use client';

import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';

const WORKFLOW_ITEMS = [
  { id: 'config', label: 'League Config' },
  { id: 'keeper', label: 'Keeper Round' },
  { id: 'draft', label: 'Draft Board' },
  { id: 'lookup', label: 'Player Lookup' },
  { id: 'taxi', label: 'Taxi Round' },
  { id: 'post-draft', label: 'Post-Draft' },
];

function getWorkflowHref(leagueId, itemId) {
  if (itemId === 'lookup') {
    return `/league/${leagueId}/draft?view=lookup`;
  }

  if (itemId === 'draft') {
    return `/league/${leagueId}/draft`;
  }

  return `/league/${leagueId}/${itemId}`;
}

function getActiveId(pathname, searchParams) {
  if (!pathname) return 'config';

  if (pathname.includes('/draft')) {
    return searchParams?.get('view') === 'lookup' ? 'lookup' : 'draft';
  }

  if (pathname.includes('/keeper')) return 'keeper';
  if (pathname.includes('/taxi')) return 'taxi';
  if (pathname.includes('/post-draft')) return 'post-draft';
  if (pathname.includes('/players/')) return 'lookup';
  return 'config';
}

export default function SideBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const leagueId = Array.isArray(params?.leagueId) ? params.leagueId[0] : params?.leagueId;
  const activeId = getActiveId(pathname, searchParams);

  if (!leagueId) return null;

  return (
    <aside className="panel mb-4 h-fit lg:w-48 xl:fixed xl:inset-y-0 xl:left-0 xl:z-10 xl:mb-0 xl:h-screen xl:w-48 xl:rounded-none xl:border-y-0 xl:border-l-0 xl:bg-[linear-gradient(180deg,rgba(13,17,37,0.98),rgba(14,21,49,0.95))] xl:px-3.5 xl:pt-28 xl:pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">League Flow</p>
      <nav className="mt-4 flex flex-col gap-3" aria-label="League workflow">
        {WORKFLOW_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={getWorkflowHref(leagueId, item.id)}
            className={`rounded-[1rem] border px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition ${
              activeId === item.id
                ? 'border-emerald-300/70 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.16)]'
                : 'border-slate-300/20 bg-slate-300/7 text-slate-100 hover:bg-slate-200/12'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
