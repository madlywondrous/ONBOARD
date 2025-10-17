"""
ONBOARD F1 Dashboard - Backend API
FastAPI server for live timing using Official F1 Live Timing API
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi import Response
from sse_starlette.sse import EventSourceResponse
from contextlib import asynccontextmanager
import asyncio
import time
from typing import List, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import io
import httpx
from mock_data import MOCK_DRIVERS, MOCK_TEAMS
from f1_livetiming_client import f1_client, TEAM_RADIO_BASE_URL
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Set debug level for F1 client to see real-time updates
logging.getLogger('f1_livetiming_client').setLevel(logging.DEBUG)

load_dotenv()

# Configuration
API_VERSION = os.getenv("API_VERSION", "v1")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
F1_LIVETIMING_BASE = "https://livetiming.formula1.com"

# Cache for storing live data
live_data_cache: Dict[str, Any] = {}
active_connections: List[WebSocket] = []
sse_clients: List[asyncio.Queue] = []


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


async def update_live_cache():
    """Update live data cache from F1 API"""
    try:
        logger.debug("🔄 Updating live cache...")
        
        snapshot: Dict[str, Any] = {}

        # Get session info
        session_info = await f1_client.get_session_info()
        if session_info:
            snapshot['session'] = session_info
            logger.debug(f"✅ Session: {session_info.get('Type', 'Unknown')}")
        else:
            logger.warning("⚠️ No session info received")

        # Get timing data
        timing = await f1_client.get_timing_data()
        if timing and timing.get('Lines'):
            sanitized_timing = _sanitize_timing_data(timing)
            snapshot['timing'] = sanitized_timing
            logger.debug(f"✅ Timing: {len(sanitized_timing.get('Lines', {}))} drivers")
        else:
            logger.warning(f"⚠️ No timing data: {timing}")
        
        # Get LAP COUNT - CRITICAL for showing current lap!
        lap_count = f1_client.lap_count or {}
        if not lap_count.get('CurrentLap'):
            try:
                session_status = await f1_client.get_session_status()
                fallback_lap = session_status.get('lap_count') if isinstance(session_status, dict) else None
                if fallback_lap and fallback_lap.get('CurrentLap') is not None:
                    lap_count = fallback_lap
            except Exception as exc:
                logger.debug(f"Lap count fallback failed: {exc}")

        if lap_count and lap_count.get('CurrentLap') is not None:
            snapshot['lap_count'] = lap_count
            logger.debug(f"✅ Lap: {lap_count.get('CurrentLap', '?')}/{lap_count.get('TotalLaps', '?')}")
        else:
            logger.info("⚠️ No lap count data available yet")
        
        # Get timing app data (tyres, DRS, etc.)
        timing_app = f1_client.timing_app_data
        if timing_app:
            snapshot['timing_app_data'] = _sanitize_timing_app_data(timing_app)
            logger.debug(f"✅ Timing app data received")
        
        # Get positions
        positions = await f1_client.get_position_data()
        if positions:
            snapshot['positions'] = positions
            logger.debug(f"✅ Position data received")
        
        # Get weather
        weather = await f1_client.get_weather_data()
        if weather:
            snapshot['weather'] = weather
            logger.debug(f"✅ Weather: {weather.get('AirTemp', '?')}°C")
        else:
            logger.warning("⚠️ No weather data")
        
        # Get driver list
        drivers = await f1_client.get_driver_list()
        if drivers:
            snapshot['drivers'] = _sanitize_driver_map(drivers)
            logger.debug(f"✅ Drivers: {len(drivers)} drivers")
        else:
            logger.warning("⚠️ No driver list")
        
        # Get race control messages
        messages = await f1_client.get_race_control_messages()
        if messages:
            snapshot['race_control'] = messages
            logger.debug(f"✅ Race control: {len(messages)} messages")
        
        # Get track status
        track_status = await f1_client.get_track_status()
        if track_status:
            snapshot['track_status'] = track_status
            logger.debug(f"✅ Track status: {track_status.get('Status', '?')}")
        
        # Get team radio
        team_radio = f1_client.team_radio
        if team_radio:
            snapshot['team_radio'] = team_radio[-25:]
            logger.debug(f"✅ Team radio: {len(team_radio)} messages")

        # Ensure session info persists if available
        if 'session' not in snapshot and live_data_cache.get('session'):
            snapshot['session'] = live_data_cache['session']

        # Car telemetry (speed, throttle, etc.)
        car_data = await f1_client.get_car_data()
        if car_data:
            snapshot['car_data'] = car_data
            logger.debug("✅ Car data received")

        # Timing stats (purple sectors etc.)
        timing_stats = await f1_client.get_timing_stats()
        if timing_stats:
            snapshot['timing_stats'] = timing_stats
        
        snapshot['last_update'] = datetime.utcnow().isoformat()

        # Replace live cache atomically to avoid partial states
        live_data_cache.clear()
        live_data_cache.update(snapshot)
        
        # Log cache summary
        logger.info(f"📦 Cache updated: session={bool(live_data_cache.get('session'))}, timing={len(live_data_cache.get('timing', {}).get('Lines', {}))}, lap={live_data_cache.get('lap_count')}")
        
    except Exception as e:
        logger.error(f"Error updating live cache: {e}", exc_info=True)


async def poll_live_data():
    """Background task to poll F1 Live Timing"""
    while True:
        try:
            # Check if connection is alive and reconnect if needed
            await f1_client.reconnect_if_needed()
            
            # Log connection status
            if f1_client.is_alive():
                logger.debug("✅ F1 connection alive, updating cache...")
            else:
                logger.warning("⚠️ F1 connection not alive!")
            
            await update_live_cache()
            
            # Broadcast to SSE clients (f1-dash style)
            if sse_clients:
                sse_message = {
                    "event": "update",
                    "data": JSONResponse(content=live_data_cache).body.decode()
                }
                
                logger.debug(f"📤 Broadcasting to {len(sse_clients)} SSE client(s)")
                
                disconnected = []
                for client_queue in sse_clients:
                    try:
                        client_queue.put_nowait(sse_message)
                    except Exception as e:
                        logger.warning(f"Failed to send to SSE client: {e}")
                        disconnected.append(client_queue)
                
                # Remove disconnected clients
                for queue in disconnected:
                    sse_clients.remove(queue)
            
            # Also notify WebSocket clients (legacy support)
            if active_connections:
                message = {
                    "type": "update",
                    "data": live_data_cache,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                logger.debug(f"📤 Broadcasting to {len(active_connections)} WebSocket client(s)")
                
                disconnected = []
                for connection in active_connections:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logger.warning(f"Failed to send to WebSocket client: {e}")
                        disconnected.append(connection)
                
                # Remove disconnected clients
                for conn in disconnected:
                    active_connections.remove(conn)
        
        except Exception as e:
            logger.error(f"Error in poll loop: {e}")
        
        await asyncio.sleep(0.5)  # Update every 500ms for more responsive feel


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown"""
    # Startup
    logger.info("🏎️  ONBOARD F1 Backend starting...")
    logger.info(f"📡 F1 Live Timing: {F1_LIVETIMING_BASE}")
    logger.info(f"🔗 CORS Origins: {CORS_ORIGINS}")
    
    # Connect to F1 Live Timing
    await f1_client.connect()
    
    # Start background task for polling live data
    task = asyncio.create_task(poll_live_data())
    
    yield
    
    # Shutdown
    logger.info("🏁 ONBOARD F1 Backend shutting down...")
    task.cancel()
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

