# DraftKit Frontend (`@draftkit/frontend`)

Next.js frontend for the DraftKit web application.

## Responsibilities

- authentication pages
- league dashboard
- league config
- keeper board
- draft board and draft actions
- roster and budget views
- player lookup and valuation pool views
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

## Key Modules

- `src/app/(protected)/league/[leagueId]/config/page.js`
- `src/app/(protected)/league/[leagueId]/keeper/page.js`
- `src/app/(protected)/league/[leagueId]/draft/page.js`
- `src/components/sidebar.js`
- `src/components/KeeperPlayerRail.js`
- `src/lib/leagueApi.js`
- `src/lib/playerApi.js`
