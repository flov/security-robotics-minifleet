import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
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

export const robotPositions = pgTable(
  "robot_positions",
  {
    id: serial("id").primaryKey(),
    robotId: integer("robot_id")
      .notNull()
      .references(() => robots.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    status: text("status").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "robot_positions_status_check",
      sql`${table.status} IN ('idle', 'moving')`,
    ),
    index("robot_positions_robot_id_recorded_at_idx").on(
      table.robotId,
      table.recordedAt,
    ),
  ],
);
