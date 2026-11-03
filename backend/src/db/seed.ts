import bcrypt from "bcrypt";
import { count, eq } from "drizzle-orm";
import { db } from "./client.ts";
import { robots, users } from "./schema.ts";

const SEED_EMAIL = "admin@test.com";
const SEED_PASSWORD = "test123";

const SEED_ROBOTS = [
  { name: "Alpha", lat: 51.34, lon: 12.373 },
  { name: "Beta", lat: 51.335, lon: 12.368 },
  { name: "Gamma", lat: 51.345, lon: 12.378 },
] as const;

export async function seedIfEmpty(): Promise<void> {
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SEED_EMAIL))
    .limit(1);

  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    await db.insert(users).values({ email: SEED_EMAIL, passwordHash });
  }

  const [row] = await db.select({ value: count() }).from(robots);
  const robotCount = row?.value ?? 0;
  if (robotCount === 0) {
    await db.insert(robots).values(
      SEED_ROBOTS.map((robot) => ({
        name: robot.name,
        status: "idle",
        lat: robot.lat,
        lon: robot.lon,
      })),
    );
  }
}
