# backend

Express API for the Mini-Fleet monitor. Bun runs the process; Postgres stores users and robots. A timer moves every robot every 2 seconds and broadcasts the new position over WebSocket.

## Setup

From the repo root, start Postgres and Redis, then the API:

```bash
docker compose up --build
```

To run the API on the host instead (Postgres and Redis still from Compose):

```bash
docker compose up db -d
cp backend/.env.example backend/.env
cd backend
bun install
bun run dev
```

Postgres must be reachable at `localhost:5433` (see `DATABASE_URL`). If `bun run dev` fails with `ECONNREFUSED`, start the database service above.

If Compose is already running the **api** service on port 4000, either stop it (`docker compose stop api`) or set a different `PORT` in `backend/.env` (see `.env.example`).

The example user is `admin@test.com` / `test123`.

Database schema is managed with [Drizzle](https://orm.drizzle.team/). On startup the API runs migrations and seeds demo data if tables are empty.

```bash
bun run db:generate   # after schema changes
bun run db:migrate    # apply migrations (also runs automatically on API start)
bun run db:studio     # browse data
```

## HTTP

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | no | `{ "ok": true }` |
| POST | `/auth/login` | no | Body `{ "email", "password" }` → `{ "token", "user" }` |
| GET | `/robots` | Bearer JWT | All robots |
| POST | `/robots/:id/move` | Bearer JWT | One random step, then the updated robot |

Each move sets `status` to `moving`. Seeded robots stay `idle` until the first move.

## WebSocket

Connect to `ws://localhost:4000/ws?token=<jwt>`.

After each move (timer or `POST /robots/:id/move`) every connected client receives:

```json
{ "type": "robot:update", "robot": { "id", "name", "status", "lat", "lon", "updated_at" } }
```

Redis is started by Compose but this API does not use it.
