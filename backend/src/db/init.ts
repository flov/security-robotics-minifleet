import bcrypt from "bcrypt";
import { sql } from "./client.ts";

const SEED_EMAIL = "admin@test.com";
const SEED_PASSWORD = "test123";

const SEED_ROBOTS = [
  { name: "Alpha", lat: 52.52, lon: 13.405 },
  { name: "Beta", lat: 52.5, lon: 13.38 },
  { name: "Gamma", lat: 52.54, lon: 13.42 },
] as const;

export async function initDb(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS robots (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('idle', 'moving')),
      lat DOUBLE PRECISION NOT NULL,
      lon DOUBLE PRECISION NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const existingUsers = await sql<{ id: number }[]>`
    SELECT id FROM users WHERE email = ${SEED_EMAIL}
  `;
  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${SEED_EMAIL}, ${passwordHash})
    `;
  }

  const counts = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM robots
  `;
  const robotCount = counts[0]?.count ?? 0;
  if (robotCount === 0) {
    for (const robot of SEED_ROBOTS) {
      await sql`
        INSERT INTO robots (name, status, lat, lon)
        VALUES (${robot.name}, 'idle', ${robot.lat}, ${robot.lon})
      `;
    }
  }
}
