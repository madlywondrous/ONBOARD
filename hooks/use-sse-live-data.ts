/**
 * SSE (Server-Sent Events) Hook for F1 Live Data
 * Based on f1-dash architecture - simpler and more reliable than WebSocket
 */

import { useEffect, useRef, useState, useCallback } from "react";

const SSE_URL = "http://localhost:8000/api/sse";

export interface LiveData {
  session?: any;
  timing?: any;
  lap_count?: any;
  timing_app_data?: any;
  positions?: any;
  weather?: any;
  drivers?: any;
  race_control?: any;
  track_status?: any;
  team_radio?: any;
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

  const connect = useCallback(() => {
    console.log("🔌 Connecting to F1 SSE stream...");
    
    try {
      const sse = new EventSource(SSE_URL);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        console.log("✅ SSE connected");
        setConnected(true);
        setError(null);
      };

      sse.onerror = (err) => {
        console.error("❌ SSE error:", err);
        setConnected(false);
        setError(new Error("SSE connection failed"));
      };

      // Handle initial state
      sse.addEventListener("initial", (event) => {
        console.log("📦 Received initial SSE data");
        try {
          const initialData = JSON.parse(event.data);
          setData(initialData);
        } catch (err) {
          console.error("Failed to parse initial data:", err);
        }
      });

      // Handle updates
      sse.addEventListener("update", (event) => {
        console.log("🔄 Received SSE update");
        try {
          const updateData = JSON.parse(event.data);
          // f1-dash style: backend sends complete merged state, just replace
          setData(updateData);
        } catch (err) {
          console.error("Failed to parse update:", err);
        }
      });

      // Handle pings (keep-alive)
      sse.addEventListener("ping", () => {
        console.log("💓 SSE ping");
      });

    } catch (err) {
      console.error("Failed to create EventSource:", err);
      setError(err as Error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("🔌 Disconnecting SSE...");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
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
