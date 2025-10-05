"""
F1 Live Timing Client using Official F1 SignalR API
Based on Fast-F1 implementation
"""

import json
import logging
import time
import asyncio
from typing import Dict, Any, Callable, Optional
from datetime import datetime
import requests
from signalrcore.hub_connection_builder import HubConnectionBuilder
from signalrcore.messages.completion_message import CompletionMessage

logger = logging.getLogger(__name__)

# F1 Live Timing API URLs
F1_SIGNALR_URL = "wss://livetiming.formula1.com/signalrcore"
F1_NEGOTIATE_URL = "https://livetiming.formula1.com/signalrcore/negotiate"


def deep_merge(base: dict, update: dict) -> dict:
    """
    Deep merge update dict into base dict - Based on f1-dash Rust implementation
    F1 API sends incremental updates, not full snapshots!
    
    This properly handles:
    - Nested object merging (recursive)
    - Array extending
    - Indexed array updates (for Lines with driver numbers as keys)
    - Value replacement
    """
    if not isinstance(base, dict):
        base = {}
    if not isinstance(update, dict):
        return update
    
    result = base.copy()
    for key, value in update.items():
        if key in result:
            # Both are dicts - merge recursively
            if isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            # Both are lists - extend
            elif isinstance(result[key], list) and isinstance(value, list):
                result[key].extend(value)
            # Base is list, update is dict with numeric keys (indexed updates)
            elif isinstance(result[key], list) and isinstance(value, dict):
                for idx_key, idx_value in value.items():
                    try:
                        idx = int(idx_key)
                        if idx < len(result[key]):
                            if isinstance(result[key][idx], dict) and isinstance(idx_value, dict):
                                result[key][idx] = deep_merge(result[key][idx], idx_value)
                            else:
                                result[key][idx] = idx_value
                        else:
                            result[key].append(idx_value)
                    except ValueError:
                        # Not a numeric index, treat as dict merge
                        if not isinstance(result[key], dict):
                            result[key] = {}
                        result[key][idx_key] = idx_value
            else:
                # Replace with new value
                result[key] = value
        else:
            # New key - add it
            result[key] = value
    
    return result


