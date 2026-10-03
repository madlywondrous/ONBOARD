/**
 * SSE (Server-Sent Events) Hook for F1 Live Data
 * 
 * Connects directly to the local backend so long-lived SSE frames are not
 * buffered by the Next.js development proxy. An explicit environment URL may
 * be supplied for a separately hosted backend.
 * Batches updates with requestAnimationFrame for smooth rendering.
 *
 * IMPORTANT: This hook must create the EventSource exactly ONCE on mount and
 * keep it alive.  Any recreation closes the old stream and fetches a new
 * "initial" snapshot which visually looks like a full page refresh.
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
 * Decode base64+zlib compressed F1 data (CarData.z, Position.z)
 */
function decodeCompressedPayload(payload: unknown): JsonRecord | null {
  if (typeof payload !== "string") return null;
  
  try {
    const decoded = atob(payload);
    const binary = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      binary[i] = decoded.charCodeAt(i);
    }
    // Try zlib decompression (may need pako or similar for full zlib)
    // For now, return null to indicate not decoded
    return null;
  } catch {
    return null;
  }
}

/**
 * Map f1-dash format data to ONBOARD's expected format
 */
function mapF1DashToOnboard(data: JsonRecord): JsonRecord {
  const mapped: JsonRecord = {};

  for (const [key, value] of Object.entries(data)) {
    // Handle compressed data - decode if possible
    if (key === "CarDataZ" || key === "PositionZ") {
      const decoded = decodeCompressedPayload(value);
      if (decoded) {
        const mappedKey = key === "CarDataZ" ? "car_data" : "positions";
        mapped[mappedKey] = decoded;
      }
      continue;
    }

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

// ---- Pure helpers (defined outside the hook so they have stable identity) ----

/**
 * Deep-merge helper: recursively merges `next` into `previous`, creating
 * new object references so React can detect changes.  Arrays are replaced
 * (F1 API arrays like race_control are full snapshots, not patches).
 */
function deepMergeValue(previous: unknown, next: unknown): unknown {
  if (next === undefined) return previous;
  if (next === null) return null;
  if (!previous || Array.isArray(previous) || Array.isArray(next) ||
      typeof previous !== "object" || typeof next !== "object") {
    return next;
  }
  const mergedRecord: JsonRecord = { ...(previous as JsonRecord) };
  for (const [key, value] of Object.entries(next as JsonRecord)) {
    mergedRecord[key] = deepMergeValue(mergedRecord[key], value);
  }
  return mergedRecord;
}

function deepMergeLiveData(prev: LiveData | null, patch: LiveData): LiveData {
  if (!prev) return patch;
  const result: LiveData = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(patch)]);
  for (const key of allKeys) {
    result[key] = deepMergeValue(prev[key], patch[key]);
  }
  return result;
}

function processRawData(rawData: JsonRecord, backendType: "f1-dash" | "onboard"): LiveData {
  if (backendType === "f1-dash") {
    return mapF1DashToOnboard(rawData) as LiveData;
  }
  return rawData as LiveData;
}

// ---- Types ----

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

const SSE_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_SSE_URL || "http://localhost:8000/api/sse";

