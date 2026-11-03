import { listRobotIds, moveRobot } from '../services/robotService.ts'

const INTERVAL_MS = 2000

let timer: ReturnType<typeof setInterval> | null = null

async function tick(): Promise<void> {
  const ids = await listRobotIds()
  for (const id of ids) {
    await moveRobot(id)
  }
}

export function isSimulationRunning(): boolean {
  return timer !== null
}

export function startSimulation(): void {
  if (timer !== null) return

  timer = setInterval(() => {
    void tick().catch((err: unknown) => {
      console.error('simulation tick failed', err)
    })
  }, INTERVAL_MS)
}

export function stopSimulation(): void {
  if (timer === null) return
  clearInterval(timer)
  timer = null
}
