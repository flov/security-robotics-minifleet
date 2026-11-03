"use client";

import { RobotsFetchError, fetchRobots } from "@/lib/api/robots";
import { clearAuthToken, getAuthToken } from "@/lib/auth-token";
import type { Robot } from "@/lib/types/robot";
import { RobotMap } from "@/components/robot-map";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatCoordinate(value: number): string {
  return value.toFixed(5);
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [router]);

  if (robots === null && error === null) {
    return (
      <main className="flex flex-1 flex-col px-4 py-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading robots…</p>
      </main>
    );
  }

  const list = robots ?? [];

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Robot positions on the map — live updates in the next step.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid flex-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <section className="flex min-h-[20rem] flex-col lg:min-h-[28rem]">
          {!error && list.length > 0 ? <RobotMap robots={list} /> : null}
          {!error && list.length === 0 ? (
            <div className="flex min-h-[20rem] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              No robots to show on the map.
            </div>
          ) : null}
        </section>

        <section className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
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
        </section>
      </div>
    </main>
  );
}
