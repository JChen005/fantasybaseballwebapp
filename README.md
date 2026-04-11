# DraftKit Web App

DraftKit is split into two applications in this repo:

- `backend/`: authenticated app backend for leagues, persisted draft state, and Player API proxy routes
- `frontend/`: Next.js app for auth, dashboard, league setup, keeper board, draft board, and post-draft flows

The Player API is a separate service. This repo does not own player sync or raw valuation generation. It owns league state, fantasy workflow rules, and the web UI around them.

## Architecture

The webapp backend is the source of truth for league state:

- `League` stores league config
- `DraftState` stores the canonical current room state
- `DraftState.teams[].players` is the current roster state by team
- `DraftState.picks[]` is optional history only

The draft and keeper flows both write into `DraftState`.

The webapp backend also owns fantasy roster interpretation:

- canonical slot mapping such as `1B`, `2B`, `3B`, `SS`, `OF`, `UTIL`, `P`, `BN`
- keeper and draft slot assignment
- role-need / open-slot logic for the webapp

The Player API remains an external dependency for:

- player catalog and search
- valuation payloads
- depth charts and player stats

## Repo Layout

```text
backend/   Express + MongoDB backend
frontend/  Next.js frontend
```

## Local Development

### 1. Install dependencies

```bash
cd /backend
npm install

cd /frontend
npm install
```

### 2. Configure environment

Backend requires:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_ORIGIN`
- `PLAYER_API_BASE_URL`
- `PLAYER_API_LICENSE_KEY`
- `PLAYER_API_ADMIN_SECRET`

Frontend requires:

- `NEXT_PUBLIC_DRAFTKIT_API_URL`

### 3. Start the backend

```bash
cd /backend
npm run dev
```

Default local backend port:

- `4040`

### 4. Start the frontend

```bash
cd /frontend
npm run dev
```

Default local frontend port:

- `3030`

### 5. Start the Player API separately

The webapp expects a separate Player API service, usually on:

- `http://localhost:5050`

If that service is down, draft valuations and depth-chart views will fail.

## Current Product Areas

- auth and session-backed app access
- league dashboard and league config
- keeper board with contract support
- draft board with persisted draft actions and undo support
- player lookup and valuation pool browsing
- budget and roster summaries
- depth-chart browsing

## Core Backend Routes

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/leagues`
- `POST /api/leagues`
- `GET /api/leagues/:leagueId`
- `PUT /api/leagues/:leagueId`
- `DELETE /api/leagues/:leagueId`
- `GET /api/leagues/:leagueId/draft-state`
- `PUT /api/leagues/:leagueId/draft-state`

## Player Proxy Routes

- `GET /api/player/health`
- `GET /api/player/players`
- `GET /api/player/players/search`
- `POST /api/player/valuations/players`
- `GET /api/player/players/:playerId`
- `GET /api/player/players/:playerId/transactions`
- `GET /api/player/stats/league-averages`
- `GET /api/player/teams/:teamId/depth-chart`
- `GET /api/player/docs/openapi`

## Data Model Notes

- keeper players are saved in `DraftState.teams[].players`
- keeper players are not appended to `DraftState.picks[]`
- drafted players update `DraftState.teams[]` and may also append to `DraftState.picks[]`
- budget totals are recomputed from stored players that count against budget

## Package Docs

- backend/README.md
- frontend/README.md
