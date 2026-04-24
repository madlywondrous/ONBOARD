"""
ONBOARD F1 Dashboard - Backend API
FastAPI server for live timing using Official F1 Live Timing API
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Response
from contextlib import asynccontextmanager
import asyncio
import base64
import time
from typing import List, Dict, Any, Optional, Set
import copy
import json
from datetime import datetime, date
import os
from dotenv import load_dotenv
import io
import httpx
from tests.mock_data import (
    MOCK_DRIVERS,
    MOCK_TEAMS,
)
from core.f1_livetiming_client import f1_client, TEAM_RADIO_BASE_URL
from services.schedule_service import get_schedule, get_next_round
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Reduce F1 client logging noise - set to WARNING to only show errors/warnings
logging.getLogger('f1_livetiming_client').setLevel(logging.WARNING)

# COMPLETELY suppress SignalR library spam - it's too noisy during normal reconnections
logging.getLogger('SignalRCoreClient').setLevel(logging.CRITICAL)
logging.getLogger('signalrcore').setLevel(logging.CRITICAL)
logging.getLogger('signalrcore.hub_connection_builder').setLevel(logging.CRITICAL)
logging.getLogger('signalrcore.transport').setLevel(logging.CRITICAL)

load_dotenv()

# Configuration
API_VERSION = os.getenv("API_VERSION", "v1")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
F1_LIVETIMING_BASE = "https://livetiming.formula1.com"
OPENF1_BASE_URL = os.getenv("OPENF1_BASE_URL", "https://api.openf1.org/v1")
CURRENT_SEASON_YEAR_ENV = os.getenv("CURRENT_SEASON_YEAR")

# Session-aware polling intervals (in seconds) - optimized for F1 race dynamics
SESSION_POLL_INTERVALS = {
    "Race": 0.3,          # 300ms - High frequency for live race action
    "Sprint": 0.3,        # 300ms - Same as race
    "Qualifying": 0.5,    # 500ms - Medium frequency for quali runs
    "Practice": 1.0,      # 1000ms - Lower frequency, save resources
    "default": 0.5        # 500ms - Default fallback
}

# Session-specific data priorities for optimized fetching
SESSION_DATA_PRIORITIES = {
    "Race": ["timing", "lap_count", "positions", "track_status", "timing_app_data"],
    "Sprint": ["timing", "lap_count", "positions", "track_status", "timing_app_data"],
    "Qualifying": ["timing", "timing_stats", "track_status", "timing_app_data"],
    "Practice": ["timing", "weather", "timing_stats"],
}

# Cache for storing live data
live_data_cache: Dict[str, Any] = {}
active_connections: List[WebSocket] = []
current_session_type: Optional[str] = None  # Track current session for adaptive polling



class SSEBroadcaster:
    """
    Manage SSE subscribers with bounded queues and diff fan-out.
    Based on f1-dash patterns: prevents duplicate data and handles disconnections gracefully.
    """

    def __init__(self, max_queue_size: int = 64) -> None:
        self._max_queue_size = max_queue_size
        self._queues: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue_size)
        async with self._lock:
            self._queues.add(queue)
        logger.debug(f"SSE client subscribed, total subscribers: {len(self._queues)}")
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        async with self._lock:
            self._queues.discard(queue)
        logger.debug(f"SSE client unsubscribed, remaining subscribers: {len(self._queues)}")

    async def broadcast(self, event: str, payload: Any, force: bool = False) -> int:
        """
        Broadcast event to all subscribers.
        
        Args:
            event: Event name
            payload: Event payload
            force: If True, broadcast even if payload is duplicate (for keep-alive)
        """
        # CRITICAL FIX: DISABLE duplicate detection for live sessions
        # F1 data has nested values that change even when structure appears same
        # This was causing frontend to freeze on one data point
        # Always broadcast updates to ensure frontend gets all changes
        
        message = {
            "event": event,
            "data": payload if isinstance(payload, str) else _json_dumps(payload),
        }

        async with self._lock:
            targets = list(self._queues)

        if not targets:
            return 0

        stale: List[asyncio.Queue] = []
        sent_count = 0
        
        for queue in targets:
            try:
                # CRITICAL: Clear queue if full to prevent getting stuck (f1-dash pattern)
                if queue.full():
                    # Drop oldest messages to make room
                    try:
                        while queue.full():
                            queue.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                
                queue.put_nowait(message)
                sent_count += 1
            except asyncio.QueueFull:
                # Queue still full after clearing - mark as stale
                stale.append(queue)
            except Exception as e:
                logger.warning(f"Error sending to SSE queue: {e}")
                stale.append(queue)

        # Remove stale queues (disconnected clients)
        if stale:
            async with self._lock:
                for queue in stale:
                    self._queues.discard(queue)
            logger.debug(f"Removed {len(stale)} stale SSE connections")

        return sent_count


sse_broadcaster = SSEBroadcaster()


def _format_sse_event(event_name: str, payload: Any) -> str:
    """Serialize payload as SSE frame with explicit event name."""
    data = payload if isinstance(payload, str) else _json_dumps(payload)
    # Split to preserve multiline payloads
    data_lines = data.splitlines() or [""]
    formatted_data = "\n".join(f"data: {line}" for line in data_lines)
    if event_name:
        return f"event: {event_name}\n{formatted_data}\n\n"
    return f"{formatted_data}\n\n"


def _compute_top_level_diff(previous: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a shallow diff between snapshots.
    
    IMPORTANT: Always return the full timing/lap_count/weather data even if the dict reference
    is the same, because the VALUES INSIDE may have changed during live sessions.
    This ensures the frontend receives ALL updates during races.
    
    CRITICAL FIX: Always include critical keys to ensure frontend gets updates even when
    data structure appears unchanged but values inside have changed.
    """
    diff: Dict[str, Any] = {}
    
    # Critical keys that should ALWAYS be included if they exist
    # These change frequently during live sessions - ALWAYS send them to ensure updates
    always_include_keys = {'timing', 'lap_count', 'weather', 'track_status', 'timing_app_data', 'positions', 'car_data', 'timing_stats'}

    for key, value in current.items():
        if key == 'last_update':
            continue
        
        # Always include critical live session keys (even if reference is same)
        # This ensures frontend gets updates even when nested values change
        if key in always_include_keys:
            diff[key] = value
        # For other keys, only include if actually different
        elif key not in previous or previous[key] != value:
            diff[key] = value

    for key in previous.keys():
        if key == 'last_update':
            continue
        if key not in current:
            diff[key] = None

    # Always include last_update timestamp to ensure frontend detects changes
    if 'last_update' in current:
        diff['last_update'] = current['last_update']
    
    # CRITICAL: If we have any critical keys, always return a diff (even if empty dict)
    # This ensures we broadcast updates even when only nested values change
    if any(key in always_include_keys for key in current.keys()):
        # Ensure we have at least last_update in diff
        if not diff:
            diff['last_update'] = current.get('last_update')

    return diff

