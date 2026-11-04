'use client'

import {
  RobotsFetchError,
  createRobot,
  deleteRobot,
  fetchRobots,
} from '@/lib/api/robots'
import {
  fetchSimulationStatus,
  startSimulation,
  stopSimulation,
} from '@/lib/api/simulation'
import { clearAuthToken, getAuthToken } from '@/lib/auth-token'
import {
  useRobotWebSocket,
  type RobotWebSocketStatus,
} from '@/lib/hooks/use-robot-websocket'
import { mergeRobotUpdate } from '@/lib/realtime/merge-robot-update'
import { DEFAULT_MAP_CENTER } from '@/lib/map/constants'
import type { Robot } from '@/lib/types/robot'
import { RobotMap } from '@/components/robot-map'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

function formatCoordinate(value: number): string {
  return value.toFixed(5)
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function liveStatusLabel(status: RobotWebSocketStatus): string {
  switch (status) {
    case 'live':
      return 'Live'
    case 'connecting':
      return 'Connecting…'
    case 'reconnecting':
      return 'Reconnecting…'
    default:
      return 'Offline'
  }
}

function liveStatusClass(status: RobotWebSocketStatus): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    case 'connecting':
    case 'reconnecting':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
    default:
      return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [robots, setRobots] = useState<Robot[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [simulationRunning, setSimulationRunning] = useState<boolean | null>(
    null,
  )
  const [simulationBusy, setSimulationBusy] = useState(false)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [robotName, setRobotName] = useState('')
  const [robotLat, setRobotLat] = useState('')
  const [robotLon, setRobotLon] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const onRobotUpdate = useCallback((robot: Robot) => {
    setRobots((prev) => (prev ? mergeRobotUpdate(prev, robot) : prev))
  }, [])

  const onRobotRemove = useCallback((id: number) => {
    setRobots((prev) => (prev ? prev.filter((robot) => robot.id !== id) : prev))
  }, [])

  const wsEnabled = robots !== null && error === null

  const wsStatus = useRobotWebSocket({
    enabled: wsEnabled,
    onRobotUpdate,
    onRobotRemove,
  })

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.replace('/login')
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const list = await fetchRobots(token)
        if (cancelled) return
        setRobots(list)
        setError(null)

        try {
          const status = await fetchSimulationStatus(token)
          if (!cancelled) {
            setSimulationRunning(status.running)
            setSimulationError(null)
          }
        } catch (statusErr) {
          if (cancelled) return
          if (
            statusErr instanceof RobotsFetchError &&
            statusErr.status === 401
          ) {
            clearAuthToken()
            router.replace('/login')
            return
          }
          setSimulationError(
            statusErr instanceof RobotsFetchError
              ? statusErr.message
              : 'Could not load simulation status.',
          )
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof RobotsFetchError && err.status === 401) {
          clearAuthToken()
          router.replace('/login')
          return
        }
        setError(
          err instanceof RobotsFetchError
            ? err.message
            : 'Could not reach the API. Is it running on port 4000?',
        )
        setRobots([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router, loadAttempt])

  function handleLogout(): void {
    clearAuthToken()
    router.replace('/login')
  }

  async function setSimulation(next: 'start' | 'stop'): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      router.replace('/login')
      return
    }

    setSimulationBusy(true)
    setSimulationError(null)
    try {
      const status =
        next === 'start'
          ? await startSimulation(token)
          : await stopSimulation(token)
      setSimulationRunning(status.running)
    } catch (err) {
      if (err instanceof RobotsFetchError && err.status === 401) {
        clearAuthToken()
        router.replace('/login')
        return
      }
      setSimulationError(
        err instanceof RobotsFetchError
          ? err.message
          : 'Could not update the simulation.',
      )
    } finally {
      setSimulationBusy(false)
    }
  }

  function handleMapPick(position: { lat: number; lon: number }): void {
    if (addBusy) return
    setRobotLat(position.lat.toFixed(5))
    setRobotLon(position.lon.toFixed(5))
    setAddError(null)
  }

  function handleRetryLoad(): void {
    setError(null)
    setRobots(null)
    setLoadAttempt((n) => n + 1)
  }

  async function handleAddRobot(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    const token = getAuthToken()
    if (!token) {
      router.replace('/login')
      return
    }

    const name = robotName.trim()
    const lat = Number(robotLat)
    const lon = Number(robotLon)
    if (name.length === 0) {
      setAddError('Name is required.')
      return
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setAddError('Latitude must be a number between -90 and 90.')
      return
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setAddError('Longitude must be a number between -180 and 180.')
      return
    }

    setAddBusy(true)
    setAddError(null)
    try {
      const created = await createRobot(token, { name, lat, lon })
      setRobots((prev) => (prev ? mergeRobotUpdate(prev, created) : [created]))
      setRobotName('')
      setRobotLat('')
      setRobotLon('')
    } catch (err) {
      if (err instanceof RobotsFetchError && err.status === 401) {
        clearAuthToken()
        router.replace('/login')
        return
      }
      setAddError(
        err instanceof RobotsFetchError
          ? err.message
          : 'Could not add the robot.',
      )
    } finally {
      setAddBusy(false)
    }
  }

  async function handleDeleteRobot(id: number): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      router.replace('/login')
      return
    }

    setDeletingId(id)
    setDeleteError(null)
    try {
      await deleteRobot(token, id)
      setRobots((prev) =>
        prev ? prev.filter((robot) => robot.id !== id) : prev,
      )
    } catch (err) {
      if (err instanceof RobotsFetchError && err.status === 401) {
        clearAuthToken()
        router.replace('/login')
        return
      }
      setDeleteError(
        err instanceof RobotsFetchError
          ? err.message
          : 'Could not delete the robot.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  if (robots === null && error === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading robots…
        </p>
      </div>
    )
  }

  const list = robots ?? []

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Fleet dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>
              {simulationRunning === false
                ? 'Simulation paused — positions frozen until started.'
                : 'Live updates when simulation is running (~every 2s).'}
            </span>
            {simulationRunning !== null ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  simulationRunning
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {simulationRunning ? 'Running' : 'Paused'}
              </span>
            ) : null}
            {!error && wsEnabled ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${liveStatusClass(wsStatus)}`}
              >
                {liveStatusLabel(wsStatus)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {simulationRunning === false ? (
            <button
              type="button"
              disabled={simulationBusy}
              onClick={() => void setSimulation('start')}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Start simulation
            </button>
          ) : null}
          {simulationRunning === true ? (
            <button
              type="button"
              disabled={simulationBusy}
              onClick={() => void setSimulation('stop')}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Stop simulation
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Log out
          </button>
        </div>
      </header>

      {simulationError ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {simulationError}
        </p>
      ) : null}

      {error ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="w-fit rounded-md bg-red-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid flex-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <section className="flex min-h-[20rem] flex-col gap-2 lg:min-h-[32rem]">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Map
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Click the map to fill latitude and longitude.
          </p>
          {!error ? <RobotMap robots={list} onPick={handleMapPick} /> : null}
          {error ? (
            <div className="flex min-h-[20rem] flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Map unavailable until robots load successfully.
            </div>
          ) : null}
        </section>

        <section className="flex min-h-[20rem] flex-col gap-2 lg:min-h-[32rem]">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Robots
          </h2>
          <form
            onSubmit={(event) => void handleAddRobot(event)}
            className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="text-sm font-medium">Add robot</p>
            <p className="text-sm font-medium">
              Click on the map to fill latitude and longitude
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Name</span>
                <input
                  type="text"
                  name="name"
                  required
                  value={robotName}
                  disabled={Boolean(error) || addBusy}
                  onChange={(e) => setRobotName(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-neutral-700 dark:focus:border-neutral-500"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Latitude</span>
                <input
                  type="number"
                  name="lat"
                  required
                  step="any"
                  min={-90}
                  max={90}
                  placeholder={String(DEFAULT_MAP_CENTER.lat)}
                  value={robotLat}
                  disabled={Boolean(error) || addBusy}
                  onChange={(e) => setRobotLat(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-neutral-700 dark:focus:border-neutral-500"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Longitude</span>
                <input
                  type="number"
                  name="lon"
                  required
                  step="any"
                  min={-180}
                  max={180}
                  placeholder={String(DEFAULT_MAP_CENTER.lon)}
                  value={robotLon}
                  disabled={Boolean(error) || addBusy}
                  onChange={(e) => setRobotLon(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-neutral-700 dark:focus:border-neutral-500"
                />
              </label>
            </div>
            {addError ? (
              <p
                className="text-sm text-red-700 dark:text-red-300"
                role="alert"
              >
                {addError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={Boolean(error) || addBusy}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {addBusy ? 'Adding…' : 'Add robot'}
            </button>
          </form>
          {deleteError ? (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              {deleteError}
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Latitude</th>
                  <th className="px-4 py-3 font-medium">Longitude</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && !error ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-neutral-500 dark:text-neutral-400"
                    >
                      No robots found.
                    </td>
                  </tr>
                ) : null}
                {list.map((robot) => (
                  <tr
                    key={robot.id}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/80"
                  >
                    <td className="px-4 py-3 font-medium">{robot.name}</td>
                    <td className="px-4 py-3 capitalize">{robot.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatCoordinate(robot.lat)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatCoordinate(robot.lon)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {formatUpdatedAt(robot.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={deletingId === robot.id}
                        onClick={() => void handleDeleteRobot(robot.id)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                      >
                        {deletingId === robot.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
