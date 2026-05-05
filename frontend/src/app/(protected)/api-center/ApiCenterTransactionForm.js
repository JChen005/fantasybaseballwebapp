import { Send } from 'lucide-react';
import { PrimaryActionButton, SectionHeading } from './ApiCenterPrimitives';

export default function ApiCenterTransactionForm({
  creatingTransaction,
  handleCreateTransaction,
  playerQuery,
  setPlayerQuery,
  setTransactionDetail,
  transactionDetail,
  transactionMessage,
}) {
  return (
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
          {transactionMessage ? (
            <p className="text-sm font-medium text-emerald-100" role="status" aria-live="polite">
              {transactionMessage}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
