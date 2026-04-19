import Link from 'next/link';

export default function PlayerCell({ row, href = null }) {
  const content = (
    <div className="flex items-center gap-3">
      {row.headshotUrl ? (
        <img
          src={row.headshotUrl}
          alt={row.name}
          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
        />
      ) : null}
      <div>
        <div>{row.name}</div>
        <div className="text-xs font-normal text-slate-500">{row.team || 'No Team'}</div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-lg px-1 py-1 transition hover:bg-white/5">
      {content}
    </Link>
  );
}


