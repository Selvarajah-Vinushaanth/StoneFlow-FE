import { useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

export type WsEvent =
  | 'workflow_started'
  | 'step_completed'
  | 'step_issue'
  | 'step_help'
  | 'issue_resolved'
  | 'timer_expired'
  | 'job_completed'
  | 'subtask_issue'
  | 'subtask_help'
  | 'subtask_timer_expired';

export interface WsMessage {
  event: WsEvent;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * useWebSocket — connects to the Stone Co backend WebSocket.
 * Automatically reconnects every 5 s on drop.
 *
 * @param onMessage  Callback invoked whenever a WS message arrives
 * @param enabled    Set to false to skip connecting (e.g. SSR, demo mode)
 */
export function useWebSocket(
  onMessage: (msg: WsMessage) => void,
  enabled = true,
) {
  const wsRef  = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef  = useRef(onMessage);
  cbRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        cbRef.current(msg);
      } catch {/* ignore malformed */}
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected — retrying in 5 s');
      timerRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
