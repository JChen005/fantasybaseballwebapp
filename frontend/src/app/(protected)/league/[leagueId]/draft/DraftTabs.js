import Link from 'next/link';
import { DRAFT_VIEW_TABS } from './draftPageConstants';
import { getDraftViewHref } from './draftPageUtils';

export default function DraftTabs({ activeView, leagueId }) {
  return (
    <div className="panel">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Draft Views</p>
      <nav className="mt-3 flex flex-wrap gap-2.5" aria-label="Draft view tabs">
        {DRAFT_VIEW_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={getDraftViewHref(leagueId, tab.id)}
            className={`rounded-[1rem] border px-3.5 py-2.5 text-sm font-semibold transition ${
              activeView === tab.id
                ? 'border-emerald-300/70 bg-emerald-400/22 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
                : 'border-slate-300/20 bg-slate-300/7 text-slate-100 hover:bg-slate-200/12'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}


