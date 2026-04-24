# ONBOARD Dashboard - API Architecture & Structure

## Overview
The ONBOARD application operates on a decoupled client-server architecture:
1. **Frontend**: Next.js 15 React application (`/frontend`)
2. **Backend**: FastAPI Python application (`/backend`)

The frontend never communicates directly with external F1 data providers. Instead, it exclusively calls the Python FastAPI backend. The backend acts as a proxy, multiplexer, and data normalizer.

---

## 1. The Real-Time SSE Pipeline (Live Timing)

The jewel of the architecture is the Server-Sent Events (SSE) pipeline, which provides genuine, real-time, low-latency telemetry directly to the frontend without HTTP polling.

### Flow: F1 Live Timing ⇄ Backend ⇄ Frontend

#### A. Backend Ingestion (`backend/core/f1_livetiming_client.py`)
- The Python backend establishes a persistent SignalR WebSocket connection to the official Formula 1 live timing servers (`https://livetiming.formula1.com/signalr`).
- It subscribes to F1 telemetry channels (e.g., `ExtrapolatedClock`, `Position`, `TimingData`, `RaceControlMessages`, etc.).
- When SignalR data arrives, the `F1LiveTimingClient` decodes the payload, merges it into an internal state dictionary (`self.live_state`), and uses an `asyncio.Queue` to broadcast the diffs.

#### B. API Endpoint (`backend/main.py: /api/sse`)
- **Route:** `GET /api/sse`
- Returns a standard `text/event-stream` response.
- Iterates over the `asyncio.Queue` and immediately yields incoming F1 SignalR packets down to the connected Next.js clients as normalized JSON strings.

#### C. Frontend Consumption (`frontend/hooks/use-sse-live-data.ts`)
- Uses the native browser `EventSource` API to connect to `http://localhost:8000/api/sse`.
- Listens to incoming `message` events.
- Dynamically updates the React state (e.g., Driver positions, Lap times, Best Sectors) roughly every 100-300ms causing the Live Timing UI to update flawlessly.

---

## 2. Standard REST API Endpoints (Drivers & Teams)

For static or semi-static data like driver names, team colors, and headshots, the frontend uses standard REST HTTP calls. 

### Flow: Third-Party APIs ⇄ Backend ⇄ Frontend

#### Core External Data Source: OpenF1 (`https://api.openf1.org/`)
Currently, the backend queries the OpenF1 API dynamically, extracting current team and driver mappings.

#### `GET /api/drivers`
- **Purpose**: Returns the standardized list of F1 Drivers currently on the grid.
- **Backend Logic**:
  - The backend queries `https://api.openf1.org/v1/drivers?year={current_year}`.
  - Normalizes the OpenF1 payload (combining first/last names, extracting team colors and acronyms, appending headshots).
  - Caches the payload in memory to prevent rate-limiting from OpenF1 on subsequent requests.
- **Frontend Usage**: Called by `live-timing-f1.tsx` to match raw telemetry car numbers (e.g., `1`, `4`, `16`) to driver metadata (Name: Max Verstappen, Team: Red Bull, Color: #3671C6).

#### `GET /api/teams`
- **Purpose**: Returns information about current constructors (teams).
- **Frontend Usage**: (Currently less utilized due to the removal of standings, but available for historical scaling).

---

## 3. Deprecated & Removed APIs

During the V4 optimization and cleanup phase, several APIs were permanently disabled or removed:
- **Ergast API Endpoints**: All historical Ergast references (`/api/standings/drivers`, `/api/standings/constructors`) were deleted due to Ergast shutting down at the end of 2024. The frontend Standings tabs were completely removed from `navigation.ts` and `dashboard-content.tsx`.
- **Live Polling Endpoints**: Unnecessary HTTP polling endpoints (e.g., `/api/live/positions`, `/api/live/weather`) were removed from `backend/main.py` because the new SSE pipeline handles all real-time events natively in a single multiplexed stream.

## Summary

Currently, the stack is lean and optimized exclusively for **Live Telemetry** and **Schedule Planning**.
1. To add a component reading live car speeds -> Listen to the SSE hook.
2. To add a component needing car colors/faces -> Fetch `/api/drivers`.
