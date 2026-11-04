import { afterAll, beforeAll } from "bun:test";

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "REDIS_URL"] as const;

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing ${missing.join(", ")}. Copy backend/.env.example to backend/.env and start Postgres and Redis. See backend/README.md (Testing).`,
  );
}

beforeAll(async () => {
  try {
    const { runMigrations } = await import("../src/db/migrate.ts");
    const { seedIfEmpty } = await import("../src/db/seed.ts");
    await runMigrations();
    await seedIfEmpty();
  } catch (error) {
    const { rethrowDatabaseStartupError } = await import("../src/db/ensureDatabase.ts");
    rethrowDatabaseStartupError(error);
  }
});

afterAll(async () => {
  const { stopSimulation } = await import("../src/simulation/tick.ts");
  stopSimulation();
  const { closeDb } = await import("../src/db/client.ts");
  await closeDb();
});
