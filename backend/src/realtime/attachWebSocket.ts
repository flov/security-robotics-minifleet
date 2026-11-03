import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { verifyToken } from "../services/authService.ts";
import { addClient, removeClient } from "./hub.ts";

function rejectUpgrade(socket: Duplex, status: number, message: string): void {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

export function attachWebSocket(server: Server): () => void {
  const wss = new WebSocketServer({ noServer: true });

  function onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname !== "/ws") {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    const token = url.searchParams.get("token");
    if (!token || !verifyToken(token)) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      addClient(ws);
      ws.on("close", () => {
        removeClient(ws);
      });
    });
  }

  server.on("upgrade", onUpgrade);

  return () => {
    server.off("upgrade", onUpgrade);
    for (const client of wss.clients) {
      client.close();
    }
    wss.close();
  };
}
