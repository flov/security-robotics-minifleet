import { listRobotIds, moveRobot } from '../services/robotService.ts'

const INTERVAL_MS = 2000

let stopTimer: (() => void) | null = null

async function tick(): Promise<void> {
  const ids = await listRobotIds()
  for (const id of ids) {
    await moveRobot(id)
  }
}

export function isSimulationRunning(): boolean {
  return stopTimer !== null
}

export function startSimulation(): () => void {
  if (stopTimer !== null) {
    return stopTimer
  }

  const timer = setInterval(() => {
    void tick().catch((err: unknown) => {
      console.error('simulation tick failed', err)
    })
  }, INTERVAL_MS)

  const stop = () => {
    clearInterval(timer)
    if (stopTimer === stop) {
      stopTimer = null
    }
  }
  stopTimer = stop
  return stop
}

export function stopSimulation(): void {
  stopTimer?.()
}
