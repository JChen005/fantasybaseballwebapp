import { KeyRound, RefreshCw } from 'lucide-react';
import { PrimaryActionButton, SectionHeading } from './ApiCenterPrimitives';

export default function ApiCenterAdminPanel({
  consumerName,
  generatedKey,
  generatingKey,
  handleGenerateKey,
  handleRefreshPlayerData,
  refreshingData,
  setConsumerName,
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,42,0.86),rgba(10,14,28,0.92))] p-6 shadow-[0_18px_50px_rgba(3,6,18,0.35)]">
      <SectionHeading
        eyebrow="Admin Actions"
        title="Update player info and create access keys"
        description="Use these controls to refresh the player list or create a new key for another app or teammate."
      />

      <div className="mt-6 grid gap-5">
        <div className="rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(22,28,48,0.5),rgba(9,12,23,0.42))] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-lg space-y-1">
              <div className="flex items-center gap-2 text-white">
                <RefreshCw className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold">Update Player List</span>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Pull in the latest player info so search, values, and player updates stay current.
              </p>
            </div>
            <PrimaryActionButton type="button" onClick={handleRefreshPlayerData} busy={refreshingData}>
              Update Now
            </PrimaryActionButton>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(22,28,48,0.5),rgba(9,12,23,0.42))] p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <KeyRound className="h-4 w-4 text-cyan-300" />
              <span className="text-sm font-semibold">Create Access Key</span>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Make a new key for another app, local setup, or shared integration.
            </p>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                id="consumer-name"
                className="input h-12 rounded-2xl border-white/10 bg-slate-950/70 px-4"
                value={consumerName}
                onChange={(event) => setConsumerName(event.target.value)}
                placeholder="Scoring Dashboard"
              />
              <PrimaryActionButton type="button" onClick={handleGenerateKey} busy={generatingKey} className="px-5">
                Create Key
              </PrimaryActionButton>
            </div>
            {generatedKey ? (
              <div className="rounded-[1rem] border border-emerald-300/15 bg-emerald-400/6 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/80">New Key</p>
                <code className="mt-3 block break-all text-sm text-emerald-100">{generatedKey}</code>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
