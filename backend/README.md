# backend

Express API for the Mini-Fleet monitor. Bun runs the process; Postgres stores users and robots. A timer moves every robot every 2 seconds and broadcasts the new position over WebSocket. The timer starts with the process; authenticated clients can pause and resume it.

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

## Testing

Integration tests call the Express app with [Supertest](https://github.com/ladjs/supertest) against Postgres and Redis. They do not start the simulation timer or WebSocket server.

From the repo root, start the databases, then run the suite from `backend/`:

```bash
docker compose up db redis -d
cp backend/.env.example backend/.env   # skip if backend/.env already exists
cd backend
bun test
```

If Postgres is not reachable, tests fail with `ECONNREFUSED`. Use the Compose `db` service (`localhost:5433` in `.env.example`).

## HTTP

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | no | `{ "ok": true }` |
| POST | `/auth/login` | no | Body `{ "email", "password" }` → `{ "token", "user" }` |
| GET | `/robots` | Bearer JWT | All robots |
| POST | `/robots` | Bearer JWT | Body `{ "name", "lat", "lon" }` → **201** and the created robot (`status` `idle`). Invalidates the Redis list cache. |
| DELETE | `/robots/:id` | Bearer JWT | **204** when the robot is removed. **404** if it does not exist. Invalidates the Redis list cache. |
| POST | `/robots/:id/move` | Bearer JWT | One random step, then the updated robot |
| GET | `/robots/:id/positions` | Bearer JWT | Position history (query `limit`, optional `since` / `until` ISO timestamps). **404** if the robot does not exist. |
| GET | `/simulation` | Bearer JWT | `{ "running": boolean }` |
| POST | `/simulation/start` | Bearer JWT | Start the 2s timer (no-op if already running) |
| POST | `/simulation/stop` | Bearer JWT | Stop the timer (no-op if already stopped) |

Each move sets `status` to `moving`. Seeded robots stay `idle` until the first move.

## WebSocket

Connect to `ws://localhost:4000/ws?token=<jwt>`.

After each move (timer or `POST /robots/:id/move`) every connected client receives:

```json
{ "type": "robot:update", "robot": { "id", "name", "status", "lat", "lon", "updated_at" } }
```

After `DELETE /robots/:id` every connected client receives:

```json
{ "type": "robot:remove", "id": 1 }
```

Updates are published on Redis Pub/Sub (`minifleet:robot:updates`); this process subscribes and forwards them to WebSocket clients. `GET /robots` responses are cached in Redis for 10 seconds. Set `REDIS_URL` (see `.env.example`); Compose provides `redis://redis:6379` for the API service.