export function useSSELiveData(
  onUpdate?: (data: LiveData) => void
): UseSSELiveDataResult {
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<"f1-dash" | "onboard" | null>(null);

  // All mutable state is stored in refs so the `connect` function and its
  // event listeners never need to be recreated.  This is critical: recreating
  // `connect` triggers the useEffect cleanup which tears down the EventSource,
  // causing a visible full-data reload ("page refresh").
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const disposedRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  // Update state immediately. React 18 automatically batches state updates,
  // so manual RAF batching is unnecessary and can cause severe delays 
  // (15-20s chunks) if the browser throttles background tabs or low-power modes.
  const applyUpdate = useCallback((patch: LiveData) => {
    onUpdateRef.current?.(patch);
    setData((prev) => deepMergeLiveData(prev, patch));
  }, []);

  const consecutiveErrorsRef = useRef(0);

  // --- Connection management ---
  // `connect` is intentionally created with NO reactive dependencies.
  // It captures everything via refs so it has a perfectly stable identity.
  // The useEffect therefore fires exactly once.

  const connectRef = useRef<(() => void) | null>(null);

  // We define connect inside a ref-setter so it never causes re-renders.
  if (!connectRef.current) {
    connectRef.current = function connect() {
      // Clean up any previous connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (disposedRef.current) return;

      const endpoint = { url: SSE_ENDPOINT, type: "onboard" as const };
      let opened = false;
      consecutiveErrorsRef.current = 0;
      console.log(`[SSE] Connecting to ${endpoint.url}...`);
      const sse = new EventSource(endpoint.url);
      eventSourceRef.current = sse;

      // Connection timeout — if the stream doesn't open within 8s, tear down
      // and do our own reconnect with backoff.
      connectionTimeoutRef.current = setTimeout(() => {
        if (!opened && eventSourceRef.current === sse) {
          console.warn("[SSE] Connection timed out; retrying...");
          sse.close();
          eventSourceRef.current = null;
          setConnected(false);
          setError(new Error("Live data connection timed out"));
          scheduleReconnect();
        }
      }, 8000);

      sse.onopen = () => {
        opened = true;
        consecutiveErrorsRef.current = 0;
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        setConnected(true);
        setSource(endpoint.type);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log(`[SSE] Connected to ${endpoint.type} ✓`);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      sse.onerror = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // CRITICAL: Do NOT immediately close the EventSource on every error.
        // EventSource has built-in reconnection.  Aggressively closing it
        // causes a reconnect cycle that fetches a new "initial" snapshot,
        // which visually looks like a full page refresh.
        //
        // Instead, count consecutive errors.  After several in a row (meaning
        // the browser's native retry is also failing), tear down and do our
        // own backoff reconnect.
        consecutiveErrorsRef.current += 1;

        if (consecutiveErrorsRef.current >= 3 && eventSourceRef.current === sse) {
          console.warn(`[SSE] ${consecutiveErrorsRef.current} consecutive errors — reconnecting with backoff`);
          sse.close();
          eventSourceRef.current = null;
          setConnected(false);
          setError(new Error("Live data connection lost"));
          scheduleReconnect();
        } else {
          // Transient error — the browser will auto-retry.  Just update the
          // UI to show a brief "reconnecting" state, but keep existing data.
          setConnected(false);
        }
      };

      // Handle initial state — MERGE into existing data instead of replacing.
      // On first load `prev` is null so this is equivalent to a full set.
      // On reconnects this preserves accumulated state and just backfills any
      // gaps, preventing the visual "flash" / "full refresh" effect.
      sse.addEventListener("initial", (event) => {
        try {
          const rawData = JSON.parse(event.data) as JsonRecord;
          const processed = processRawData(rawData, endpoint.type);
          consecutiveErrorsRef.current = 0;
          setData((prev) => deepMergeLiveData(prev, processed));
          onUpdateRef.current?.(processed);
        } catch (err) {
          console.error("Failed to parse initial SSE data:", err);
        }
      });

      // Handle updates — BATCH them for smooth rendering
      sse.addEventListener("update", (event) => {
        try {
          const rawData = JSON.parse(event.data) as JsonRecord;
          const processed = processRawData(rawData, endpoint.type);
          consecutiveErrorsRef.current = 0;
          applyUpdate(processed);
        } catch (err) {
          console.error("Failed to parse SSE update:", err);
        }
      });

      // Handle session reset - clear state and re-fetch ONLY if it's a real change
      sse.addEventListener("session_reset", (event) => {
        try {
          console.log("[SSE] Session reset received:", event.data);
          const eventData = JSON.parse(event.data) as JsonRecord;
          // 'upstream_data_stale' is just the backend polling/reconnecting due to inactivity.
          // We shouldn't wipe the screen for that, otherwise users see a flash of skeletons.
          if (eventData.reason !== 'upstream_data_stale') {
            setData(null); // Clear state
            onUpdateRef.current?.({ session_reset: true });
          } else {
            console.log("[SSE] Ignoring upstream stale reset to preserve UI state.");
          }
        } catch (err) {
          console.error("Failed to handle session reset:", err);
        }
      });

      sse.addEventListener("ping", () => {
        // keep-alive — reset error counter so transient blips don't accumulate
        consecutiveErrorsRef.current = 0;
        // If we were showing "reconnecting", clear that
        if (eventSourceRef.current === sse) {
          setConnected(true);
          setError(null);
        }
      });
    };
  }

  function scheduleReconnect() {
    if (disposedRef.current || reconnectTimerRef.current) return;
    const delayMs = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 15000);
    reconnectAttemptsRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current?.();
    }, delayMs);
  }

  // --- Single mount/unmount effect ---
  // Empty dependency array ensures this runs exactly once.
  // `connectRef.current` is stable (set once above).
  useEffect(() => {
    disposedRef.current = false;
    connectRef.current?.();

    return () => {
      disposedRef.current = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      // Cancel any pending RAF
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, connected, error, source };
}
