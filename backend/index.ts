import { createServer } from 'node:http'
import { createApp } from './src/app'
import { config } from './src/config'
import { closeDb } from './src/db/client'
import { rethrowDatabaseStartupError } from './src/db/ensureDatabase'
import { runMigrations } from './src/db/migrate'
import { seedIfEmpty } from './src/db/seed'
import { attachWebSocket } from './src/realtime/attachWebSocket'
import { startRobotUpdatesSubscriber } from './src/realtime/redisPubSub.ts'
import { startSimulation, stopSimulation } from './src/simulation/tick'

try {
  await runMigrations()
  await seedIfEmpty()
} catch (error) {
  rethrowDatabaseStartupError(error)
}

const app = createApp()
const server = createServer(app)
const closePubSub = await startRobotUpdatesSubscriber()
const closeWebSocket = attachWebSocket(server)
startSimulation()

server.listen(config.port, () => {
  console.log(`API listening on ${config.port}`)
})

let stopping = false

function shutdown(): void {
  if (stopping) return
  stopping = true
  stopSimulation()
  closePubSub()
  closeWebSocket()
  server.close(() => {
    void closeDb().finally(() => {
      process.exit(0)
    })
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
