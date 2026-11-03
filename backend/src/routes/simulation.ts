import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.ts";
import {
  isSimulationRunning,
  startSimulation,
  stopSimulation,
} from "../simulation/tick.ts";

export const simulationRouter = Router();

simulationRouter.use(requireAuth);

simulationRouter.get("/", (_req, res) => {
  res.json({ running: isSimulationRunning() });
});

simulationRouter.post("/start", (_req, res) => {
  startSimulation();
  res.json({ running: true });
});

simulationRouter.post("/stop", (_req, res) => {
  stopSimulation();
  res.json({ running: false });
});
