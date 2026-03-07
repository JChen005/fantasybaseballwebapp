# DraftKit Backend (`@draftkit/backend`)

Fantasy Baseball Full-stack DraftKit App Backend

Required integration envs:

- `PLAYER_API_LICENSE_KEY`
- `PLAYER_API_LICENSE_CONSUMER` (optional; defaults to `DraftKit Web App`)

Player catalog note:

- The backend seeds player data locally from CSV files on startup and serves it directly from the DraftKit backend.
- This avoids a separate public Render-to-Render player API hop while preserving the licensed-data behavior in app code.

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
