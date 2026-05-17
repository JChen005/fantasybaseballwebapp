# DraftKit Frontend (`@draftkit/frontend`)

Next.js frontend for the DraftKit web application.

## Responsibilities

- authentication pages
- league dashboard
- league config
- keeper board
- draft board, draft actions, and draft sub-views
- session undo/redo with action feedback banner
- roster moves and cross-team slot assignments on the roster view
- league player notes and custom unvalued draft players
- API Center UI for Player API admin and demo league staging
- depth-chart UI through the backend proxy

## Required Environment Variables

- `NEXT_PUBLIC_DRAFTKIT_API_URL`

## Scripts

```bash
npm run dev
npm run build
npm start
npm test
```

## Key Routes

- `/`
- `/register`
- `/login`
- `/dashboard`
- `/league/:leagueId/config`
- `/league/:leagueId/keeper`
- `/league/:leagueId/draft`
- `/league/:leagueId/players/:playerId`
- `/league/:leagueId/taxi`
- `/league/:leagueId/post-draft`
- `/api-center`

## Draft and Keeper Notes

- draft actions operate on persisted `DraftState`
- keeper assignments save into `DraftState.teams[].players`
- the shared league sidebar is used on non-keeper pages
- keeper uses its own player-selection rail
- the UI treats role-need as a webapp-owned fantasy rule, not a Player API concern

### Draft views (`/league/:leagueId/draft`)

Query param `view` selects a sub-view (default: draft board):

| `view` | Tab label | Purpose |
| --- | --- | --- |
| `draft` | Draft Board | Valuation pool, search/filters, draft control panel, undo/redo |
| `stats` | Player Stats | Sortable last-season stats for the valuation pool |
| `roster` | Team Roster | Roster grid, slot moves, undo/redo |
| `recent` | Draft History | Pick log |
| `depth` | Player Depth | MLB depth charts via Player API proxy |

### Session undo / redo

- implemented in `draft/hooks/` (composed by `useDraftPageData.js`) with a client-side action log (up to 50 entries)
- each entry stores a human-readable description plus before/after snapshots of teams, picks, and `currentPickNumber`
- covers drafting a player and moving/trading players on the roster view
- after undo or redo, a page-level banner shows what was reversed or restored (auto-dismisses after 6 seconds)
- new draft/roster actions clear the redo stack and dismiss any history banner

### Other draft UX

- **Player notes**: saved per league via `leagueApi.createPlayerNote` from expanded draft-board rows
- **Custom players**: manually entered names/positions for players not in the Player API catalog
- **Transaction notifications**: the draft board polls `/api/player/transactions/recent` and surfaces mock alerts (typically created from API Center)

## Key Modules

- `src/app/(protected)/league/[leagueId]/config/page.js`
- `src/app/(protected)/league/[leagueId]/keeper/page.js`
- `src/app/(protected)/league/[leagueId]/draft/page.js`
- `src/app/(protected)/league/[leagueId]/draft/useDraftPageData.js` (composer)
- `src/app/(protected)/league/[leagueId]/draft/hooks/` (core data, board search, player selection, roster moves, undo/redo, depth, lookup, notifications)
- `src/app/(protected)/api-center/page.js`
- `src/components/sidebar.js`
- `src/components/KeeperPlayerRail.js`
- `src/lib/leagueApi.js`
- `src/lib/playerApi.js`
- `src/lib/draftkitApi.js`
