// Max number of session edits we retain for undo/redo. Each entry stores
// before/after snapshots of teams + picks + currentPickNumber.
export const ACTION_HISTORY_LIMIT = 50;

export function cloneDraftSnapshot(snapshot) {
  try {
    return structuredClone(snapshot);
  } catch {
    return JSON.parse(JSON.stringify(snapshot));
  }
}

export function buildDraftSnapshot({ teams, picks, currentPickNumber }) {
  return cloneDraftSnapshot({
    teams: Array.isArray(teams) ? teams : [],
    picks: Array.isArray(picks) ? picks : [],
    currentPickNumber:
      Number(currentPickNumber) > 0 ? Number(currentPickNumber) : 1,
  });
}