# Add middleware to prevent caching of live data
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/live"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


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


# ===== LIVE TIMING ENDPOINTS =====

@app.get("/api/live/session")
async def get_live_session():
    """Get current session info"""
    try:
        session_info = await f1_client.get_session_info()
        
        if not session_info or session_info.get("Name") == "No Active Session":
            return {
                "message": "No active F1 session. Check back during race weekends!",
                "status": "offline"
            }
        
        # Add status based on session data
        session_info['status'] = 'live'
        return session_info
        
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        return {
            "message": "Unable to fetch session data",
            "status": "error"
        }


@app.get("/api/live/positions")
async def get_live_positions():
    """Get live driver positions"""
    try:
        positions = await f1_client.get_position_data()
        
        if not positions or "Position" not in positions:
            return []
        
        # Convert position data to array format
        position_list = []
        for driver_num, pos_data in positions.get("Position", {}).items():
            if isinstance(pos_data, dict):
                position_list.append({
                    "driver_number": int(driver_num),
                    "position": pos_data.get("Position", 0),
                    "x": pos_data.get("X", 0),
                    "y": pos_data.get("Y", 0),
                    "z": pos_data.get("Z", 0),
                    "status": pos_data.get("Status", "OnTrack")
                })
        
        return sorted(position_list, key=lambda x: x['position'])
        
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        return []


@app.get("/api/live/timing")
async def get_live_timing():
    """Get live timing data (lap times, sectors, etc.)"""
    try:
        timing = await f1_client.get_timing_data()
        
        if not timing or "Lines" not in timing:
            return {}
        
        return timing
        
    except Exception as e:
        logger.error(f"Error getting timing: {e}")
        return {}


