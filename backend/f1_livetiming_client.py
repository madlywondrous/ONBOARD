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
            if isinstance(msg, CompletionMessage):
                # Process completion message
                for key in msg.result.keys():
                    self._process_data(key, msg.result[key])
                    
            elif isinstance(msg, list) and len(msg) > 0:
                # Process list message
                for item in msg:
                    if isinstance(item, list) and len(item) >= 2:
                        topic = item[0]
                        data = json.loads(item[1]) if isinstance(item[1], str) else item[1]
                        self._process_data(topic, data)
                        
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    def _process_data(self, topic: str, data: Any):
        """Process data by topic"""
        try:
            if topic == "SessionInfo":
                self.session_info = data
                self._trigger_callbacks('session', data)
                
            elif topic == "TimingData":
                self.timing_data = data
                self._trigger_callbacks('timing', data)
                
            elif topic == "Position.z":
                self.position_data = data
                self._trigger_callbacks('position', data)
                
            elif topic == "WeatherData":
                self.weather_data = data
                self._trigger_callbacks('weather', data)
                
            elif topic == "DriverList":
                self.driver_list = data
                self._trigger_callbacks('drivers', data)
                
            elif topic == "RaceControlMessages":
                if 'Messages' in data:
                    self.race_control_messages = data['Messages']
                self._trigger_callbacks('race_control', data)
                
            elif topic == "TrackStatus":
                self.track_status = data
                self._trigger_callbacks('track_status', data)
                
            elif topic == "SessionData":
                self.session_data = data
                self._trigger_callbacks('session_data', data)
                
            elif topic == "LapCount":
                self.lap_count = data
                self._trigger_callbacks('lap_count', data)
                
            elif topic == "CarData.z":
                self.car_data = data
                self._trigger_callbacks('car_data', data)
                
            logger.debug(f"Processed {topic} data")
            
        except Exception as e:
            logger.error(f"Error processing {topic}: {e}")
    
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


# Global client instance
f1_client = F1LiveTimingClient()
