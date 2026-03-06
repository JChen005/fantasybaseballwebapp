'use client';

import Link from 'next/link';

export default function AppNav({ onLogout }) {
  return (
    <header className="panel mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xl font-semibold">DraftKit</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Primary">
        <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
        <Link href="/api-center" className="btn btn-secondary">API Center</Link>
        <button className="btn" type="button" onClick={onLogout}>Logout</button>
      </nav>
    </header>
  );
}
