# DraftKit Backend (`@draftkit/backend`)

Fantasy baseball DraftKit application backend.

Required integration envs:

- `PLAYER_API_BASE_URL`
- `PLAYER_API_LICENSE_KEY`
- `PLAYER_API_ADMIN_SECRET`

Deployment note:

- This backend is meant to run separately from the Player API and point to it through `PLAYER_API_BASE_URL`.

## Current Responsibilities

- auth and session-backed app access
- league CRUD
- persisted `DraftState` per league
- Player API proxy routes for players, valuations, depth charts, and docs

`DraftState` ownership lives here, not in the Player API.

Canonical draft-state rule:

- `teams[].players` = current room state
- `picks[]` = optional history log

## Core API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/leagues`
- `POST /api/leagues`
- `GET /api/leagues/:leagueId`
- `DELETE /api/leagues/:leagueId`
- `GET /api/leagues/:leagueId/draft-state`
- `PUT /api/leagues/:leagueId/draft-state`

## Player Proxy API

- `GET /api/player/health`
- `GET /api/player/players`
- `GET /api/player/players/search`
- `POST /api/player/valuations/players`
- `GET /api/player/players/:playerId`
- `GET /api/player/players/:playerId/transactions`
- `GET /api/player/stats/league-averages`
- `GET /api/player/teams/:teamId/depth-chart`
- `GET /api/player/docs/openapi`

## API Center Endpoints

- `GET /api/api-center/license-status`
- `POST /api/api-center/admin/mock-transaction`

## Draft Valuation Flow

1. frontend loads the league and persisted `DraftState`
2. backend returns the saved room state
3. frontend builds valuation exclusions from `DraftState.teams[].players`
4. backend proxies `POST /api/player/valuations/players` to the Player API
5. Player API returns `baseValue`, `marketValue`, and `adjustedValue`
