import { ArrowRight, LoaderCircle } from 'lucide-react';
import { DEMO_STAGE_OPTIONS } from './apiCenterConstants';
import { SectionHeading } from './ApiCenterPrimitives';

export default function ApiCenterDemoStages({ handleLoadStage, loadingStageId }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,42,0.86),rgba(10,14,28,0.92))] p-6 shadow-[0_18px_50px_rgba(3,6,18,0.35)]">
      <SectionHeading
        eyebrow="League Demos"
        title="Open saved league moments"
        description="Create a fresh demo league and jump straight into the point of the flow you want to show."
      />

      <div className="mt-6 grid gap-4">
        {DEMO_STAGE_OPTIONS.map((option) => {
          const busy = loadingStageId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className="group rounded-[1.3rem] border border-white/8 bg-[linear-gradient(145deg,rgba(24,30,52,0.46),rgba(12,16,31,0.34))] p-4 text-left transition hover:border-cyan-300/20 hover:bg-[linear-gradient(145deg,rgba(34,211,238,0.08),rgba(24,30,52,0.28))] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => handleLoadStage(option.id)}
              disabled={busy}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/8 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {option.accent}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">League View</span>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{option.label}</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">{option.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200 transition group-hover:translate-x-1">
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
