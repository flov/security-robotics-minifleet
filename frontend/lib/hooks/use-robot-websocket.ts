"use client";

import { getAuthToken } from "../auth-token";
import { getWebSocketUrl } from "../config";
import { parseRobotRemoveMessage, parseRobotUpdateMessage } from "../realtime/merge-robot-update";
import type { Robot } from "../types/robot";
import { useEffect, useRef, useState } from "react";

const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export type RobotWebSocketStatus = "idle" | "connecting" | "live" | "reconnecting";

type UseRobotWebSocketOptions = {
  enabled: boolean;
  onRobotUpdate: (robot: Robot) => void;
  onRobotRemove: (id: number) => void;
};

export function useRobotWebSocket({
  enabled,
  onRobotUpdate,
  onRobotRemove,
}: UseRobotWebSocketOptions): RobotWebSocketStatus {
  const [connectionStatus, setConnectionStatus] = useState<
    Exclude<RobotWebSocketStatus, "idle">
  >("connecting");
  const onRobotUpdateRef = useRef(onRobotUpdate);
  const onRobotRemoveRef = useRef(onRobotRemove);

  useEffect(() => {
    onRobotUpdateRef.current = onRobotUpdate;
    onRobotRemoveRef.current = onRobotRemove;
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
        const raw = String(event.data);
        const robot = parseRobotUpdateMessage(raw);
        if (robot) {
          onRobotUpdateRef.current(robot);
          return;
        }
        const removedId = parseRobotRemoveMessage(raw);
        if (removedId !== null) {
          onRobotRemoveRef.current(removedId);
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
