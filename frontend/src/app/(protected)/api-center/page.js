'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Radar,
  RefreshCw,
  Send,
} from 'lucide-react';
import { draftkitApi } from 'lib/draftkitApi';

const DEMO_STAGE_OPTIONS = [
  { id: 'empty', label: 'Start New League', description: 'Begin with a fresh league and empty setup.', accent: 'SETUP' },
  { id: 'keepers', label: 'Open Keepers View', description: 'Jump into a league that already has keepers and minors tracked.', accent: 'KEEPERS' },
  { id: 'draft12', label: 'Open Early Draft', description: 'See the board shortly after the draft begins.', accent: 'EARLY' },
  { id: 'draft24', label: 'Open Mid Draft', description: 'Review a league once the first wave of picks is in.', accent: 'MIDDLE' },
  { id: 'draft36', label: 'Open Later Draft', description: 'See a deeper draft with tighter roster decisions.', accent: 'LATER' },
];

function MetricCard({ label, value, meta }) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-[linear-gradient(180deg,rgba(24,30,52,0.5),rgba(10,14,28,0.58))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
      {meta ? <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p> : null}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">{eyebrow}</p>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function PrimaryActionButton({ busy, children, className = '', ...props }) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-full border border-emerald-300/30 bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export default function ApiCenterPage() {
  const router = useRouter();
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [consumerName, setConsumerName] = useState('DraftKit API Center');
  const [generatedKey, setGeneratedKey] = useState('');
  const [refreshingData, setRefreshingData] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [playerQuery, setPlayerQuery] = useState('');
  const [transactionDetail, setTransactionDetail] = useState('');
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  const [loadingStageId, setLoadingStageId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLicense() {
      try {
        const data = await draftkitApi.getLicenseStatus();
        if (!cancelled) {
          setLicenseStatus(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load license status');
        }
      }
    }

    loadLicense();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkedAtLabel = useMemo(() => {
    if (!licenseStatus?.checkedAt) return 'Not checked yet';
    return new Date(licenseStatus.checkedAt).toLocaleString();
  }, [licenseStatus]);

  const licenseConsumer = licenseStatus?.license?.consumerName || 'Unknown';
  const licensePreview = licenseStatus?.license?.keyPreview || 'N/A';

  function resetNotices() {
    setError('');
    setSuccess('');
  }

  async function handleRefreshPlayerData() {
    resetNotices();
    setRefreshingData(true);
    try {
      const data = await draftkitApi.refreshPlayerData();
      setSuccess(`Player list updated. Added ${data.inserted ?? 0} new players.`);
    } catch (err) {
      setError(err.message || 'Could not update the player list');
    } finally {
      setRefreshingData(false);
    }
  }

  async function handleGenerateKey() {
    resetNotices();
    setGeneratedKey('');
    setGeneratingKey(true);
    try {
      const data = await draftkitApi.generatePlayerKey({ consumerName });
      setGeneratedKey(data.apiKey || '');
      setSuccess(`Created a new access key for ${data?.license?.consumerName || consumerName}.`);
    } catch (err) {
      setError(err.message || 'Could not create a new access key');
    } finally {
      setGeneratingKey(false);
    }
  }

  async function handleCreateTransaction(event) {
    event.preventDefault();
    resetNotices();
    setTransactionResult(null);
    setCreatingTransaction(true);
    try {
      const data = await draftkitApi.createPlayerTransaction({
        playerQuery,
        detail: transactionDetail,
      });
      setTransactionResult(data);
      setSuccess(`Added an update for ${data?.resolvedPlayer?.name || 'that player'}.`);
    } catch (err) {
      setError(err.message || 'Could not create that player update');
    } finally {
      setCreatingTransaction(false);
    }
  }

  async function handleLoadStage(stageId) {
    resetNotices();
    setLoadingStageId(stageId);
    try {
      const data = await draftkitApi.loadDemoStage({ stage: stageId });
      setSuccess('Demo league loaded.');
      router.push(data.route || `/league/${data.leagueId}/draft`);
    } catch (err) {
      setError(err.message || 'Could not load that demo league');
    } finally {
      setLoadingStageId('');
    }
  }

  return (
    <section className="space-y-6">
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

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
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

          <form
            className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,42,0.86),rgba(10,14,28,0.92))] p-6 shadow-[0_18px_50px_rgba(3,6,18,0.35)]"
            onSubmit={handleCreateTransaction}
          >
            <SectionHeading
              eyebrow="Player Updates"
              title="Post a player update"
              description="Pick a player, add the update text you want to show, and publish it for demos and testing."
            />

            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500" htmlFor="player-query">
                  Player Name
                </label>
                <input
                  id="player-query"
                  className="input h-12 rounded-2xl border-white/10 bg-slate-950/70 px-4"
                  value={playerQuery}
                  onChange={(event) => setPlayerQuery(event.target.value)}
                  placeholder="Shohei Ohtani"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500" htmlFor="transaction-detail">
                  Update Text
                </label>
                <textarea
                  id="transaction-detail"
                  className="input min-h-32 rounded-[1.2rem] border-white/10 bg-slate-950/70 px-4 py-3"
                  value={transactionDetail}
                  onChange={(event) => setTransactionDetail(event.target.value)}
                  placeholder="Placed on 15-day IL with shoulder inflammation."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PrimaryActionButton type="submit" busy={creatingTransaction}>
                  <Send className="h-4 w-4" />
                  Post Update
                </PrimaryActionButton>
              </div>

              {transactionResult ? (
                <div className="rounded-[1.1rem] border border-cyan-300/12 bg-cyan-300/[0.04] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{transactionResult?.resolvedPlayer?.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{transactionResult?.event?.detail}</p>
                    </div>
                    <Radar className="mt-1 h-4 w-4 text-cyan-200" />
                  </div>
                </div>
              ) : null}
            </div>
          </form>
        </div>

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
      </div>

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
    </section>
  );
}
