import { CheckCircle2 } from 'lucide-react';

export default function ApiCenterNotices({ error, success }) {
  return (
    <>
      {success ? (
        <div className="rounded-[1.3rem] border border-emerald-300/15 bg-emerald-400/[0.07] px-5 py-4 text-sm text-emerald-100" role="status">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
            <span>{success}</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-[1.3rem] border border-rose-300/15 bg-rose-400/[0.07] px-5 py-4 text-sm text-rose-100"
          role="status"
          aria-live="polite"
        >
          {error}
        </div>
      ) : null}
    </>
  );
}
