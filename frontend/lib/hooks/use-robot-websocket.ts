"use client";

import { getAuthToken } from "../auth-token";
import { getWebSocketUrl } from "../config";
import { parseRobotUpdateMessage } from "../realtime/merge-robot-update";
import type { Robot } from "../types/robot";
import { useEffect, useRef } from "react";

const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

type UseRobotWebSocketOptions = {
  enabled: boolean;
  onRobotUpdate: (robot: Robot) => void;
};

export function useRobotWebSocket({ enabled, onRobotUpdate }: UseRobotWebSocketOptions): void {
  const onRobotUpdateRef = useRef(onRobotUpdate);

  useEffect(() => {
    onRobotUpdateRef.current = onRobotUpdate;
  });

  useEffect(() => {
    if (!enabled) return;

    const token = getAuthToken();
    if (!token) return;

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
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);
    }

    function connect(): void {
      if (cancelled) return;

      ws = new WebSocket(getWebSocketUrl(token));

      ws.onopen = () => {
        reconnectDelay = INITIAL_RECONNECT_MS;
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
}
