import type { Robot } from "../types/robot";

export function mergeRobotUpdate(robots: Robot[], updated: Robot): Robot[] {
  const index = robots.findIndex((r) => r.id === updated.id);
  if (index === -1) {
    return [...robots, updated];
  }
  const next = robots.slice();
  next[index] = updated;
  return next;
}

export function parseRobotRemoveMessage(raw: string): number | null {
  try {
    const message = JSON.parse(raw) as { type?: string; id?: unknown };
    if (message.type !== "robot:remove" || typeof message.id !== "number") {
      return null;
    }
    return message.id;
  } catch {
    return null;
  }
}

export function parseRobotUpdateMessage(raw: string): Robot | null {
  try {
    const message = JSON.parse(raw) as { type?: string; robot?: Robot };
    if (message.type !== "robot:update" || !message.robot) {
      return null;
    }
    const { robot } = message;
    if (
      typeof robot.id !== "number" ||
      typeof robot.name !== "string" ||
      typeof robot.lat !== "number" ||
      typeof robot.lon !== "number" ||
      typeof robot.updated_at !== "string"
    ) {
      return null;
    }
    return robot;
  } catch {
    return null;
  }
}
