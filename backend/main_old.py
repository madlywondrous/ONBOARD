"""
ONBOARD F1 Dashboard - Backend API
FastAPI server for live timing, race data, and analytics
Using Official F1 Live Timing API
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import httpx
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
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


app = FastAPI(
    title="ONBOARD F1 Dashboard API",
    description="Backend API for F1 live timing, race data, and analytics",
    version="1.0.0",
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


# HTTP Client
async def get_http_client():
    """Get async HTTP client"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client


# ===== API ENDPOINTS =====

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ONBOARD F1 Dashboard API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "cache_size": len(live_data_cache)
    }


# ===== LIVE TIMING ENDPOINTS =====

@app.get("/api/live/session")
async def get_live_session():
    """Get current/next live session info"""
    try:
        async with httpx.AsyncClient() as client:
            # Try 2025 first, then fall back to 2024
            sessions = None
            for year in [2025, 2024]:
                try:
                    response = await client.get(
                        f"{OPENF1_API_URL}/sessions",
                        params={"year": year}
                    )
                    if response.status_code == 200:
                        sessions = response.json()
                        if sessions:  # If we got data, use it
                            break
                except:
                    continue
            
            if not sessions:
                return {
                    "message": "No live session available. OpenF1 API data not accessible.",
                    "status": "offline"
                }
            
            # Find current or next session
            now = datetime.utcnow()
            for session in sessions:
                session_start = datetime.fromisoformat(session['date_start'].replace('Z', '+00:00'))
                session_end = session_start + timedelta(hours=3)
                
                if session_start <= now <= session_end:
                    session['status'] = 'live'
                    return session
                elif session_start > now:
                    session['status'] = 'upcoming'
                    return session
            
            return {
                "message": "No active or upcoming session. Check back during race weekends!",
                "status": "offline"
            }
            
    except Exception as e:
        return {
            "message": f"Unable to fetch live session data: {str(e)}",
            "status": "error"
        }


@app.get("/api/live/positions")
async def get_live_positions(session_key: Optional[int] = None):
    """Get live driver positions"""
    try:
        if not session_key:
            # Get latest session key
            session = await get_live_session()
            session_key = session.get('session_key')
            
        if not session_key:
            return []
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/position",
                params={"session_key": session_key}
            )
            if response.status_code == 200:
                return response.json()
            return []
            
    except Exception as e:
        return []


@app.get("/api/live/laps")
async def get_live_laps(session_key: Optional[int] = None, driver_number: Optional[int] = None):
    """Get lap times data"""
    try:
        params = {}
        if session_key:
            params['session_key'] = session_key
        if driver_number:
            params['driver_number'] = driver_number
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/laps",
                params=params
            )
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/live/weather")
async def get_live_weather(session_key: int):
    """Get weather data for session"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/weather",
                params={"session_key": session_key}
            )
            response.raise_for_status()
            weather_data = response.json()
            
            # Return latest weather reading
            if weather_data:
                return weather_data[-1]
            return {"message": "No weather data available"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/live/car-data")
async def get_car_data(session_key: int, driver_number: Optional[int] = None):
    """Get car telemetry data"""
    try:
        params = {"session_key": session_key}
        if driver_number:
            params['driver_number'] = driver_number
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/car_data",
                params=params
            )
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== DRIVERS ENDPOINTS =====

@app.get("/api/drivers")
async def get_drivers(session_key: Optional[int] = None):
    """Get all drivers"""
    try:
        params = {}
        if session_key:
            params['session_key'] = session_key
        else:
            # Try to get latest session
            session = await get_live_session()
            if 'session_key' in session:
                params['session_key'] = session['session_key']
                
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/drivers",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    return data
            
            # Fallback to mock data if API fails
            return MOCK_DRIVERS
            
    except Exception as e:
        # Return mock data on any error
        return MOCK_DRIVERS


@app.get("/api/drivers/{driver_number}")
async def get_driver(driver_number: int, session_key: Optional[int] = None):
    """Get specific driver details"""
    try:
        params = {"driver_number": driver_number}
        if session_key:
            params['session_key'] = session_key
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/drivers",
                params=params
            )
            response.raise_for_status()
            drivers = response.json()
            
            if drivers:
                return drivers[0]
            raise HTTPException(status_code=404, detail="Driver not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== TEAM ENDPOINTS =====

@app.get("/api/teams")
async def get_teams():
    """Get all teams (extracted from drivers)"""
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
        raise HTTPException(status_code=500, detail=str(e))


# ===== RACE CONTROL ENDPOINTS =====

@app.get("/api/race-control")
async def get_race_control(session_key: int):
    """Get race control messages (flags, penalties, etc.)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/race_control",
                params={"session_key": session_key}
            )
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== PIT STOPS ENDPOINTS =====

@app.get("/api/pit-stops")
async def get_pit_stops(session_key: int, driver_number: Optional[int] = None):
    """Get pit stop data"""
    try:
        params = {"session_key": session_key}
        if driver_number:
            params['driver_number'] = driver_number
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENF1_API_URL}/pit",
                params=params
            )
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== WEBSOCKET FOR LIVE UPDATES =====

@app.websocket("/ws/live")
async def websocket_live_timing(websocket: WebSocket):
    """WebSocket endpoint for live timing updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Send cached live data
            if live_data_cache:
                await websocket.send_json(live_data_cache)
            await asyncio.sleep(1)  # Update every second
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)


# ===== BACKGROUND TASKS =====

async def update_live_data_loop():
    """Background task to update live data cache"""
    while True:
        try:
            # Get live session
            session = await get_live_session()
            
            if session and session.get('status') == 'live':
                session_key = session.get('session_key')
                
                # Update cache with live data
                live_data_cache['session'] = session
                live_data_cache['timestamp'] = datetime.utcnow().isoformat()
                
                # Get positions
                try:
                    positions = await get_live_positions(session_key)
                    live_data_cache['positions'] = positions
                except:
                    pass
                
                # Get weather
                try:
                    weather = await get_live_weather(session_key)
                    live_data_cache['weather'] = weather
                except:
                    pass
                
                # Broadcast to all connected websocket clients
                for connection in active_connections:
                    try:
                        await connection.send_json(live_data_cache)
                    except:
                        active_connections.remove(connection)
            
        except Exception as e:
            print(f"Error updating live data: {e}")
        
        await asyncio.sleep(5)  # Update every 5 seconds


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
