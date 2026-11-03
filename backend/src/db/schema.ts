import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const robots = pgTable(
  "robots",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("robots_status_check", sql`${table.status} IN ('idle', 'moving')`)],
);