class F1LiveTimingClient:
    """Client for F1 Official Live Timing using SignalR Core"""
    
    def __init__(self):
        # Connection
        self._connection = None
        self._is_connected = False
        self.headers = {}
        
        # Data storage
        self.session_info = {}
        self.timing_data = {}
        self.position_data = {}
        self.weather_data = {}
        self.race_control_messages = []
        self.driver_list = {}
        self.track_status = {}
        self.session_data = {}
        self.lap_count = {}
        self.car_data = {}
        self.timing_app_data = {}  # Tyres, DRS, etc.
        self.timing_stats = {}  # Additional timing statistics
        self.team_radio = []  # Team radio messages
        
        # Callbacks
        self.callbacks: Dict[str, list] = {}
        self.connected = False
        
        # Topics to subscribe to
        self.topics = [
            "Heartbeat",
            "AudioStreams",
            "DriverList",
            "ExtrapolatedClock",
            "RaceControlMessages",
            "SessionInfo",
            "SessionStatus",
            "TeamRadio",
            "TimingAppData",
            "TimingStats",
            "TrackStatus",
            "WeatherData",
            "Position.z",
            "CarData.z",
            "ContentStreams",
            "SessionData",
            "TimingData",
            "TopThree",
            "RcmSeries",
            "LapCount"
        ]
        
        self._t_last_message = None
        
    def _on_message(self, msg):
        """Handle incoming SignalR messages"""
        self._t_last_message = time.time()
        
        try:
            # Debug log to see what we're receiving
            logger.debug(f"📨 Received message type: {type(msg)}")
            
            if isinstance(msg, CompletionMessage):
                # Process completion message (initial subscription response)
                logger.info(f"📦 Received completion message with {len(msg.result.keys())} topics")
                for key in msg.result.keys():
                    self._process_data(key, msg.result[key])
                    
            elif isinstance(msg, list) and len(msg) > 0:
                # Process list message (real-time updates)
                logger.debug(f"📡 Received list with {len(msg)} items")
                for item in msg:
                    if isinstance(item, list) and len(item) >= 2:
                        topic = item[0]
                        data = json.loads(item[1]) if isinstance(item[1], str) else item[1]
                        logger.debug(f"🔄 Processing topic: {topic}")
                        self._process_data(topic, data)
            else:
                # Try to process as direct message
                logger.debug(f"📬 Received unknown message format: {str(msg)[:100]}")
                        
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
    
    def _process_data(self, topic: str, data: Any):
        """Process data by topic"""
        try:
            if topic == "SessionInfo":
                self.session_info = data
                self._trigger_callbacks('session', data)
                logger.info(f"📋 Updated SessionInfo")
                
            elif topic == "TimingData":
                # CRITICAL: F1 API sends incremental updates, not full snapshots!
                # Must merge with existing data, not replace
                if self.timing_data:
                    self.timing_data = deep_merge(self.timing_data, data)
                else:
                    self.timing_data = data
                self._trigger_callbacks('timing', data)
                logger.debug(f"⏱️  Updated TimingData - {len(self.timing_data.get('Lines', {}))} drivers")
                
            elif topic == "Position.z":
                if self.position_data:
                    self.position_data = deep_merge(self.position_data, data)
                else:
                    self.position_data = data
                self._trigger_callbacks('position', data)
                logger.debug(f"📍 Updated Position data")
                
            elif topic == "WeatherData":
                self.weather_data = data
                self._trigger_callbacks('weather', data)
                logger.debug(f"🌤️  Updated WeatherData")
                
            elif topic == "DriverList":
                self.driver_list = data
                self._trigger_callbacks('drivers', data)
                logger.info(f"👥 Updated DriverList - {len(data)} drivers")
                
            elif topic == "RaceControlMessages":
                if 'Messages' in data:
                    self.race_control_messages = data['Messages']
                self._trigger_callbacks('race_control', data)
                logger.debug(f"🚩 Updated RaceControl - {len(self.race_control_messages)} messages")
                
            elif topic == "TrackStatus":
                self.track_status = data
                self._trigger_callbacks('track_status', data)
                logger.debug(f"🏁 Updated TrackStatus: {data.get('Status', 'Unknown')}")
                
            elif topic == "SessionData":
                self.session_data = data
                self._trigger_callbacks('session_data', data)
                logger.debug(f"📊 Updated SessionData")
                
            elif topic == "LapCount":
                self.lap_count = data
                self._trigger_callbacks('lap_count', data)
                logger.info(f"🔢 Updated LapCount: {data.get('CurrentLap', '?')}/{data.get('TotalLaps', '?')}")
                
            elif topic == "CarData.z":
                if self.car_data:
                    self.car_data = deep_merge(self.car_data, data)
                else:
                    self.car_data = data
                self._trigger_callbacks('car_data', data)
                logger.debug(f"🏎️  Updated CarData")
                
            elif topic == "TimingAppData":
                if self.timing_app_data:
                    self.timing_app_data = deep_merge(self.timing_app_data, data)
                else:
                    self.timing_app_data = data
                self._trigger_callbacks('timing_app', data)
                logger.debug(f"📱 Updated TimingAppData")
                
            elif topic == "TimingStats":
                self.timing_stats = data
                self._trigger_callbacks('timing_stats', data)
                logger.debug(f"📈 Updated TimingStats")
                
            elif topic == "TeamRadio":
                if 'Captures' in data:
                    self.team_radio = data['Captures']
                self._trigger_callbacks('team_radio', data)
                logger.debug(f"📻 Updated TeamRadio - {len(self.team_radio)} messages")
            
            else:
                logger.debug(f"❓ Unknown topic: {topic}")
            
        except Exception as e:
            logger.error(f"Error processing {topic}: {e}", exc_info=True)
    
    def _trigger_callbacks(self, event_type: str, data: Any):
        """Trigger registered callbacks"""
        if event_type in self.callbacks:
            for callback in self.callbacks[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    logger.error(f"Error in callback for {event_type}: {e}")
    
    def on_event(self, event_type: str, callback: Callable):
        """Register callback for specific event type"""
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        self.callbacks[event_type].append(callback)
    
    def _on_connect(self):
        """Handle connection established"""
        self._is_connected = True
        self.connected = True
        logger.info("✅ Connected to F1 Live Timing SignalR hub")
    
    def _on_close(self):
        """Handle connection closed"""
        self._is_connected = False
        self.connected = False
        logger.info("❌ Disconnected from F1 Live Timing")
    
    def _on_error(self, error):
        """Handle connection error"""
        logger.error(f"SignalR error: {error}")
    
    async def connect(self):
        """Connect to F1 Live Timing service"""
        try:
            logger.info("🔄 Connecting to F1 Live Timing...")
            
            # Pre-negotiate to get AWSALBCORS cookie
            try:
                r = requests.options(F1_NEGOTIATE_URL, headers=self.headers, timeout=10)
                if 'AWSALBCORS' in r.cookies:
                    self.headers.update({
                        "Cookie": f"AWSALBCORS={r.cookies['AWSALBCORS']}"
                    })
                    logger.info("📋 Got AWSALBCORS cookie")
            except Exception as e:
                logger.warning(f"Failed to get AWSALBCORS cookie: {e}")
            
            # Configure connection options
            options = {
                "verify_ssl": True,
                "headers": self.headers
            }
            
            # Build SignalR connection
            self._connection = HubConnectionBuilder() \
                .with_url(F1_SIGNALR_URL, options=options) \
                .configure_logging(logging.WARNING) \
                .with_automatic_reconnect({
                    "type": "interval",
                    "keep_alive_interval": 10,
                    "intervals": [0, 2, 5, 10, 20, 30]
                }) \
                .build()
            
            # Register event handlers
            self._connection.on_open(self._on_connect)
            self._connection.on_close(self._on_close)
            self._connection.on_error(self._on_error)
            self._connection.on('feed', self._on_message)
            
            # Start connection
            self._connection.start()
            
            # Wait for connection
            timeout = 10
            start_time = time.time()
            while not self._is_connected:
                if time.time() - start_time > timeout:
                    logger.error("❌ Connection timeout")
                    return False
                await asyncio.sleep(0.1)
            
            # Subscribe to topics
            logger.info(f"📡 Subscribing to {len(self.topics)} topics...")
            self._connection.send(
                "Subscribe",
                [self.topics],
                on_invocation=self._on_message
            )
            
            logger.info("✅ Successfully subscribed to F1 Live Timing feeds")
            self._t_last_message = time.time()
            return True
                    
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from F1 Live Timing"""
        if self._connection:
            try:
                self._connection.stop()
            except:
                pass
        self.connected = False
        logger.info("🏁 Disconnected from F1 Live Timing")
    
    def is_alive(self):
        """Check if connection is alive and receiving data"""
        if not self.connected:
            return False
        if self._t_last_message is None:
            return False
        # Consider connection dead if no message in last 30 seconds
        return (time.time() - self._t_last_message) < 30
    
    async def reconnect_if_needed(self):
        """Reconnect if connection is dead"""
        if not self.is_alive():
            logger.warning("⚠️ Connection appears dead, reconnecting...")
            self.disconnect()
            await asyncio.sleep(2)
            await self.connect()
    
    # Data accessor methods
    async def get_session_info(self):
        """Get current session information"""
        return self.session_info if self.session_info else {
            "Meeting": {"Name": "No Active Session"},
            "Type": "Unknown",
            "Name": "No Active Session"
        }
    
    async def get_driver_list(self):
        """Get list of drivers in current session"""
        return self.driver_list
    
    async def get_timing_data(self):
        """Get current timing data"""
        return self.timing_data
    
    async def get_position_data(self):
        """Get current position data"""
        return self.position_data
    
    async def get_weather_data(self):
        """Get current weather data"""
        return self.weather_data
    
    async def get_race_control_messages(self):
        """Get race control messages"""
        return self.race_control_messages
    
    async def get_track_status(self):
        """Get track status"""
        return self.track_status
    
    async def get_session_status(self):
        """Get session status and lap count"""
        return {
            "session_data": self.session_data,
            "lap_count": self.lap_count
        }
    
    async def get_timing_app_data(self):
        """Get timing app data (tyres, DRS, etc.)"""
        return self.timing_app_data
    
    async def get_timing_stats(self):
        """Get timing statistics"""
        return self.timing_stats
    
    async def get_car_data(self):
        """Get car telemetry data"""
        return self.car_data
    
    async def get_team_radio(self):
        """Get team radio messages"""
        return self.team_radio


# Global client instance
f1_client = F1LiveTimingClient()
