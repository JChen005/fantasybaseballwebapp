# DraftKit Web App

This repo contains the DraftKit web application:

- `backend/`: authenticated app backend, league management, persisted `DraftState`, and Player API proxy routes
- `frontend/`: Next.js app for auth, dashboard, league configuration, draft valuations, and depth-chart browsing

Current architecture:

- live room state is persisted in the webapp backend as `DraftState`
- the Player API is treated as a separate external service
- the draft page builds valuation requests from persisted `DraftState.teams`
- `DraftState.teams[].players` is the canonical current room state
- `DraftState.picks[]` is optional history only
