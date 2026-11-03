import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config.ts";
const queryClient = postgres(config.databaseUrl, { max: 10 });

export const db = drizzle({ client: queryClient });

export async function closeDb(): Promise<void> {
  await queryClient.end({ timeout: 5 });
}
