import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.ts";
import { createRobot, deleteRobot, listRobots, moveRobot } from "../services/robotService.ts";
import {
  listRobotPositions,
  robotExists,
} from "../services/robotPositionService.ts";

export const robotsRouter = Router();

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseOptionalIsoDate(value: unknown): Date | { error: string } | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    return { error: "Invalid date parameter" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "Invalid date parameter" };
  }
  return date;
}

function parseCreateRobotBody(
  body: unknown,
): { name: string; lat: number; lon: number } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Name, lat, and lon required" };
  }
  const { name, lat, lon } = body as { name?: unknown; lat?: unknown; lon?: unknown };
  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "Name is required" };
  }
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be a number between -90 and 90" };
  }
  if (typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { error: "Longitude must be a number between -180 and 180" };
  }
  return { name: name.trim(), lat, lon };
}

robotsRouter.get("/", requireAuth, async (_req, res) => {
  const robots = await listRobots();
  res.json(robots);
});

robotsRouter.get("/:id/positions", requireAuth, async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const limitRaw = req.query.limit;
  let limit: number | undefined;
  if (limitRaw !== undefined) {
    const parsed = parsePositiveInt(limitRaw);
    if (parsed === null) {
      res.status(400).json({ error: "Invalid limit" });
      return;
    }
    limit = parsed;
  }

  const since = parseOptionalIsoDate(req.query.since);
  if (since && "error" in since) {
    res.status(400).json({ error: since.error });
    return;
  }
  const until = parseOptionalIsoDate(req.query.until);
  if (until && "error" in until) {
    res.status(400).json({ error: until.error });
    return;
  }

  if (!(await robotExists(id))) {
    res.status(404).json({ error: "Robot not found" });
    return;
  }

  const positions = await listRobotPositions(id, { limit, since, until });
  res.json(positions);
});

robotsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = parseCreateRobotBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const robot = await createRobot(parsed);
  res.status(201).json(robot);
});

robotsRouter.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const deleted = await deleteRobot(id);
  if (!deleted) {
    res.status(404).json({ error: "Robot not found" });
    return;
  }

  res.status(204).end();
});

robotsRouter.post("/:id/move", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const robot = await moveRobot(id);
  if (!robot) {
    res.status(404).json({ error: "Robot not found" });
    return;
  }

  res.json(robot);
});
