'use client';

export default function DraftkitPagePlaceholder({
  title = 'Coming Soon',
  note = 'This page is intentionally stubbed for DraftKit.',
}) {
  return (
    <section className="panel">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm opacity-80">{note}</p>

      <div className="panel mt-4 text-sm">
        <p className="opacity-70">PLACEHOLDER</p>
      </div>
    </section>
  );
}