@app.get("/api/live/weather")
async def get_live_weather():
    """Get current weather data"""
    try:
        weather = await f1_client.get_weather_data()
        
        if not weather:
            return None
        
        # Return latest weather data
        if isinstance(weather, dict):
            return weather
        elif isinstance(weather, list) and len(weather) > 0:
            return weather[-1]
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting weather: {e}")
        return None


@app.get("/api/live/track-status")
async def get_track_status():
    """Get track status (flags, safety car, etc.)"""
    try:
        status = await f1_client.get_track_status()
        return status if status else {"Status": "1", "Message": "AllClear"}
        
    except Exception as e:
        logger.error(f"Error getting track status: {e}")
        return {"Status": "1", "Message": "AllClear"}


@app.get("/api/live/race-control")
async def get_race_control_messages():
    """Get race control messages"""
    try:
        messages = await f1_client.get_race_control_messages()
        return messages if messages else []
        
    except Exception as e:
        logger.error(f"Error getting race control messages: {e}")
        return []


@app.get("/api/live/timing-app")
async def get_timing_app_data():
    """Get timing app data (tyres, DRS, etc.)"""
    try:
        data = await f1_client.get_timing_app_data()
        return data if data else {}
        
    except Exception as e:
        logger.error(f"Error getting timing app data: {e}")
        return {}


@app.get("/api/live/car-data")
async def get_car_data():
    """Get car telemetry data"""
    try:
        data = await f1_client.get_car_data()
        return data if data else {}
        
    except Exception as e:
        logger.error(f"Error getting car data: {e}")
        return {}


@app.get("/api/live/lap-count")
async def get_lap_count():
    """Get current lap count"""
    try:
        status_data = await f1_client.get_session_status()
        return status_data.get('lap_count', {})
        
    except Exception as e:
        logger.error(f"Error getting lap count: {e}")
        return {}


@app.get("/api/live/team-radio")
async def get_team_radio():
    """Get team radio messages"""
    try:
        radio_data = await f1_client.get_team_radio()
        return radio_data if radio_data else []
        
    except Exception as e:
        logger.error(f"Error getting team radio: {e}")
        return []


@app.get("/api/team-radio/proxy")
async def proxy_team_radio(url: str, request: Request):
    """Stream team radio audio through backend to avoid CORS issues."""
    if not url:
        raise HTTPException(status_code=400, detail="Missing team radio URL")

    if not url.startswith(TEAM_RADIO_BASE_URL):
        raise HTTPException(status_code=400, detail="Invalid team radio source")

    try:
        range_header = request.headers.get("range")
        upstream_headers = {"User-Agent": "ONBOARD-F1-Dashboard/2.0"}
        if range_header:
            upstream_headers["Range"] = range_header

        async with httpx.AsyncClient(timeout=30.0) as client:
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
        
        # Fallback to mock data
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

@app.get("/api/standings/drivers")
async def get_driver_standings():
    """Get driver championship standings"""
    return {
        "message": "Driver standings not available from live timing",
        "note": "Use Ergast API or official F1 website for championship standings"
    }


@app.get("/api/standings/constructors")
async def get_constructor_standings():
    """Get constructor championship standings"""
    return {
        "message": "Constructor standings not available from live timing",
        "note": "Use Ergast API or official F1 website for championship standings"
    }





# ===== SSE (SERVER-SENT EVENTS) ENDPOINT =====
# This is the f1-dash approach - simpler and more reliable than WebSocket for one-way streaming

# Track SSE clients
sse_clients: List[asyncio.Queue] = []

@app.get("/api/sse")
async def sse_endpoint():
    """Server-Sent Events endpoint for real-time F1 data streaming (f1-dash style)"""
    
    async def event_generator():
        # Create a queue for this client
        queue = asyncio.Queue()
        sse_clients.append(queue)
        
        try:
            # Send initial state immediately
            yield {
                "event": "initial",
                "data": JSONResponse(content=live_data_cache).body.decode()
            }
            logger.info("📤 Sent initial SSE snapshot to client")
            
            # Stream updates
            while True:
                try:
                    # Wait for updates from the broadcast
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield message
                except asyncio.TimeoutError:
                    # Send keep-alive ping
                    yield {
                        "event": "ping",
                        "data": ""
                    }
        except asyncio.CancelledError:
            sse_clients.remove(queue)
            logger.info("SSE client disconnected")
            raise
        except Exception as e:
            logger.error(f"SSE error: {e}")
            if queue in sse_clients:
                sse_clients.remove(queue)
            raise
    
    return EventSourceResponse(event_generator())


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
