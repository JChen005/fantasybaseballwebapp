import Link from 'next/link';

export default function KeeperHeader({ basePath }) {
  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            League / Keepers
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Keeper Board</h1>
        </div>

        <Link
          href={`${basePath}/draft`}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5"
        >
          Go to Draft
        </Link>
      </div>
    </div>
  );
}
