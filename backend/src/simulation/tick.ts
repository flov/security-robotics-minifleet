import { listRobotIds, moveRobot } from '../services/robotService.ts'

const INTERVAL_MS = 2000

async function tick(): Promise<void> {
  const ids = await listRobotIds()
  for (const id of ids) {
    await moveRobot(id)
  }
}

export function startSimulation(): () => void {
  const timer = setInterval(() => {
    void tick().catch((err: unknown) => {
      console.error('simulation tick failed', err)
    })
  }, INTERVAL_MS)

  return () => {
    clearInterval(timer)
  }
}
