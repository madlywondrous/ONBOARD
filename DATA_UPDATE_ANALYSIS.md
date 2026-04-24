# F1 Dashboard Data Modernization Analysis

## Executive Summary
Your F1 Dashboard currently displays outdated calendar information and standing statistics but correctly displays live timing data. This deep-dive analysis reveals exactly why this is occurring (hardcoded frontend data vs dynamic backend bindings) and provides a roadmap to make your platform fully dynamic and production-ready for the current and future Formula 1 seasons.

## Why is the Dashboard Stuck in the Past?

### 1. Static Frontend Data Sources
The primary issue stems from the Next.js frontend being explicitly tied to 2025 static files rather than querying the backend or an external API for the calendar schedule.
- **Component Text:** Files like `components/dashboard/standings-section.tsx` explicitly hardcode "2025 Championship Standings" rather than dynamically taking the current year.
- **Calendar Data:** The dashboard's entire understanding of the F1 schedule is driven by a local static file: `frontend/lib/data/f1-2025-calendar.json`. Since the current year is 2026, the app's timeline evaluates to be entirely in the past or in the "Winter Break".
- **Season Status Logic:** In `frontend/hooks/use-f1-season.ts`, the code relies on a statically exported `F1_2025_CALENDAR` object. Because the current date exceeds these boundaries, logic determining `getCurrentSeasonStatus()` constantly defaults to dormant states (e.g., Winter Break), preventing the frontend from refreshing upcoming event modules.

### 2. Disconnected Standings APIs
- While F1's **OpenF1 API** integration retrieves driver telemetry dynamically (using `_resolve_current_season_year()`), OpenF1 does not natively supply robust championship standings. 
- Historically, projects relied on the **Ergast API** to provide schedules and standings. Ergast was officially discontinued at the end of 2024. If your backend fallbacks attempt to hit old Ergast or mock data structures, they will silently fail or return default fallback mock data from 2024/2025.

### 3. Why Live Timing STILL Works
Live timing modules (e.g., `use-sse-live-data.ts`, `backend/core/f1_livetiming_client.py`) connect directly to the official Formula 1 SignalR WebSocket multiplexer. 
- The live SignalR feed does not care about what year it is; it blindly broadcasts whatever session is currently active or most recently completed on the F1 servers. 
- Because this pipeline is stateless and event-driven, it correctly pulled the last valid event.

---

## Technical Action Plan: Achieving a Fully Dynamic Application

To resolve these issues and create a dashboard that automatically updates itself year-over-year, follow these implementation steps:

### Phase 1: Migrate Frontend from Static to Dynamic Calendar
1. **Remove Hardcoded JSON:** Delete `f1-2025-calendar.json` and the static exported calendar dates inside `use-f1-season.ts`.
2. **Backend Schedule Endpoint:** Implement a robust `GET /api/schedule?year={currentYear}` on your FastAPI backend. This endpoint should fetch the current year's schedule from a maintained data source (like the *Jolpi F1 API* which replaced Ergast, or scrape the official API).
3. **Dynamic Frontend Hooks:** Update `use-f1-calendar.ts` to fetch from the new backend schedule endpoint. Replace `new Date("2025-...")` logic with relative parsing.

### Phase 2: Modernize Standings & Driver APIs
1. **Replace Ergast:** Ensure the backend completely removes any remaining Ergast URL traces. Integrate the **Jolpi F1 (ergast compatible) API** (`https://ergast.com/api/f1` -> `https://jolpi.ca/ergast/f1/`) OR exclusively leverage `fastf1` cache loading logic for historical standings.
2. **Dynamic UI Text:** Refactor headers such as `2025 Championship Standings` to `{currentYear} Championship Standings` by reading `new Date().getFullYear()` or inheriting the year from the fetched data context.

### Phase 3: Enhance Season State Management
1. **Smart Polling:** Expand `use-f1-season.ts` so that `getNextEvent()` evaluates dynamically against the live fetched schedule, completely eliminating the manual `F1_2025_CALENDAR` thresholds.
2. **Server-Sent Trigger:** You already have SSE (`/api/sse`) implemented beautifully for timing. You can push a `SESSION_STATE_CHANGE` event over this SSE bus when a new season or race weekend starts to shift the frontend out of "Winter Break" instantly without refreshing.

## Conclusion
The application's structural division is solid, and the live-timing mechanism is flawless. Fixing the outdated schedule and standings requires deleting the hardcoded 2025 JSON/TS files in the frontend and replacing them with a React Query or SWR fetch to a dynamically dated backend route powered by a Modern F1 API maintainer.
