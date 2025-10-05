"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * SSE Hook for F1 Live Data Streaming
 * Based on f1-dash's simpler SSE approach instead of WebSocket
 * 
 * EventSource provides:
 * - Automatic reconnection
 * - Simpler one-way server -> client streaming
 * - Native browser support
 * - Less complexity than WebSocket bidirectional communication
 */

interface UseSSEOptions {
  url: string;
  onInitial?: (data: any) => void;
  onUpdate?: (data: any) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useSSE({ 
  url, 
  onInitial, 
  onUpdate, 
  onError,
  enabled = true 
}: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Create EventSource connection
    const sse = new EventSource(url);

    sse.onerror = (error) => {
      console.error("❌ SSE connection error:", error);
      setConnected(false);
      onError?.(error);
    };

    sse.onopen = () => {
      console.log("✅ SSE connected");
      setConnected(true);
    };

    // Listen for "initial" event - full state snapshot
    sse.addEventListener("initial", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📦 Received initial SSE data:", {
          timing: Object.keys(data.timing?.Lines || {}).length,
          lap: data.lap_count,
          weather: data.weather?.AirTemp
        });
        onInitial?.(data);
      } catch (error) {
        console.error("Failed to parse initial SSE data:", error);
      }
    });

    // Listen for "update" event - incremental updates (already merged on backend)
    sse.addEventListener("update", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔄 Received SSE update:", {
          timing: Object.keys(data.timing?.Lines || {}).length,
          lap: data.lap_count,
          timestamp: data.timestamp
        });
        onUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse SSE update:", error);
      }
    });

    setEventSource(sse);

    return sse;
  }, [url, enabled, onInitial, onUpdate, onError]);

  const disconnect = useCallback(() => {
    if (eventSource) {
      console.log("🔌 Disconnecting SSE");
      eventSource.close();
      setEventSource(null);
      setConnected(false);
    }
  }, [eventSource]);

  useEffect(() => {
    const sse = connect();

    // Cleanup on unmount
    return () => {
      if (sse) {
        sse.close();
      }
    };
  }, [connect]);

  return {
    connected,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 1000);
    }
  };
}
