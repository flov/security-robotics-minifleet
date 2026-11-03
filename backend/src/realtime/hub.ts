import { WebSocket } from "ws";
import type { Robot } from "../services/robotService.ts";

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
}

export function removeClient(ws: WebSocket): void {
  clients.delete(ws);
}

export function broadcastRobot(robot: Robot): void {
  const payload = JSON.stringify({ type: "robot:update", robot });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
