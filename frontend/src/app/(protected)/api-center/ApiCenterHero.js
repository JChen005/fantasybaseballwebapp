import { MetricCard } from './ApiCenterPrimitives';

export default function ApiCenterHero({ checkedAtLabel, licenseConsumer, licensePreview }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(90deg,rgba(18,22,42,0.96),rgba(24,31,55,0.94)_58%,rgba(22,50,63,0.92)_100%)] px-6 py-6 shadow-[0_18px_50px_rgba(3,6,18,0.35)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(720px,0.95fr)] xl:items-center">
        <div className="flex min-h-[112px] items-center">
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/75">DraftKit Workspace</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">API Center</h1>
              <p className="max-w-xl text-sm leading-6 text-slate-300/85">
                Manage player updates, access keys, and ready-to-open league demos from one place.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Connected App" value={licenseConsumer} meta="Current app using this connection" />
          <MetricCard label="Key Preview" value={licensePreview} meta="Current access key" />
          <MetricCard label="Last Check" value={checkedAtLabel} meta="Most recent status check" />
        </div>
      </div>
    </div>
  );
}
