import { RedisClient, redis } from 'bun'
import type { Robot } from '../services/robotService.ts'
import { broadcastRobot, broadcastRobotRemoved } from './hub.ts'

export const ROBOT_UPDATES_CHANNEL = 'minifleet:robot:updates'

function redisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379'
}

function parseRobotUpdateMessage(message: string): Robot | null {
  try {
    const parsed = JSON.parse(message) as { type?: string; robot?: Robot }
    if (parsed.type !== 'robot:update' || !parsed.robot) return null
    return parsed.robot
  } catch {
    return null
  }
}

function parseRobotRemoveMessage(message: string): number | null {
  try {
    const parsed = JSON.parse(message) as { type?: string; id?: unknown }
    if (parsed.type !== 'robot:remove' || typeof parsed.id !== 'number') return null
    return parsed.id
  } catch {
    return null
  }
}

/** Publishes a robot move; falls back to local WebSocket broadcast if Redis is down. */
export async function publishRobotUpdate(robot: Robot): Promise<void> {
  const payload = JSON.stringify({ type: 'robot:update', robot })
  try {
    await redis.publish(ROBOT_UPDATES_CHANNEL, payload)
  } catch (err) {
    console.warn('redis publish failed, using local broadcast', err)
    broadcastRobot(robot)
  }
}

/** Publishes a robot removal; falls back to local WebSocket broadcast if Redis is down. */
export async function publishRobotRemoved(id: number): Promise<void> {
  const payload = JSON.stringify({ type: 'robot:remove', id })
  try {
    await redis.publish(ROBOT_UPDATES_CHANNEL, payload)
  } catch (err) {
    console.warn('redis publish failed, using local broadcast', err)
    broadcastRobotRemoved(id)
  }
}

/**
 * Subscribes to robot updates and forwards them to connected WebSocket clients.
 * Uses a dedicated Redis connection (Pub/Sub cannot share a connection with normal commands).
 */
export async function startRobotUpdatesSubscriber(): Promise<() => void> {
  const subscriber = new RedisClient(redisUrl())
  await subscriber.connect()

  await subscriber.subscribe(ROBOT_UPDATES_CHANNEL, (message) => {
    const robot = parseRobotUpdateMessage(message)
    if (robot) {
      broadcastRobot(robot)
      return
    }
    const removedId = parseRobotRemoveMessage(message)
    if (removedId !== null) {
      broadcastRobotRemoved(removedId)
      return
    }
    console.warn('ignored invalid robot update from redis')
  })

  return () => {
    subscriber.close()
  }
}
