"""
ONBOARD F1 Dashboard - Backend API
FastAPI server for live timing using Official F1 Live Timing API
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from mock_data import MOCK_DRIVERS, MOCK_TEAMS
from f1_livetiming_client import f1_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
API_VERSION = os.getenv("API_VERSION", "v1")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
F1_LIVETIMING_BASE = "https://livetiming.formula1.com"

# Cache for storing live data
live_data_cache: Dict[str, Any] = {}
active_connections: List[WebSocket] = []


async def update_live_cache():
    """Update live data cache from F1 API"""
    try:
        # Get session info
        session_info = await f1_client.get_session_info()
        if session_info:
            live_data_cache['session'] = session_info
        
        # Get timing data
        timing = await f1_client.get_timing_data()
        if timing:
            live_data_cache['timing'] = timing
        
        # Get positions
        positions = await f1_client.get_position_data()
        if positions:
            live_data_cache['positions'] = positions
        
        # Get weather
        weather = await f1_client.get_weather_data()
        if weather:
            live_data_cache['weather'] = weather
        
        # Get driver list
        drivers = await f1_client.get_driver_list()
        if drivers:
            live_data_cache['drivers'] = drivers
        
        # Get race control messages
        messages = await f1_client.get_race_control_messages()
        if messages:
            live_data_cache['race_control'] = messages
        
        # Get track status
        track_status = await f1_client.get_track_status()
        if track_status:
            live_data_cache['track_status'] = track_status
        
        live_data_cache['last_update'] = datetime.utcnow().isoformat()
        
    except Exception as e:
        logger.error(f"Error updating live cache: {e}")


async def poll_live_data():
    """Background task to poll F1 Live Timing"""
    while True:
        try:
            await update_live_cache()
            
            # Notify WebSocket clients
            if active_connections:
                message = {
                    "type": "update",
                    "data": live_data_cache,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                for connection in active_connections:
                    try:
                        await connection.send_json(message)
                    except:
                        active_connections.remove(connection)
        
        except Exception as e:
            logger.error(f"Error in poll loop: {e}")
        
        await asyncio.sleep(5)  # Update every 5 seconds (data comes via SignalR anyway)


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
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "cache_size": len(live_data_cache),
        "f1_connected": f1_client.connected
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
