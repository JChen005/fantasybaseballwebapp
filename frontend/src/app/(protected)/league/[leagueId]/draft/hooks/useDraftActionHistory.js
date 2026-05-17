import { useCallback, useEffect, useState } from "react";
import { leagueApi } from "lib/leagueApi";
import { ACTION_HISTORY_LIMIT } from "./draftSnapshotUtils";

export function useDraftActionHistory({
  leagueId,
  draftState,
  refreshDraftBoard,
  onHistoryApplied,
  setDraftActionError = () => {},
  setRosterMoveError = () => {},
}) {
  const [isProcessingHistory, setIsProcessingHistory] = useState(false);
  const [historyBanner, setHistoryBanner] = useState(null);
  const [actionLog, setActionLog] = useState({ past: [], future: [] });

  const recordAction = useCallback((description, prev, next) => {
    setHistoryBanner(null);
    setActionLog((current) => {
      const nextPast = [...current.past, { description, prev, next }];
      const trimmed = nextPast.slice(-ACTION_HISTORY_LIMIT);
      return { past: trimmed, future: [] };
    });
  }, []);

  const dismissHistoryBanner = useCallback(() => {
    setHistoryBanner(null);
  }, []);

  useEffect(() => {
    if (!historyBanner) return undefined;

    const timeoutId = setTimeout(() => {
      setHistoryBanner(null);
    }, 6000);

    return () => clearTimeout(timeoutId);
  }, [historyBanner]);

  async function applyHistorySnapshot(snapshot) {
    await leagueApi.updateDraftState(leagueId, {
      userTeamKey: draftState?.userTeamKey,
      nominationTeamKey: draftState?.nominationTeamKey,
      currentPickNumber: snapshot.currentPickNumber,
      teams: snapshot.teams,
      picks: snapshot.picks,
      redoStack: [],
    });
  }

  async function handleUndo() {
    if (!actionLog.past.length) {
      setDraftActionError("Nothing to undo.");
      return;
    }

    const entry = actionLog.past[actionLog.past.length - 1];

    try {
      setIsProcessingHistory(true);
      setDraftActionError("");
      setRosterMoveError("");

      await applyHistorySnapshot(entry.prev);

      setActionLog((current) => ({
        past: current.past.slice(0, -1),
        future: [...current.future, entry],
      }));

      onHistoryApplied();
      setHistoryBanner({ type: "undo", description: entry.description });

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to undo last action");
    } finally {
      setIsProcessingHistory(false);
    }
  }

  async function handleRedo() {
    if (!actionLog.future.length) {
      setDraftActionError("Nothing to redo.");
      return;
    }

    const entry = actionLog.future[actionLog.future.length - 1];

    try {
      setIsProcessingHistory(true);
      setDraftActionError("");
      setRosterMoveError("");

      await applyHistorySnapshot(entry.next);

      setActionLog((current) => ({
        past: [...current.past, entry],
        future: current.future.slice(0, -1),
      }));

      onHistoryApplied();
      setHistoryBanner({ type: "redo", description: entry.description });

      await refreshDraftBoard({ silent: true });
    } catch (err) {
      setDraftActionError(err.message || "Failed to redo last action");
    } finally {
      setIsProcessingHistory(false);
    }
  }

  return {
    recordAction,
    handleUndo,
    handleRedo,
    canUndo: actionLog.past.length > 0,
    canRedo: actionLog.future.length > 0,
    nextUndoDescription:
      actionLog.past[actionLog.past.length - 1]?.description || "",
    nextRedoDescription:
      actionLog.future[actionLog.future.length - 1]?.description || "",
    isProcessingHistory,
    historyBanner,
    dismissHistoryBanner,
  };
}
