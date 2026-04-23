/**
 * SSE (Server-Sent Events) Hook for F1 Live Data
 * Based on f1-dash architecture - simpler and more reliable than WebSocket
 */

import { useEffect, useRef, useState, useCallback } from "react";

type JsonRecord = Record<string, unknown>;

const isPlainObject = (value: unknown): value is JsonRecord => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const mergeValue = (base: unknown, update: unknown): unknown => {
  if (update === null) {
    return undefined;
  }

  if (isPlainObject(base) && isPlainObject(update)) {
    // ALWAYS create a new object to trigger React re-renders
    const result: JsonRecord = { ...(base as JsonRecord) };
    for (const [key, value] of Object.entries(update)) {
      const merged = mergeValue(result[key], value);
      if (merged === undefined) {
        delete result[key];
      } else {
        result[key] = merged;
      }
    }
    // Return a completely new object
    return { ...result };
  }

  if (Array.isArray(base) && Array.isArray(update)) {
    // Always return a new array
    return [...update];
  }

  if (Array.isArray(base) && isPlainObject(update)) {
    // Clone the base array
    const result = [...base];

    for (const [key, value] of Object.entries(update)) {
      const index = Number(key);
      if (Number.isNaN(index)) {
        continue;
      }

      const merged = mergeValue(result[index], value);
      if (merged !== undefined) {
        result[index] = merged as never;
      }
    }

    return result;
  }

  if (isPlainObject(update)) {
    const result: JsonRecord = {};
    for (const [key, value] of Object.entries(update)) {
      const merged = mergeValue(undefined, value);
      if (merged !== undefined) {
        result[key] = merged;
      }
    }
    return result;
  }

  if (Array.isArray(update)) {
    return [...update];
  }

  return update;
};

const mergeLiveData = (previous: LiveData | null, update: JsonRecord): LiveData => {
  const next: LiveData = { ...(previous ?? {}) };

  for (const [key, value] of Object.entries(update)) {
    const merged = mergeValue(next[key as keyof LiveData], value);
    const typedKey = key as keyof LiveData;
    if (merged === undefined) {
      next[typedKey] = undefined as LiveData[keyof LiveData];
    } else {
      // Force new object/array references to trigger React re-renders
      if (isPlainObject(merged)) {
        next[typedKey] = { ...merged } as LiveData[keyof LiveData];
      } else if (Array.isArray(merged)) {
        next[typedKey] = [...merged] as LiveData[keyof LiveData];
      } else {
        next[typedKey] = merged as LiveData[keyof LiveData];
      }
    }
  }

  return next;
};

const DEFAULT_SSE_PATH = "/api/sse";

export interface LapCount extends JsonRecord {
  CurrentLap?: number;
  TotalLaps?: number;
}

export interface LiveTimingPayload extends JsonRecord {
  Lines?: Record<string, JsonRecord>;
}

export interface LiveData extends Record<string, unknown> {
  session?: JsonRecord;
  timing?: LiveTimingPayload;
  lap_count?: LapCount;
  timing_app_data?: JsonRecord;
  positions?: JsonRecord;
  weather?: JsonRecord;
  drivers?: Record<string, JsonRecord>;
  race_control?: unknown[];
  track_status?: JsonRecord;
  team_radio?: unknown[];
  car_data?: JsonRecord;
  timing_stats?: JsonRecord;
  last_update?: string;
}

interface UseSSELiveDataResult {
  data: LiveData | null;
  connected: boolean;
  error: Error | null;
}

