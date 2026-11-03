import { sql } from "../db/client.ts";
import { broadcastRobot } from "../realtime/hub.ts";

export type RobotStatus = "idle" | "moving";

export type Robot = {
  id: number;
  name: string;
  status: RobotStatus;
  lat: number;
  lon: number;
  updated_at: string;
};

type RobotRow = {
  id: number;
  name: string;
  status: string;
  lat: number;
  lon: number;
  updated_at: Date;
};

const STEP_DEGREES = 0.002;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapRobot(row: RobotRow): Robot {
  if (row.status !== "idle" && row.status !== "moving") {
    throw new Error(`Unexpected robot status: ${row.status}`);
  }
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    lat: row.lat,
    lon: row.lon,
    updated_at: row.updated_at.toISOString(),
  };
}

function nextPosition(lat: number, lon: number): { lat: number; lon: number } {
  return {
    lat: clamp(lat + (Math.random() - 0.5) * STEP_DEGREES, -90, 90),
    lon: clamp(lon + (Math.random() - 0.5) * STEP_DEGREES, -180, 180),
  };
}

export async function listRobots(): Promise<Robot[]> {
  const rows = await sql<RobotRow[]>`
    SELECT id, name, status, lat, lon, updated_at
    FROM robots
    ORDER BY id
  `;
  return rows.map(mapRobot);
}

export async function listRobotIds(): Promise<number[]> {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM robots ORDER BY id
  `;
  return rows.map((row) => row.id);
}

/** Applies a small random step and marks the robot as moving. */
export async function moveRobot(id: number): Promise<Robot | null> {
  const current = await sql<{ id: number; lat: number; lon: number }[]>`
    SELECT id, lat, lon FROM robots WHERE id = ${id}
  `;
  const robot = current[0];
  if (!robot) return null;

  const next = nextPosition(robot.lat, robot.lon);
  const updated = await sql<RobotRow[]>`
    UPDATE robots
    SET lat = ${next.lat},
        lon = ${next.lon},
        status = 'moving',
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, name, status, lat, lon, updated_at
  `;
  const row = updated[0];
  if (!row) return null;

  const mapped = mapRobot(row);
  broadcastRobot(mapped);
  return mapped;
}
