# DraftKit Frontend (`@draftkit/frontend`)

Fantasy baseball DraftKit frontend.

Required env:

- `NEXT_PUBLIC_DRAFTKIT_API_URL`

Deployment note:

- Point this frontend at the separate DraftKit backend deployment.

## Current Responsibilities

- authentication pages
- league dashboard
- league config, keeper, taxi, and draft routes
- draft valuation UI backed by persisted `DraftState`
- depth-chart browser UI backed by the Player API proxy

The draft route currently:

- loads the league from the webapp backend
- loads persisted `DraftState`
- builds valuation exclusions from `DraftState.teams[].players`
- requests player valuations from the backend proxy
- renders `baseValue`, `marketValue`, `adjustedValue`, and `fillsNeed`

## Key Pages

- `/`
- `/register`
- `/login`
- `/dashboard`
- `/league/:leagueId/config`
- `/league/:leagueId/keeper`
- `/league/:leagueId/draft`
- `/league/:leagueId/players/:playerId`
- `/league/:leagueId/taxi`
- `/api-center`
