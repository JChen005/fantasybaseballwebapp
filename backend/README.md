# DraftKit Backend (`@draftkit/backend`)

Fantasy Baseball Full-stack DraftKit App Backend

Required integration envs:

- `PLAYER_API_BASE_URL`
- `PLAYER_API_LICENSE_KEY`
- `PLAYER_API_ADMIN_SECRET`

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
- `PATCH /api/leagues/:leagueId/config`

## Player Proxy API

- `GET /api/player/health`
- `GET /api/player/players`
- `GET /api/player/players/search`
- `GET /api/player/players/:playerId`
- `GET /api/player/players/:playerId/transactions`
- `GET /api/player/stats/league-averages`
- `GET /api/player/docs/openapi`

## API Center Endpoints

- `GET /api/api-center/license-status`
- `GET /api/api-center/transactions/stream`
- `POST /api/api-center/admin/mock-transaction`
- `POST /api/api-center/admin/sync`
