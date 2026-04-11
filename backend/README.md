# DraftKit Backend (`@draftkit/backend`)

Express + MongoDB backend for the DraftKit web application.

## Responsibilities

- authentication and session-backed app access
- league CRUD
- persisted `DraftState` storage per league
- Player API proxy routes
- fantasy-rule enrichment used by the webapp

`DraftState` ownership lives here, not in the Player API.

## Canonical Data Rules

- `teams[].players` is the canonical current room state
- `picks[]` is optional history only
- keeper assignments are stored in `teams[].players`
- budget totals are recomputed from persisted players

## Required Environment Variables

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_ORIGIN`
- `PLAYER_API_BASE_URL`
- `PLAYER_API_LICENSE_KEY`
- `PLAYER_API_ADMIN_SECRET`

## Scripts

```bash
npm run dev
npm start
npm test
```

## Main Route Groups

### Health and Auth

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Leagues and Draft State

- `GET /api/leagues`
- `POST /api/leagues`
- `GET /api/leagues/:leagueId`
- `PUT /api/leagues/:leagueId`
- `DELETE /api/leagues/:leagueId`
- `GET /api/leagues/:leagueId/draft-state`
- `PUT /api/leagues/:leagueId/draft-state`

### Player Proxy

- `GET /api/player/health`
- `GET /api/player/players`
- `GET /api/player/players/search`
- `POST /api/player/valuations/players`
- `GET /api/player/players/:playerId`
- `GET /api/player/players/:playerId/transactions`
- `GET /api/player/stats/league-averages`
- `GET /api/player/teams/:teamId/depth-chart`
- `GET /api/player/docs/openapi`

## Key Modules

- `src/models/League.js`
- `src/models/DraftState.js`
- `src/services/leagueService.js`
- `src/services/fantasyRules.js`
- `src/routes/leagueRoutes.js`
- `src/routes/playerProxyRoutes.js`