export function useSSELiveData(): UseSSELiveDataResult {
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventAtRef = useRef<number>(Date.now());
  const consecutiveErrorCountRef = useRef(0);
  const hasSuccessfulEventRef = useRef(false);

  const recordActivity = useCallback(() => {
    lastEventAtRef.current = Date.now();
    consecutiveErrorCountRef.current = 0;
  }, []);

  const resolveSseUrl = useCallback(() => {
    // Direct connection to backend - Next.js proxy doesn't handle SSE streaming well
    if (typeof window !== "undefined") {
      return `http://localhost:8000${DEFAULT_SSE_PATH}`;
    }
    return DEFAULT_SSE_PATH;
  }, []);

  const scheduleReconnect = useCallback((reconnectFn: () => void) => {
    if (reconnectTimerRef.current) {
      return;
    }

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectFn();
    }, 2500);
  }, []);

  const connect = useCallback(() => {
    try {
      const url = resolveSseUrl();
      const sse = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = sse;
      consecutiveErrorCountRef.current = 0;
      lastEventAtRef.current = Date.now();

      sse.onopen = () => {
        recordActivity();
        setConnected(true);
        setError(null);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      sse.onerror = (err) => {
        const readyState = sse.readyState;
        
        if (readyState === EventSource.CONNECTING) {
          return;
        }
        consecutiveErrorCountRef.current += 1;
        setConnected(false);

        const timeSinceLastEvent = Date.now() - lastEventAtRef.current;
        const reachedRetryLimit = consecutiveErrorCountRef.current >= 3;
        const staleStream = timeSinceLastEvent > 15000;
        const neverReceivedData = !hasSuccessfulEventRef.current;

        if (readyState === EventSource.CLOSED && eventSourceRef.current === sse) {
          eventSourceRef.current = null;
          scheduleReconnect(connect);
        }

        if (neverReceivedData || reachedRetryLimit || staleStream) {
          setError(new Error("SSE connection failed"));
        }
      };

      // Handle initial state
      sse.addEventListener("initial", (event) => {
        try {
          const initialData = JSON.parse(event.data) as unknown;
          if (isPlainObject(initialData)) {
            hasSuccessfulEventRef.current = true;
            recordActivity();
            setData(initialData as LiveData);
          }
        } catch (err) {
          console.error("Failed to parse initial SSE data:", err);
        }
      });

      // Handle updates
      sse.addEventListener("update", (event) => {
        try {
          const updateData = JSON.parse(event.data) as unknown;
          if (isPlainObject(updateData)) {
            hasSuccessfulEventRef.current = true;
            recordActivity();
            
            // CRITICAL: Always create a new data object with unique timestamp
            // This ensures React detects changes even when data structure is identical
            const updateTimestamp = Date.now();
            
            setData((prev) => {
              // CRITICAL FIX: Always merge updates, even if they appear unchanged
              // This ensures frontend gets updates when nested values change
              const merged = mergeLiveData(prev, updateData);
              
              // Force new object reference with timestamp to guarantee React detects changes
              // Always create a completely new object to ensure React re-renders
              // CRITICAL: Include all critical keys to ensure they're always present
              const newData: LiveData = { 
                ...merged,
                // CRITICAL: Always include timestamp to force React update
                _updateTimestamp: updateTimestamp,
                // CRITICAL: Always include last_update if present
                ...(updateData.last_update ? { last_update: updateData.last_update as string } : {}),
                // Ensure critical keys are always included if present in update
                ...(updateData.timing ? { timing: updateData.timing as LiveTimingPayload } : {}),
                ...(updateData.lap_count ? { lap_count: updateData.lap_count as LapCount } : {}),
                ...(updateData.weather ? { weather: updateData.weather as JsonRecord } : {}),
                ...(updateData.track_status ? { track_status: updateData.track_status as JsonRecord } : {}),
                ...(updateData.timing_app_data ? { timing_app_data: updateData.timing_app_data as JsonRecord } : {}),
                ...(updateData.positions ? { positions: updateData.positions as JsonRecord } : {}),
                ...(updateData.car_data ? { car_data: updateData.car_data as JsonRecord } : {}),
              };
              
              return newData;
            });
          }
        } catch (err) {
          console.error("Failed to parse SSE update:", err);
        }
      });

      // Handle pings (keep-alive)
      sse.addEventListener("ping", () => {
        recordActivity();
      });

    } catch (err) {
      console.error("Failed to create EventSource:", err);
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      scheduleReconnect(connect);
    }
  }, [recordActivity, resolveSseUrl, scheduleReconnect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { data, connected, error };
}