# Cache helpers

def _clone_for_cache(value: Any) -> Any:
    """Ensure mutable payloads are copied before storing in the live cache."""
    if isinstance(value, (dict, list)):
        return copy.deepcopy(value)
    return value


def _extract_task_result(result: Any, label: str) -> Any:
    """Return coroutine result or log and swallow exceptions for resilient updates."""
    if isinstance(result, Exception):
        logger.warning("Failed to fetch %s: %s", label, result)
        return None
    return result


def _json_default(value: Any) -> Any:
    """Fallback serializer for non-JSON-native types."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray)):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return base64.b64encode(value).decode("ascii")
    if isinstance(value, set):
        return list(value)
    if hasattr(value, "model_dump"):
        try:
            return value.model_dump()
        except Exception:
            return str(value)
    if hasattr(value, "dict"):
        try:
            return value.dict()
        except Exception:
            return str(value)
    try:
        return str(value)
    except Exception:
        return repr(value)


def _json_dumps(payload: Any) -> str:
    try:
        return json.dumps(payload, default=_json_default)
    except Exception as exc:
        logger.warning("Failed to serialise payload for SSE: %s", exc)
        return json.dumps(_json_default(payload))

# Track timing progress to detect stale data and trigger forced reconnects
_timing_progress_lap: int = 0
_timing_progress_timestamp: float = time.monotonic()
_TIMING_STALENESS_LAP_GAP: int = 2
_TIMING_STALENESS_SECONDS: float = 6.0


def _sanitize_timing_data(timing: Dict[str, Any]) -> Dict[str, Any]:
    """Remove metadata keys that start with '_' from timing lines."""
    if not timing:
        return {}

    lines = timing.get('Lines')
    if not isinstance(lines, dict):
        return timing

    filtered_lines = {
        driver_num: line_data
        for driver_num, line_data in lines.items()
        if isinstance(line_data, dict) and not str(driver_num).startswith('_')
    }

    sanitized = dict(timing)
    sanitized['Lines'] = filtered_lines
    return sanitized


def _sanitize_timing_app_data(app_data: Dict[str, Any]) -> Dict[str, Any]:
    """Filter timing app data to drop metadata keys."""
    if not app_data:
        return {}

    lines = app_data.get('Lines')
    if isinstance(lines, dict):
        filtered = {
            driver_num: line_data
            for driver_num, line_data in lines.items()
            if isinstance(line_data, dict) and not str(driver_num).startswith('_')
        }
        sanitized = dict(app_data)
        sanitized['Lines'] = filtered
        return sanitized

    return app_data


def _sanitize_driver_map(drivers: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(drivers, dict):
        return {}
    return {
        driver_num: data
        for driver_num, data in drivers.items()
        if not str(driver_num).startswith('_')
    }


def _extract_max_completed_lap(timing: Dict[str, Any]) -> Optional[int]:
    """Return the highest completed lap from timing data, if available."""
    if not timing:
        return None

    lines = timing.get('Lines')
    if not isinstance(lines, dict):
        return None

    completed_laps: List[int] = []
    for line_data in lines.values():
        if not isinstance(line_data, dict):
            continue
        laps_value = line_data.get('NumberOfLaps')
        if isinstance(laps_value, (int, float)):
            try:
                completed_laps.append(int(laps_value))
            except (TypeError, ValueError):
                continue

    return max(completed_laps) if completed_laps else None




def _resolve_current_season_year() -> int:
    if CURRENT_SEASON_YEAR_ENV and CURRENT_SEASON_YEAR_ENV.isdigit():
        return int(CURRENT_SEASON_YEAR_ENV)

    return datetime.utcnow().year


async def _fetch_openf1_json(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    base_url = OPENF1_BASE_URL.rstrip('/')
    url = f"{base_url}/{endpoint.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params or {})
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.debug("OpenF1 request failed for %s: %s", url, exc)
        return None


async def _fetch_openf1_driver_list() -> Optional[List[Dict[str, Any]]]:
    season_year = _resolve_current_season_year()
    payload = await _fetch_openf1_json("drivers", {"year": season_year})
    if not isinstance(payload, list):
        return None

    drivers_by_number: Dict[int, Dict[str, Any]] = {}
    for entry in payload:
        try:
            driver_number = int(entry.get("driver_number"))
        except (TypeError, ValueError):
            continue

        # Prefer entries that include a team colour and acronym when duplicates exist
        if driver_number in drivers_by_number:
            existing = drivers_by_number[driver_number]
            if existing.get("team_colour") or existing.get("name_acronym"):
                continue

        full_name = entry.get("full_name") or (
            f"{entry.get('first_name', '')} {entry.get('last_name', '')}".strip()
        )
        team_colour = entry.get("team_colour") or "FFFFFF"
        team_colour = str(team_colour).lstrip('#').upper() or "FFFFFF"

        drivers_by_number[driver_number] = {
            "driver_number": driver_number,
            "full_name": full_name,
            "name_acronym": entry.get("name_acronym") or entry.get("broadcast_name") or full_name[:3].upper(),
            "team_name": entry.get("team_name") or entry.get("team"),
            "team_colour": team_colour,
            "country_code": (entry.get("country_code") or "").upper(),
        }

    if not drivers_by_number:
        return None

    sorted_entries = sorted(drivers_by_number.values(), key=lambda item: item["driver_number"])
    logger.info("OpenF1 driver fallback used (%d drivers for %s)", len(sorted_entries), season_year)
    return sorted_entries



async def update_live_cache():
    """
    Update live data cache from F1 API with session-aware optimization.
    Adapts data fetching based on current session type (Race/Quali/Practice).
    """
    global current_session_type
    
    try:
        previous_state = live_data_cache.copy()
        snapshot: Dict[str, Any] = {}

        # Fetch session info first to determine session type
        session_info_res = await f1_client.get_session_info()
        session_info = _extract_task_result(session_info_res, "session_info")
        
        if session_info:
            snapshot['session'] = session_info
            new_session_type = session_info.get('Type', 'Unknown')
            
            # Log session type changes for adaptive polling
            if new_session_type != current_session_type:
                current_session_type = new_session_type
                logger.info(f"Session type changed: {current_session_type}")
                logger.info(f"Adaptive polling: {SESSION_POLL_INTERVALS.get(current_session_type, 0.5)}s")
        elif not previous_state.get('session'):
            logger.info("Waiting for session info...")

        # Determine session-specific data priorities
        session_type = current_session_type or "default"
        is_race_session = session_type in ["Race", "Sprint"]
        is_quali_session = session_type == "Qualifying"
        
        # Parallel fetch based on session type - optimize critical data first
        if is_race_session:
            # Race: Prioritize timing, positions, lap count, track status
            (
                timing_res,
                session_status_res,
                positions_res,
                track_status_res,
                timing_app_res,
                weather_res,
                drivers_res,
                race_control_res,
                car_data_res,
                timing_stats_res,
            ) = await asyncio.gather(
                f1_client.get_timing_data(),
                f1_client.get_session_status(),
                f1_client.get_position_data(),
                f1_client.get_track_status(),
                f1_client.get_timing_app_data(),
                f1_client.get_weather_data(),
                f1_client.get_driver_list(),
                f1_client.get_race_control_messages(),
                f1_client.get_car_data(),
                f1_client.get_timing_stats(),
                return_exceptions=True,
            )
        elif is_quali_session:
            # Qualifying: Prioritize timing stats, timing data, track status
            (
                timing_res,
                timing_stats_res,
                track_status_res,
                session_status_res,
                timing_app_res,
                positions_res,
                weather_res,
                drivers_res,
                race_control_res,
                car_data_res,
            ) = await asyncio.gather(
                f1_client.get_timing_data(),
                f1_client.get_timing_stats(),
                f1_client.get_track_status(),
                f1_client.get_session_status(),
                f1_client.get_timing_app_data(),
                f1_client.get_position_data(),
                f1_client.get_weather_data(),
                f1_client.get_driver_list(),
                f1_client.get_race_control_messages(),
                f1_client.get_car_data(),
                return_exceptions=True,
            )
        else:
            # Practice/Default: Balanced fetching
            (
                timing_res,
                session_status_res,
                positions_res,
                weather_res,
                drivers_res,
                race_control_res,
                track_status_res,
                car_data_res,
                timing_stats_res,
                timing_app_res,
            ) = await asyncio.gather(
                f1_client.get_timing_data(),
                f1_client.get_session_status(),
                f1_client.get_position_data(),
                f1_client.get_weather_data(),
                f1_client.get_driver_list(),
                f1_client.get_race_control_messages(),
                f1_client.get_track_status(),
                f1_client.get_car_data(),
                f1_client.get_timing_stats(),
                f1_client.get_timing_app_data(),
                return_exceptions=True,
            )

        # Process timing data (critical for all sessions)
        timing = _extract_task_result(timing_res, "timing_data")
        if timing and timing.get('Lines'):
            sanitized_timing = _sanitize_timing_data(timing)
            snapshot['timing'] = sanitized_timing
        elif not previous_state.get('timing'):
            logger.info("Waiting for timing data...")
        
        # Get LAP COUNT - CRITICAL for race/sprint sessions
        lap_count = f1_client.lap_count or {}
        if not lap_count.get('CurrentLap'):
            session_status = _extract_task_result(session_status_res, "session_status")
            fallback_lap = session_status.get('lap_count') if isinstance(session_status, dict) else None
            if fallback_lap and fallback_lap.get('CurrentLap') is not None:
                lap_count = fallback_lap

        if lap_count and lap_count.get('CurrentLap') is not None:
            snapshot['lap_count'] = lap_count
        elif not previous_state.get('lap_count') and is_race_session:
            logger.info("No lap count data available yet (Race session)")
        
        # Timing app data (tyres, DRS, etc.) - critical for race strategy
        timing_app = _extract_task_result(timing_app_res, "timing_app_data") or f1_client.timing_app_data
        if timing_app:
            snapshot['timing_app_data'] = _sanitize_timing_app_data(timing_app)
        
        # Positions - more critical in race sessions
        positions = _extract_task_result(positions_res, "position_data")
        if positions:
            snapshot['positions'] = positions
        
        # Weather - important for strategy
        weather = _extract_task_result(weather_res, "weather_data")
        if weather:
            snapshot['weather'] = weather
        
        # Driver list
        drivers = _extract_task_result(drivers_res, "driver_list")
        if drivers:
            snapshot['drivers'] = _sanitize_driver_map(drivers)
        
        # Race control messages - critical for safety car, flags
        messages = _extract_task_result(race_control_res, "race_control_messages")
        if messages:
            snapshot['race_control'] = messages
        
        # Track status - critical for flags, safety car
        track_status = _extract_task_result(track_status_res, "track_status")
        if track_status:
            snapshot['track_status'] = track_status
        
        # Team radio - keep last 25 messages
        team_radio = f1_client.team_radio
        if team_radio:
            snapshot['team_radio'] = team_radio[-25:]

        # Ensure session info persists if available
        if 'session' not in snapshot and previous_state.get('session'):
            snapshot['session'] = previous_state['session']

        # Car telemetry (speed, throttle, etc.) - more important in race
        car_data = _extract_task_result(car_data_res, "car_data")
        if car_data:
            snapshot['car_data'] = car_data

        # Timing stats (purple sectors etc.) - critical for qualifying
        timing_stats = _extract_task_result(timing_stats_res, "timing_stats")
        if timing_stats:
            snapshot['timing_stats'] = timing_stats
        
        snapshot['last_update'] = datetime.utcnow().isoformat()

        # Work on deep copies to avoid accidental shared references with SignalR store
        snapshot_copy = {key: _clone_for_cache(value) for key, value in snapshot.items()}
        
        # CRITICAL FIX: Create a deep copy of previous_state for comparison
        # This ensures we're comparing actual data, not references
        previous_state_copy = {key: _clone_for_cache(value) for key, value in previous_state.items()}
        
        diff_payload = _compute_top_level_diff(previous_state_copy, snapshot_copy)

        # Replace live cache atomically to avoid partial states
        live_data_cache.clear()
        live_data_cache.update(snapshot_copy)
        
        # OPTIMIZED: Always include critical keys in diff to ensure updates are broadcast
        # This ensures frontend gets updates even when only nested values change
        critical_keys_present = any(key in snapshot_copy for key in ['timing', 'lap_count', 'weather', 'track_status', 'timing_app_data'])
        if critical_keys_present:
            # Always ensure critical keys are in diff payload
            if not diff_payload:
                diff_payload = {}
            # Always include last_update timestamp
            diff_payload['last_update'] = snapshot_copy.get('last_update')
            # Always include critical keys if they exist
            for key in ['timing', 'lap_count', 'weather', 'track_status', 'timing_app_data', 'positions', 'car_data']:
                if key in snapshot_copy:
                    diff_payload[key] = snapshot_copy[key]
        
        # Log cache summary only when there are changes or every 20 updates (reduced logging)
        if diff_payload or (hasattr(update_live_cache, '_update_count') and update_live_cache._update_count % 20 == 0):
            logger.debug(
                "[+] [%s] Cache updated: timing=%s, lap=%s, track_status=%s, diff_keys=%s",
                session_type,
                len(snapshot_copy.get('timing', {}).get('Lines', {})),
                snapshot_copy.get('lap_count', {}).get('CurrentLap') if snapshot_copy.get('lap_count') else None,
                snapshot_copy.get('track_status', {}).get('Status', '?'),
                list(diff_payload.keys()) if diff_payload else []
            )
        
        # Track update count for periodic logging
        if not hasattr(update_live_cache, '_update_count'):
            update_live_cache._update_count = 0
        update_live_cache._update_count += 1

        return diff_payload
        
    except Exception as e:
        logger.error(f"Error updating live cache: {e}", exc_info=True)
        return None


async def poll_live_data():
    """
    STREAM DATA: SignalR pushes updates, we broadcast them immediately
    """
    global _timing_progress_lap, _timing_progress_timestamp, current_session_type
    
    logger.info("Starting live data broadcast loop...")
    
    while True:
        try:
            # Reconnect ONLY if connection is dead
            if not f1_client.is_alive():
                logger.warning("Connection dead, reconnecting...")
                await f1_client.reconnect_if_needed()
            
            # Get current data (SignalR updates it automatically in background)
            diff_payload = await update_live_cache()
            
            # Broadcast IMMEDIATELY if we have data
            if diff_payload:
                subscriber_count = await sse_broadcaster.broadcast("update", diff_payload)
                # Log occasionally
                if not hasattr(poll_live_data, '_count'):
                    poll_live_data._count = 0
                poll_live_data._count += 1
                if poll_live_data._count % 100 == 0:
                    logger.info(f"Broadcast #{poll_live_data._count} ({len(diff_payload)} keys to {subscriber_count} clients)")
            
            # Very fast polling to catch SignalR updates instantly
            await asyncio.sleep(0.05)  # 50ms = 20 updates per second

        except Exception as e:
            logger.error(f"Error: {e}")
            await asyncio.sleep(0.5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown"""
    # Startup
    logger.info("ONBOARD F1 Backend starting...")
    logger.info(f"F1 Live Timing: {F1_LIVETIMING_BASE}")
    logger.info(f"CORS Origins: {CORS_ORIGINS}")
    logger.info(f"Session-aware polling enabled: Race=300ms, Quali=500ms, Practice=1000ms")
    
    # Start managed F1 Live Timing connection with auto-reconnect
    # Based on f1-dash pattern: continuous monitoring with 30s timeout
    f1_task = asyncio.create_task(f1_client.start_managed_connection())
    
    # Wait for initial connection
    max_wait = 15  # seconds
    start_time = asyncio.get_event_loop().time()
    while not f1_client.connected:
        if asyncio.get_event_loop().time() - start_time > max_wait:
            logger.warning(" Initial F1 connection timeout - will retry in background")
            break
        await asyncio.sleep(0.5)
    
    # Populate cache with initial data BEFORE starting SSE
    # This prevents "No data" flash on frontend
    logger.info("Fetching initial data...")
    await update_live_cache()
    
    # Wait a moment for data to propagate
    await asyncio.sleep(0.5)
    
    # Check if we got any data
    if live_data_cache:
        logger.info(f"Initial cache populated with {len(live_data_cache)} data streams")
    else:
        logger.warning(" Initial cache is empty - may be no active session")
    
    # Start background task for polling live data
    poll_task = asyncio.create_task(poll_live_data())
    
    yield
    
    # Shutdown
    logger.info("ONBOARD F1 Backend shutting down...")
    poll_task.cancel()
    f1_task.cancel()
    f1_client.disconnect()


