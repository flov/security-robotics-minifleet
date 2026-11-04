import { getApiBaseUrl } from "../config";
import type { Robot } from "../types/robot";

export class RobotsFetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RobotsFetchError";
  }
}

export async function fetchRobots(token: string): Promise<Robot[]> {
  const response = await fetch(`${getApiBaseUrl()}/robots`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = "Failed to load robots";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new RobotsFetchError(message, response.status);
  }

  return (await response.json()) as Robot[];
}

export async function createRobot(
  token: string,
  input: { name: string; lat: number; lon: number },
): Promise<Robot> {
  const response = await fetch(`${getApiBaseUrl()}/robots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "Failed to create robot";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new RobotsFetchError(message, response.status);
  }

  return (await response.json()) as Robot;
}

export async function deleteRobot(token: string, id: number): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/robots/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = "Failed to delete robot";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new RobotsFetchError(message, response.status);
  }
}
