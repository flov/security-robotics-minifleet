import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.ts";
import { listRobots, moveRobot } from "../services/robotService.ts";

export const robotsRouter = Router();

robotsRouter.get("/", requireAuth, async (_req, res) => {
  const robots = await listRobots();
  res.json(robots);
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
