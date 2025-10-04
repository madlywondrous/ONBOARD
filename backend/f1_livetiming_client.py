"""
F1 Live Timing Client using Official F1 SignalR API
Connects to the official F1 Live Timing service
"""

import json
import asyncio
import httpx
from typing import Dict, Any, Callable, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# F1 Live Timing API URLs
F1_LIVETIMING_BASE = "https://livetiming.formula1.com"
F1_SIGNALR_HUB = f"{F1_LIVETIMING_BASE}/signalr"

class F1LiveTimingClient:
    """Client for F1 Official Live Timing using SignalR"""
    
    def __init__(self):
        self.hub_connection = None
        self.session_data = {}
        self.timing_data = {}
        self.position_data = {}
        self.weather_data = {}
        self.race_control_messages = []
        self.driver_list = {}
        self.callbacks: Dict[str, list] = {}
        self.connected = False
        
    async def connect(self):
        """Connect to F1 Live Timing service"""
        try:
            # Get negotiation token
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{F1_SIGNALR_HUB}/negotiate",
                    params={"connectionData": json.dumps([{"name": "Streaming"}])},
                    headers={"User-Agent": "ONBOARD-F1-Dashboard/1.0"}
                )
                
                if response.status_code == 200:
                    nego_data = response.json()
                    logger.info(f"Connected to F1 Live Timing: {nego_data}")
                    self.connected = True
                    return True
                else:
                    logger.error(f"Failed to connect: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
    
    async def subscribe_to_feed(self, feed_name: str):
        """Subscribe to a specific data feed"""
        feeds = [
            "Heartbeat",
            "CarData.z",
            "Position.z", 
            "ExtrapolatedClock",
            "TopThree",
            "RcmSeries",
            "TimingStats",
            "TimingAppData",
            "WeatherData",
            "TrackStatus",
            "DriverList",
            "RaceControlMessages",
            "SessionInfo",
            "SessionData",
            "LapCount",
            "TimingData"
        ]
        
        logger.info(f"Subscribing to feed: {feed_name}")
        # Implementation would use SignalR hub methods here
        
    def on_timing_update(self, callback: Callable):
        """Register callback for timing updates"""
        if 'timing' not in self.callbacks:
            self.callbacks['timing'] = []
        self.callbacks['timing'].append(callback)
    
    def on_position_update(self, callback: Callable):
        """Register callback for position updates"""
        if 'position' not in self.callbacks:
            self.callbacks['position'] = []
        self.callbacks['position'].append(callback)
    
    def on_weather_update(self, callback: Callable):
        """Register callback for weather updates"""
        if 'weather' not in self.callbacks:
            self.callbacks['weather'] = []
        self.callbacks['weather'].append(callback)
    
    async def get_static_data(self, path: str):
        """Get static data files from F1 timing"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{F1_LIVETIMING_BASE}/static/{path}",
                    headers={"User-Agent": "ONBOARD-F1-Dashboard/1.0"}
                )
                
                if response.status_code == 200:
                    return response.json()
                return None
                
        except Exception as e:
            logger.error(f"Error fetching static data: {e}")
            return None
    
    async def get_session_info(self):
        """Get current session information"""
        try:
            # Try to get session info from static endpoint
            session_info = await self.get_static_data("SessionInfo.json")
            if session_info:
                return session_info
            
            # Fallback to stored session data
            return self.session_data if self.session_data else {
                "Meeting": {"Name": "No Active Session"},
                "Type": "Unknown",
                "Name": "No Active Session"
            }
            
        except Exception as e:
            logger.error(f"Error getting session info: {e}")
            return None
    
    async def get_driver_list(self):
        """Get list of drivers in current session"""
        try:
            drivers = await self.get_static_data("DriverList.json")
            if drivers:
                self.driver_list = drivers
                return drivers
            return self.driver_list
            
        except Exception as e:
            logger.error(f"Error getting driver list: {e}")
            return {}
    
    async def get_timing_data(self):
        """Get current timing data"""
        try:
            timing = await self.get_static_data("TimingData.json")
            if timing:
                self.timing_data = timing
                return timing
            return self.timing_data
            
        except Exception as e:
            logger.error(f"Error getting timing data: {e}")
            return {}
    
    async def get_position_data(self):
        """Get current position data"""
        try:
            positions = await self.get_static_data("Position.z.json")
            if positions:
                self.position_data = positions
                return positions
            return self.position_data
            
        except Exception as e:
            logger.error(f"Error getting position data: {e}")
            return {}
    
    async def get_weather_data(self):
        """Get current weather data"""
        try:
            weather = await self.get_static_data("WeatherData.json")
            if weather:
                self.weather_data = weather
                return weather
            return self.weather_data
            
        except Exception as e:
            logger.error(f"Error getting weather data: {e}")
            return {}
    
    async def get_race_control_messages(self):
        """Get race control messages"""
        try:
            messages = await self.get_static_data("RaceControlMessages.json")
            if messages:
                self.race_control_messages = messages.get("Messages", [])
                return self.race_control_messages
            return self.race_control_messages
            
        except Exception as e:
            logger.error(f"Error getting race control messages: {e}")
            return []
    
    async def get_track_status(self):
        """Get track status (flags, safety car, etc.)"""
        try:
            status = await self.get_static_data("TrackStatus.json")
            return status
            
        except Exception as e:
            logger.error(f"Error getting track status: {e}")
            return None
    
    async def get_session_status(self):
        """Get session status and lap count"""
        try:
            session_data = await self.get_static_data("SessionData.json")
            lap_count = await self.get_static_data("LapCount.json")
            
            return {
                "session_data": session_data,
                "lap_count": lap_count
            }
            
        except Exception as e:
            logger.error(f"Error getting session status: {e}")
            return None
    
    def disconnect(self):
        """Disconnect from F1 Live Timing"""
        self.connected = False
        logger.info("Disconnected from F1 Live Timing")


# Global client instance
f1_client = F1LiveTimingClient()
