import { createServer } from "node:http";
import { createApp } from "./src/app.ts";
import { config } from "./src/config.ts";
import { closeDb } from "./src/db/client.ts";
import { rethrowDatabaseStartupError } from "./src/db/ensureDatabase.ts";
import { runMigrations } from "./src/db/migrate.ts";
import { seedIfEmpty } from "./src/db/seed.ts";
import { attachWebSocket } from "./src/realtime/attachWebSocket.ts";
import { startSimulation } from "./src/simulation/tick.ts";

try {
  await runMigrations();
  await seedIfEmpty();
} catch (error) {
  rethrowDatabaseStartupError(error);
}

const app = createApp();
const server = createServer(app);
const closeWebSocket = attachWebSocket(server);
const stopSimulation = startSimulation();

server.listen(config.port, () => {
  console.log(`API listening on ${config.port}`);
});

let stopping = false;

function shutdown(): void {
  if (stopping) return;
  stopping = true;
  stopSimulation();
  closeWebSocket();
  server.close(() => {
    void closeDb().finally(() => {
      process.exit(0);
    });
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
