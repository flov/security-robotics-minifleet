import { WebSocket } from "ws";
import type { Robot } from "../services/robotService.ts";

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket): void {
  clients.add(ws);
}

export function removeClient(ws: WebSocket): void {
  clients.delete(ws);
}

function send(payload: string): void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function broadcastRobot(robot: Robot): void {
  send(JSON.stringify({ type: "robot:update", robot }));
}

export function broadcastRobotRemoved(id: number): void {
  send(JSON.stringify({ type: "robot:remove", id }));
}
