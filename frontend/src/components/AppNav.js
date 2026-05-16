'use client';

import Link from 'next/link';
import BrandMark from 'components/BrandMark';

export default function AppNav({ onLogout }) {
  return (
    <header className="panel mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link href="/dashboard" className="flex items-center gap-4">
        <BrandMark />
        <div>
          <p className="text-lg font-semibold tracking-[0.01em] text-white">
            DraftElite
          </p>
          <p className="text-xs text-white/55">
            Fantasy baseball draft assistant
          </p>
        </div>
      </Link>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Primary">
        <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
        <Link href="/api-center" className="btn btn-secondary">API Center</Link>
        <button className="btn" type="button" onClick={onLogout}>Logout</button>
      </nav>
    </header>
  );
}
