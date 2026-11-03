"use client";

import { getAuthToken } from "../auth-token";
import { getWebSocketUrl } from "../config";
import { parseRobotUpdateMessage } from "../realtime/merge-robot-update";
import type { Robot } from "../types/robot";
import { useEffect, useRef, useState } from "react";

const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export type RobotWebSocketStatus = "idle" | "connecting" | "live" | "reconnecting";

type UseRobotWebSocketOptions = {
  enabled: boolean;
  onRobotUpdate: (robot: Robot) => void;
};

export function useRobotWebSocket({
  enabled,
  onRobotUpdate,
}: UseRobotWebSocketOptions): RobotWebSocketStatus {
  const [connectionStatus, setConnectionStatus] = useState<
    Exclude<RobotWebSocketStatus, "idle">
  >("connecting");
  const onRobotUpdateRef = useRef(onRobotUpdate);

  useEffect(() => {
    onRobotUpdateRef.current = onRobotUpdate;
  });

  useEffect(() => {
    if (!enabled) return;

    const token = getAuthToken();
    if (!token) return;
    const wsToken = token;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = INITIAL_RECONNECT_MS;
    let cancelled = false;

    function clearReconnectTimer(): void {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function scheduleReconnect(): void {
      if (cancelled) return;
      setConnectionStatus("reconnecting");
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
    }

    function connect(): void {
      if (cancelled) return;

      setConnectionStatus("connecting");
      ws = new WebSocket(getWebSocketUrl(wsToken));

      ws.onopen = () => {
        reconnectDelay = INITIAL_RECONNECT_MS;
        setConnectionStatus("live");
      };

      ws.onmessage = (event) => {
        const robot = parseRobotUpdateMessage(String(event.data));
        if (robot) {
          onRobotUpdateRef.current(robot);
        }
      };

      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [enabled]);

  return enabled ? connectionStatus : "idle";
}
