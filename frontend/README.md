# Frontend

Next.js app for the Mini-Fleet monitor: login, dashboard with OpenLayers map, robot table, WebSocket live updates, and Start/Stop controls for the server simulation.

## Setup

Requires the API on port **4000** (see repo root [README](../README.md)).

```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > .env.local
bun install
bun run dev
```

Open http://localhost:3000/login — demo user `admin@test.com` / `test123`.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Dev server (default port 3000) |
| `bun run build` | Production build |
| `bun run start` | Production server |
| `bun run lint` | ESLint |

## Docker

Built and run via root `docker compose up` (service `frontend` on port 3000).
