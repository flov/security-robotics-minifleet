"use client";

import { RobotsFetchError, fetchRobots } from "@/lib/api/robots";
import { clearAuthToken, getAuthToken } from "@/lib/auth-token";
import {
  useRobotWebSocket,
  type RobotWebSocketStatus,
} from "@/lib/hooks/use-robot-websocket";
import { mergeRobotUpdate } from "@/lib/realtime/merge-robot-update";
import type { Robot } from "@/lib/types/robot";
import { RobotMap } from "@/components/robot-map";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function formatCoordinate(value: number): string {
  return value.toFixed(5);
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function liveStatusLabel(status: RobotWebSocketStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "connecting":
      return "Connecting…";
    case "reconnecting":
      return "Reconnecting…";
    default:
      return "Offline";
  }
}

function liveStatusClass(status: RobotWebSocketStatus): string {
  switch (status) {
    case "live":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "connecting":
    case "reconnecting":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
    default:
      return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const onRobotUpdate = useCallback((robot: Robot) => {
    setRobots((prev) => (prev ? mergeRobotUpdate(prev, robot) : prev));
  }, []);

  const wsEnabled = robots !== null && error === null;

  const wsStatus = useRobotWebSocket({
    enabled: wsEnabled,
    onRobotUpdate,
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const list = await fetchRobots(token);
        if (!cancelled) {
          setRobots(list);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof RobotsFetchError && err.status === 401) {
          clearAuthToken();
          router.replace("/login");
          return;
        }
        setError(
          err instanceof RobotsFetchError
            ? err.message
            : "Could not reach the API. Is it running on port 4000?",
        );
        setRobots([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, loadAttempt]);

  function handleLogout(): void {
    clearAuthToken();
    router.replace("/login");
  }

  function handleRetryLoad(): void {
    setError(null);
    setRobots(null);
    setLoadAttempt((n) => n + 1);
  }

  if (robots === null && error === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading robots…</p>
      </div>
    );
  }

  const list = robots ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Fleet dashboard</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>Map and list update from the server simulation (~every 2s).</span>
            {!error && wsEnabled ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${liveStatusClass(wsStatus)}`}
              >
                {liveStatusLabel(wsStatus)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Log out
        </button>
      </header>

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
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Map</h2>
          {!error && list.length > 0 ? <RobotMap robots={list} /> : null}
          {!error && list.length === 0 ? (
            <div className="flex min-h-[20rem] flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              No robots to show on the map.
            </div>
          ) : null}
          {error ? (
            <div className="flex min-h-[20rem] flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Map unavailable until robots load successfully.
            </div>
          ) : null}
        </section>

        <section className="flex min-h-[20rem] flex-col gap-2 lg:min-h-[32rem]">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Robots</h2>
          <div className="min-h-0 flex-1 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Latitude</th>
                  <th className="px-4 py-3 font-medium">Longitude</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && !error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-neutral-500 dark:text-neutral-400">
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
                    <td className="px-4 py-3 font-mono text-xs">{formatCoordinate(robot.lat)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCoordinate(robot.lon)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {formatUpdatedAt(robot.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
