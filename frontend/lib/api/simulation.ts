import { getApiBaseUrl } from "../config";
import { RobotsFetchError } from "./robots";

export type SimulationStatus = {
  running: boolean;
};

async function requestSimulation(
  token: string,
  path: string,
  method: "GET" | "POST",
): Promise<SimulationStatus> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = "Simulation request failed";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new RobotsFetchError(message, response.status);
  }

  return (await response.json()) as SimulationStatus;
}

export function fetchSimulationStatus(token: string): Promise<SimulationStatus> {
  return requestSimulation(token, "/simulation", "GET");
}

export function startSimulation(token: string): Promise<SimulationStatus> {
  return requestSimulation(token, "/simulation/start", "POST");
}

export function stopSimulation(token: string): Promise<SimulationStatus> {
  return requestSimulation(token, "/simulation/stop", "POST");
}
