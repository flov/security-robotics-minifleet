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
