import KeeperBudgetSummary from './KeeperBudgetSummary';
import KeeperRosterTable from './KeeperRosterTable';
import KeeperTeamTabs from './KeeperTeamTabs';

export default function KeeperBoardView({
  clearEntry,
  currentRows,
  handlePlayerClick,
  handleSaveBoard,
  playerPool,
  rowPlan,
  saveError,
  saving,
  selectedBudget,
  selectedTeam,
  selectedTeamKey,
  setSelectedTeamKey,
  teamOptions,
  updateEntry,
}) {
  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Keeper Board
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {selectedTeam?.teamName || selectedTeam?.teamKey || 'Unknown Team'}
              </h2>
              <p className="text-sm text-slate-600">
                Assign keepers and update contract values.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <KeeperBudgetSummary selectedBudget={selectedBudget} />

              <button
                type="button"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={handleSaveBoard}
              >
                {saving ? 'Saving...' : 'Save Board'}
              </button>
            </div>
          </div>

          <KeeperTeamTabs
            selectedTeamKey={selectedTeamKey}
            setSelectedTeamKey={setSelectedTeamKey}
            teamOptions={teamOptions}
          />
        </div>

        {saveError ? <p className="mt-4 text-sm text-red-600">{saveError}</p> : null}
      </div>

      <div className="panel overflow-hidden">
        <div className="mb-4 rounded-xl border border-slate-700/60 bg-slate-900/55 px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">
                {selectedTeam?.teamName || selectedTeam?.teamKey || 'Unknown Team'}
              </h3>
              <p className="text-sm text-slate-500">
                Manage keeper assignments by roster slot.
              </p>
            </div>
            <KeeperBudgetSummary selectedBudget={selectedBudget} variant="inline" />
          </div>
        </div>

        <KeeperRosterTable
          clearEntry={clearEntry}
          currentRows={currentRows}
          handlePlayerClick={handlePlayerClick}
          playerPool={playerPool}
          rowPlan={rowPlan}
          selectedTeamKey={selectedTeamKey}
          updateEntry={updateEntry}
        />
      </div>
    </div>
  );
}