# Initialize FastAPI app
app = FastAPI(
    title="ONBOARD F1 Dashboard API",
    description="Real-time F1 live timing and race data using Official F1 API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip middleware for compressing responses
app.add_middleware(GZipMiddleware, minimum_size=1000)



# ===== API ENDPOINTS =====

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ONBOARD F1 Dashboard API",
        "version": "2.0.0",
        "status": "running",
        "data_source": "Official F1 Live Timing",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    last_message_time = f1_client._t_last_message
    time_since_message = time.time() - last_message_time if last_message_time else None
    
    return {
        "status": "ok",
        "f1_connected": f1_client.connected,
        "f1_alive": f1_client.is_alive(),
        "last_message_seconds_ago": round(time_since_message, 1) if time_since_message else None,
        "has_timing_data": bool(f1_client.timing_data),
        "has_session_info": bool(f1_client.session_info),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/health")
async def api_health():
    """Compatibility health endpoint matching f1-dash API."""
    return await health()


# ===== LIVE TIMING ENDPOINTS =====

@app.get("/api/team-radio/proxy")
async def proxy_team_radio(url: str, request: Request):
    """Stream team radio audio through backend to avoid CORS issues."""
    if not url:
        raise HTTPException(status_code=400, detail="Missing team radio URL")

    if not url.startswith(TEAM_RADIO_BASE_URL):
        raise HTTPException(status_code=400, detail="Invalid team radio source")

    try:
        range_header = request.headers.get("range")
        upstream_headers = {
            "User-Agent": "ONBOARD-F1-Dashboard/2.0",
            "Referer": "https://livetiming.formula1.com/",
            "Origin": "https://livetiming.formula1.com"
        }
        if range_header:
            upstream_headers["Range"] = range_header

        cookie_header = f1_client.headers.get("Cookie") if hasattr(f1_client, "headers") else None
        if cookie_header:
            upstream_headers["Cookie"] = cookie_header

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            upstream = await client.get(url, headers=upstream_headers)

        if upstream.status_code not in (200, 206):
            logger.warning(f"Team radio fetch failed ({upstream.status_code}) for {url}")
            raise HTTPException(status_code=upstream.status_code, detail="Unable to fetch team radio")

        response_headers = {
            "Cache-Control": "public, max-age=30",
            "Accept-Ranges": upstream.headers.get("accept-ranges", "bytes")
        }

        content_length = upstream.headers.get("content-length")
        if content_length:
            response_headers["Content-Length"] = content_length

        content_range = upstream.headers.get("content-range")
        if content_range:
            response_headers["Content-Range"] = content_range

        media_type = upstream.headers.get("content-type", "audio/mpeg")

        return StreamingResponse(
            io.BytesIO(upstream.content),
            status_code=upstream.status_code,
            media_type=media_type,
            headers=response_headers
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error proxying team radio {url}: {exc}")
        raise HTTPException(status_code=500, detail="Unable to proxy team radio")


# ===== DRIVERS ENDPOINTS =====

@app.get("/api/drivers")
async def get_drivers():
    """Get all drivers in current session"""
    try:
        # Try to get from F1 Live Timing
        drivers = await f1_client.get_driver_list()

        if drivers:
            # Convert F1 format to our format
            driver_list = []
            for driver_num, driver_data in drivers.items():
                # Skip metadata keys (start with underscore)
                if driver_num.startswith('_'):
                    continue

                # Skip if not a valid driver number
                try:
                    int(driver_num)
                except ValueError:
                    continue

                driver_list.append({
                    "driver_number": int(driver_num),
                    "full_name": driver_data.get("FullName", driver_data.get("FirstName", "") + " " + driver_data.get("LastName", "")),
                    "name_acronym": driver_data.get("Tla", ""),
                    "team_name": driver_data.get("TeamName", ""),
                    "team_colour": driver_data.get("TeamColour", "FFFFFF"),
                    "country_code": driver_data.get("CountryCode", "")
                })

            if driver_list:
                return sorted(driver_list, key=lambda x: x['driver_number'])

        openf1_drivers = await _fetch_openf1_driver_list()
        if openf1_drivers:
            return openf1_drivers

        # Fallback to mock data when everything else fails
        logger.warning("Using mock drivers fallback data")
        return MOCK_DRIVERS
        
    except Exception as e:
        logger.error(f"Error getting drivers: {e}")
        return MOCK_DRIVERS


@app.get("/api/drivers/{driver_number}")
async def get_driver(driver_number: int):
    """Get specific driver details"""
    try:
        drivers = await get_drivers()
        
        for driver in drivers:
            if driver.get("driver_number") == driver_number:
                return driver
        
        raise HTTPException(status_code=404, detail="Driver not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting driver: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== TEAM ENDPOINTS =====

@app.get("/api/teams")
async def get_teams():
    """Get all teams"""
    try:
        drivers = await get_drivers()
        
        # Extract unique teams
        teams = {}
        for driver in drivers:
            team_name = driver.get('team_name')
            if team_name and team_name not in teams:
                teams[team_name] = {
                    'name': team_name,
                    'color': driver.get('team_colour'),
                    'drivers': []
                }
            if team_name:
                teams[team_name]['drivers'].append({
                    'number': driver.get('driver_number'),
                    'name': driver.get('full_name'),
                    'acronym': driver.get('name_acronym')
                })
        
        return list(teams.values())
        
    except Exception as e:
        logger.error(f"Error getting teams: {e}")
        return MOCK_TEAMS


# ===== STANDINGS ENDPOINTS =====


# ===== SCHEDULE ENDPOINTS (f1-dash compatible) =====

@app.get("/api/schedule")
async def get_schedule_endpoint():
    """Get current season schedule (f1-dash compatible payload)."""
    try:
        return await get_schedule()
    except Exception as exc:
        logger.error(f"Error getting schedule: {exc}")
        raise HTTPException(status_code=500, detail="Unable to fetch schedule")


@app.get("/api/schedule/next")
async def get_next_schedule_endpoint():
    """Get next upcoming round (f1-dash compatible payload)."""
    try:
        next_round = await get_next_round()
        if not next_round:
            return Response(status_code=204)
        return next_round
    except Exception as exc:
        logger.error(f"Error getting next schedule: {exc}")
        raise HTTPException(status_code=500, detail="Unable to fetch schedule")





# ===== SSE (SERVER-SENT EVENTS) ENDPOINT =====
# This is the f1-dash approach - simpler and more reliable than WebSocket for one-way streaming

@app.get("/api/sse")
async def sse_endpoint():
    """
    Server-Sent Events endpoint for real-time F1 data streaming
    Based on f1-dash architecture: send full initial state immediately, then stream updates
    """

    async def event_generator():
        queue = await sse_broadcaster.subscribe()
        client_id = id(queue)  # Unique client identifier for logging

        try:
            # Wait for initial data if cache is empty (max 5 seconds)
            wait_start = asyncio.get_event_loop().time()
            max_wait = 5.0
            
            while not live_data_cache and (asyncio.get_event_loop().time() - wait_start) < max_wait:
                await asyncio.sleep(0.1)
            
            # Send FULL initial state immediately (f1-dash approach)
            # This gives client complete data snapshot for instant rendering
            if live_data_cache:
                # Filter out internal metadata
                initial_data = {k: v for k, v in live_data_cache.items() if not k.startswith('_')}
                initial_json = _json_dumps(initial_data)
                yield f"event: initial\ndata: {initial_json}\n\n".encode("utf-8")
                logger.info(f"[>] [{client_id}] Sent full initial SSE state ({len(initial_json)} bytes, {len(initial_data)} keys)")
            else:
                logger.warning(f" [{client_id}] Cache still empty after wait - sending empty initial event")
                yield f"event: initial\ndata: {{}}\n\n".encode("utf-8")

            # CRITICAL: Track last sent message to detect stuck connections (f1-dash pattern)
            last_message_time = time.time()
            consecutive_timeouts = 0
            max_consecutive_timeouts = 3
            
            # Stream incremental updates
            while True:
                try:
                    # Wait for updates from the broadcast (10s timeout for keep-alive)
                    # CRITICAL: Use shorter timeout to detect stuck connections faster
                    message = await asyncio.wait_for(queue.get(), timeout=10.0)
                    
                    # Reset timeout counter on successful message
                    consecutive_timeouts = 0
                    last_message_time = time.time()
                    
                    event_name = message.get("event") or "message"
                    data_payload = message.get("data", "")
                    
                    # Format as SSE
                    data_str = data_payload if isinstance(data_payload, str) else _json_dumps(data_payload)
                    yield f"event: {event_name}\ndata: {data_str}\n\n".encode("utf-8")
                    
                except asyncio.TimeoutError:
                    consecutive_timeouts += 1
                    current_time = time.time()
                    time_since_last = current_time - last_message_time
                    
                    # CRITICAL: Detect stuck connections (f1-dash pattern)
                    # If no messages for 30+ seconds, connection might be stuck
                    if time_since_last > 30.0:
                        logger.warning(f" [{client_id}] No messages for {time_since_last:.1f}s - connection may be stuck")
                        # Force a ping to test connection
                        yield b"event: ping\ndata: {\"stuck_check\": true}\n\n"
                        last_message_time = current_time
                    elif consecutive_timeouts >= max_consecutive_timeouts:
                        # Send keep-alive ping (f1-dash: 10s interval)
                        yield b"event: ping\ndata: {\"timestamp\": " + str(int(current_time * 1000)).encode() + b"}\n\n"
                        consecutive_timeouts = 0
                    else:
                        # Regular keep-alive
                        yield b"event: ping\ndata: \n\n"
                        
        except asyncio.CancelledError:
            logger.info(f"SSE client [{client_id}] disconnected (cancelled)")
            raise
        except Exception as e:
            logger.error(f"SSE error for client [{client_id}]: {e}", exc_info=True)
            raise
        finally:
            await sse_broadcaster.unsubscribe(queue)
            logger.debug(f"SSE client [{client_id}] cleanup complete")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@app.get("/api/realtime")
async def realtime_endpoint():
    """Compatibility SSE endpoint matching f1-dash realtime path."""
    return await sse_endpoint()


# ===== WEBSOCKET ENDPOINT =====

@app.websocket("/ws/live")
async def websocket_live_timing(websocket: WebSocket):
    """WebSocket endpoint for real-time live timing"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send initial data
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to ONBOARD F1 Live Timing",
            "data": live_data_cache
        })
        
        # Keep connection alive
        while True:
            # Wait for client messages (ping/pong)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)





if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", 8000))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
