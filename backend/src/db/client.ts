import postgres from "postgres";
import { config } from "../config.ts";

export const sql = postgres(config.databaseUrl, { max: 10 });

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
