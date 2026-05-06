/**
 * SSE (Server-Sent Events) Hook for F1 Live Data
 * 
 * Supports TWO backends:
 * 1. ONBOARD Python backend (port 8000) — uses renamed keys (timing, drivers, etc.)
 * 2. f1-dash Rust realtime (port 4000) — uses raw F1 topic names (TimingData, DriverList, etc.)
 * 
 * Tries f1-dash realtime first (faster, proven), falls back to ONBOARD backend.
 */

import { useEffect, useRef, useState, useCallback } from "react";

type JsonRecord = Record<string, unknown>;

// f1-dash realtime sends raw F1 topic names; map them to ONBOARD's expected keys
const F1_TOPIC_TO_ONBOARD_KEY: Record<string, string> = {
  TimingData: "timing",
  DriverList: "drivers",
  SessionInfo: "session",
  WeatherData: "weather",
  LapCount: "lap_count",
  TrackStatus: "track_status",
  TimingAppData: "timing_app_data",
  RaceControlMessages: "race_control_messages_raw",
  TeamRadio: "team_radio_raw",
  SessionStatus: "session_status",
  TimingStats: "timing_stats",
  SessionData: "session_data",
  ExtrapolatedClock: "extrapolated_clock",
  Heartbeat: "heartbeat",
  TopThree: "top_three",
  ChampionshipPrediction: "championship_prediction",
};

/**
 * Map f1-dash format data to ONBOARD's expected format
 */
function mapF1DashToOnboard(data: JsonRecord): JsonRecord {
  const mapped: JsonRecord = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip compressed data (handled separately if needed)
    if (key === "CarDataZ" || key === "PositionZ") continue;

    const mappedKey = F1_TOPIC_TO_ONBOARD_KEY[key];
    if (mappedKey) {
      // Special handling for RaceControlMessages — extract .Messages array
      if (key === "RaceControlMessages" && value && typeof value === "object") {
        const rcm = value as JsonRecord;
        mapped["race_control"] = Array.isArray(rcm.Messages) ? rcm.Messages : [];
      }
      // Special handling for TeamRadio — extract .Captures array
      else if (key === "TeamRadio" && value && typeof value === "object") {
        const tr = value as JsonRecord;
        mapped["team_radio"] = Array.isArray(tr.Captures) ? tr.Captures : [];
      }
      // Special handling for SessionStatus — normalize to { Status: "..." }
      else if (key === "SessionStatus" && value && typeof value === "object") {
        mapped["session_status"] = value;
      }
      else {
        mapped[mappedKey] = value;
      }
    } else {
      // Pass through unknown keys as-is
      mapped[key] = value;
    }
  }

  // Always include a timestamp
  if (!mapped.last_update) {
    mapped.last_update = new Date().toISOString();
  }

  return mapped;
}

export interface LiveData extends Record<string, unknown> {
  session?: JsonRecord;
  timing?: JsonRecord;
  lap_count?: JsonRecord;
  timing_app_data?: JsonRecord;
  positions?: JsonRecord;
  weather?: JsonRecord;
  drivers?: Record<string, JsonRecord>;
  race_control?: unknown[];
  track_status?: JsonRecord;
  team_radio?: unknown[];
  car_data?: JsonRecord;
  timing_stats?: JsonRecord;
  session_status?: JsonRecord;
  last_update?: string;
}

interface UseSSELiveDataResult {
  data: LiveData | null;
  connected: boolean;
  error: Error | null;
  source: "f1-dash" | "onboard" | null;
}

// Backend endpoints to try in order of preference
const SSE_ENDPOINTS = [
  { url: "http://localhost:4000/api/realtime", type: "f1-dash" as const },       // Local f1-dash Docker
  { url: "https://rt-api.f1-dash.com/api/realtime", type: "f1-dash" as const }, // f1-dash public server
  { url: "http://localhost:8000/api/sse", type: "onboard" as const },            // ONBOARD Python backend
];

export function useSSELiveData(
  onUpdate?: (data: LiveData) => void
): UseSSELiveDataResult {
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<"f1-dash" | "onboard" | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const endpointIndexRef = useRef(0);

  onUpdateRef.current = onUpdate;

  const scheduleReconnect = useCallback((reconnectFn: () => void, delayMs = 3000) => {
    if (reconnectTimerRef.current) return;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectFn();
    }, delayMs);
  }, []);

  const processData = useCallback((rawData: JsonRecord, backendType: "f1-dash" | "onboard"): LiveData => {
    // f1-dash uses raw F1 topic names — map them to ONBOARD format
    if (backendType === "f1-dash") {
      return mapF1DashToOnboard(rawData) as LiveData;
    }
    // ONBOARD backend already uses the right keys
    return rawData as LiveData;
  }, []);

  const connect = useCallback(() => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const endpoint = SSE_ENDPOINTS[endpointIndexRef.current];
      if (!endpoint) {
        endpointIndexRef.current = 0;
        scheduleReconnect(connect, 5000);
        return;
      }

      console.log(`[SSE] Connecting to ${endpoint.type} at ${endpoint.url}...`);
      const sse = new EventSource(endpoint.url);
      eventSourceRef.current = sse;

      // Timeout: if no open event within 5s, try next endpoint
      const connectionTimeout = setTimeout(() => {
        if (!connected && sse.readyState !== EventSource.OPEN) {
          console.log(`[SSE] ${endpoint.type} connection timeout, trying next...`);
          sse.close();
          eventSourceRef.current = null;
          endpointIndexRef.current = (endpointIndexRef.current + 1) % SSE_ENDPOINTS.length;
          connect();
        }
      }, 5000);

      sse.onopen = () => {
        clearTimeout(connectionTimeout);
        setConnected(true);
        setSource(endpoint.type);
        setError(null);
        console.log(`[SSE] Connected to ${endpoint.type} ✓`);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      sse.onerror = () => {
        clearTimeout(connectionTimeout);
        if (sse.readyState === EventSource.CLOSED) {
          setConnected(false);
          eventSourceRef.current = null;
          // Try the next endpoint
          endpointIndexRef.current = (endpointIndexRef.current + 1) % SSE_ENDPOINTS.length;
          scheduleReconnect(connect);
        }
      };

      // Handle initial state
      sse.addEventListener("initial", (event) => {
        try {
          const rawData = JSON.parse(event.data) as JsonRecord;
          const processed = processData(rawData, endpoint.type);
          setData(processed);
          onUpdateRef.current?.(processed);
        } catch (err) {
          console.error("Failed to parse initial SSE data:", err);
        }
      });

      // Handle updates — fire callback IMMEDIATELY for every update
      sse.addEventListener("update", (event) => {
        try {
          const rawData = JSON.parse(event.data) as JsonRecord;
          const processed = processData(rawData, endpoint.type);
          onUpdateRef.current?.(processed);
          setData((prev) => (prev ? { ...prev, ...processed } : processed));
        } catch (err) {
          console.error("Failed to parse SSE update:", err);
        }
      });

      sse.addEventListener("ping", () => {
        // keep-alive
      });
    } catch (err) {
      console.error("Failed to create EventSource:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      endpointIndexRef.current = (endpointIndexRef.current + 1) % SSE_ENDPOINTS.length;
      scheduleReconnect(connect);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processData, scheduleReconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  return { data, connected, error, source };
}
