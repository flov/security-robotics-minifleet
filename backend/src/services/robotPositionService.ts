import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db/client.ts";
import { robotPositions } from "../db/schema.ts";
import type { RobotStatus } from "./robotService.ts";

export type RobotPosition = {
  id: number;
  robot_id: number;
  lat: number;
  lon: number;
  status: RobotStatus;
  recorded_at: string;
};

type PositionRow = typeof robotPositions.$inferSelect;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function mapPosition(row: PositionRow): RobotPosition {
  if (row.status !== "idle" && row.status !== "moving") {
    throw new Error(`Unexpected robot status: ${row.status}`);
  }
  return {
    id: row.id,
    robot_id: row.robotId,
    lat: row.lat,
    lon: row.lon,
    status: row.status,
    recorded_at: row.recordedAt.toISOString(),
  };
}

export async function insertRobotPosition(
  tx: Pick<typeof db, "insert">,
  input: {
    robotId: number;
    lat: number;
    lon: number;
    status: RobotStatus;
  },
): Promise<void> {
  await tx.insert(robotPositions).values({
    robotId: input.robotId,
    lat: input.lat,
    lon: input.lon,
    status: input.status,
  });
}

export async function listRobotPositions(
  robotId: number,
  options: { limit?: number; since?: Date; until?: Date } = {},
): Promise<RobotPosition[]> {
  const limit = Math.min(
    Math.max(1, options.limit ?? DEFAULT_LIMIT),
    MAX_LIMIT,
  );

  const conditions = [eq(robotPositions.robotId, robotId)];
  if (options.since) {
    conditions.push(gte(robotPositions.recordedAt, options.since));
  }
  if (options.until) {
    conditions.push(lte(robotPositions.recordedAt, options.until));
  }

  const rows = await db
    .select()
    .from(robotPositions)
    .where(and(...conditions))
    .orderBy(desc(robotPositions.recordedAt))
    .limit(limit);

  return rows.reverse().map(mapPosition);
}

export async function robotExists(robotId: number): Promise<boolean> {
  const { robots } = await import("../db/schema.ts");
  const rows = await db
    .select({ id: robots.id })
    .from(robots)
    .where(eq(robots.id, robotId))
    .limit(1);
  return rows.length > 0;
}
