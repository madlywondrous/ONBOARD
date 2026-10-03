"""
F1 Live Timing Client using Official F1 SignalR API

Refactored for event-driven architecture:
- SignalR callbacks push to asyncio queue (non-blocking)
- Background task processes queue, merges data, triggers callbacks
- Eliminates 50ms polling loop in main.py
"""

import json
import logging
import time
import asyncio
import base64
import zlib
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime
import requests
from signalrcore.hub_connection_builder import HubConnectionBuilder
from signalrcore.messages.completion_message import CompletionMessage
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Heartbeats prove that the socket is open, but they do not mean timing is
# changing. Keep that distinction so callers can identify a paused/finished
# session instead of treating it as a broken live stream.
NON_DATA_TOPICS = {"Heartbeat", "ExtrapolatedClock"}

# F1 Live Timing API URLs
F1_SIGNALR_URL = "wss://livetiming.formula1.com/signalrcore"
F1_NEGOTIATE_URL = "https://livetiming.formula1.com/signalrcore/negotiate"
TEAM_RADIO_BASE_URL = "https://livetiming.formula1.com/static"


@dataclass
class QueuedUpdate:
    """Represents a decoded SignalR update ready for processing."""
    topic: str
    data: Any
    timestamp: float = field(default_factory=time.time)


def deep_merge(base: dict, update: dict) -> dict:
    """
    Deep merge update dict into base dict - Based on f1-dash Rust implementation
    F1 API sends incremental updates, not full snapshots!

    This properly handles:
    - Nested object merging (recursive)
    - Array extending
    - Indexed array updates (for Lines with driver numbers as keys) - CRITICAL!
    - Value replacement

    CRITICAL FIX: Always create new dict references to ensure change detection works

    Based on: https://github.com/Slowlydev/f1-dash/blob/main/crates/data/src/merge.rs
    """
    if not isinstance(base, dict):
        base = {}
    if not isinstance(update, dict):
        return update

    # CRITICAL: Always create a new dict to ensure change detection
    result = {}
    # First copy all base values (deep copy for nested structures)
    for key, value in base.items():
        if isinstance(value, dict):
            result[key] = deep_merge({}, value)  # Deep copy nested dicts
        elif isinstance(value, list):
            result[key] = value.copy()  # Shallow copy lists (items are usually primitives or dicts)
        else:
            result[key] = value

    # Then merge in updates
    for key, value in update.items():
        if key in result:
            # Both are dicts - merge recursively
            if isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            # Both are lists - extend (f1-dash behavior)
            elif isinstance(result[key], list) and isinstance(value, list):
                result[key] = result[key].copy()  # Create new list reference
                result[key].extend(value)
            # CRITICAL: Base is list, update is dict with numeric keys (indexed updates)
            # This is how F1 API sends updates for driver data!
            # Example: {"Lines": {"1": {"LastLap": "1:23"}}} updates driver at index 1
            elif isinstance(result[key], list) and isinstance(value, dict):
                result[key] = result[key].copy()  # Create new list reference
                for idx_key, idx_value in value.items():
                    try:
                        idx = int(idx_key)
                        if idx < len(result[key]):
                            # Merge into existing item (recursive!)
                            if isinstance(result[key][idx], dict) and isinstance(idx_value, dict):
                                result[key][idx] = deep_merge(result[key][idx], idx_value)
                            else:
                                result[key][idx] = idx_value
                        else:
                            # Append new item if index doesn't exist
                            result[key].append(idx_value)
                    except ValueError:
                        # Not a numeric index - this shouldn't happen with F1 API
                        # but handle gracefully
                        logger.warning(f"Non-numeric index in array update: {idx_key}")
                        continue
            else:
                # Replace with new value
                result[key] = value
        else:
            # New key - add it (deep copy if needed)
            if isinstance(value, dict):
                result[key] = deep_merge({}, value)
            elif isinstance(value, list):
                result[key] = value.copy()
            else:
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
        self.session_status = {}
        self.lap_count = {}
        self.car_data = {}
        self.timing_app_data = {}  # Tyres, DRS, etc.
        self.timing_stats = {}  # Additional timing statistics
        self.team_radio = []  # Team radio messages
        self.audio_streams = {}
        self.content_streams = {}

        # Callbacks - now triggered from background task, not SignalR thread
        self.callbacks: Dict[str, List[Callable]] = {}
        self.connected = False

        # CRITICAL: Track when data was last updated to force cache refreshes
        self._last_update_time = {}

        # Topics to subscribe to
        # Based on f1-dash: 20 topics including PitLaneTimeCollection
        # https://github.com/Slowlydev/f1-dash/blob/main/crates/client/src/consts.rs
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
            "LapCount",
            "PitLaneTimeCollection"  # Added from f1-dash
        ]

        self._t_last_message = None
        self._t_last_data_update = None
        self._t_last_timing_update = None
        self._connected_at = None

        # SignalR invokes handlers on its own thread.  An asyncio.Queue is not
        # thread-safe, so only touch these values from the FastAPI event loop.
        # Keeping just the newest pending patch per topic also prevents a burst
        # of telemetry from turning into minutes of stale work.
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._pending_updates: Dict[str, QueuedUpdate] = {}
        self._updates_ready: Optional[asyncio.Event] = None
        self._processor_task: Optional[asyncio.Task] = None
        self._running = False
        self._session_name: Optional[str] = None  # Track session for transition detection

    def _decode_payload(self, topic: str, payload: Any) -> Any:
        """Decode SignalR payload based on topic type."""
        if payload is None:
            return None

        try:
            # Handle zipped payloads (topics ending with .z)
            if topic.endswith('.z'):
                # Some zipped payloads come as dict with Data/Raw, others as bare base64 strings
                if isinstance(payload, dict):
                    payload_data = payload.get('Data') or payload.get('Raw')
                    if payload_data is None:
                        return payload
                else:
                    payload_data = payload

                if isinstance(payload_data, str):
                    try:
                        decoded = base64.b64decode(payload_data)
                        try:
                            decompressed = zlib.decompress(decoded)
                        except zlib.error:
                            try:
                                # Some feeds use gzip headers.
                                decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
                            except zlib.error:
                                # F1's live feed commonly uses raw DEFLATE.
                                decompressed = zlib.decompress(decoded, -zlib.MAX_WBITS)
                        json_payload = decompressed.decode('utf-8')
                        return json.loads(json_payload)
                    except Exception as exc:
                        logger.warning(f"Failed to decode zipped payload for {topic}: {exc}")
                        return payload
                return payload

            # Non-zipped payload: try to parse JSON strings
            if isinstance(payload, str):
                try:
                    return json.loads(payload)
                except json.JSONDecodeError:
                    return payload

            return payload

        except Exception as exc:
            logger.error(f"Error decoding payload for {topic}: {exc}", exc_info=True)
            return payload

    def _on_message(self, msg):
        """Receive SignalR data on its worker thread and hand it to asyncio safely."""
        self._t_last_message = time.time()

        try:
            if isinstance(msg, CompletionMessage):
                # Initial subscription snapshot.
                if isinstance(msg.result, dict):
                    for key, value in msg.result.items():
                        self._schedule_update(key, value)

            elif isinstance(msg, list) and len(msg) > 0:
                # Live updates
                for item in msg:
                    if isinstance(item, list) and len(item) >= 2:
                        self._schedule_update(str(item[0]), item[1])

        except Exception as e:
            logger.error(f"Error queueing message: {e}", exc_info=True)

    def _schedule_update(self, topic: str, payload: Any) -> None:
        """Schedule work onto the owning asyncio loop without blocking SignalR."""
        loop = self._event_loop
        if loop is None or loop.is_closed() or not self._running:
            return
        loop.call_soon_threadsafe(self._enqueue_update, topic, payload)

    def _enqueue_update(self, topic: str, payload: Any) -> None:
        """Coalesce compatible patches; called exclusively on the asyncio loop."""
        pending = self._pending_updates.get(topic)
        if pending and isinstance(pending.data, dict) and isinstance(payload, dict):
            payload = deep_merge(pending.data, payload)
        self._pending_updates[topic] = QueuedUpdate(topic=topic, data=payload)
        if self._updates_ready is not None:
            self._updates_ready.set()

    async def _process_updates(self):
        """Background task: process queued updates, merge data, trigger callbacks."""
        logger.info("[i] Update processor started")
        while self._running:
            try:
                if self._updates_ready is None:
                    return
                await asyncio.wait_for(self._updates_ready.wait(), timeout=1.0)
                self._updates_ready.clear()
                pending = self._pending_updates
                self._pending_updates = {}
                for update in pending.values():
                    # Decompression can be expensive for telemetry packets. Do
                    # it away from the event loop so SSE clients keep receiving
                    # their already-processed updates and pings.
                    loop = asyncio.get_running_loop()
                    data = await loop.run_in_executor(
                        None, self._decode_payload, update.topic, update.data
                    )
                    self._process_data(update.topic, data)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in update processor: {e}", exc_info=True)
        logger.info("[i] Update processor stopped")

    def _process_data(self, topic: str, data: Any):
        """Process data by topic - runs in background task, NOT SignalR thread."""
        try:
            # CRITICAL: Track update time for each topic to force cache refreshes
            self._last_update_time[topic] = time.time()
            if topic not in NON_DATA_TOPICS:
                self._t_last_data_update = self._last_update_time[topic]
            if topic == "TimingData":
                self._t_last_timing_update = self._last_update_time[topic]

            # Session transition detection
            if topic == "SessionInfo" and isinstance(data, dict):
                new_session_name = data.get("Name") or data.get("Meeting", {}).get("Name")
                if new_session_name and new_session_name != self._session_name:
                    if self._session_name is not None:
                        logger.warning(f"[i] Session transition detected: {self._session_name} -> {new_session_name}")
                        # Trigger session reset callback
                        self._trigger_callbacks('session_reset', {
                            'old_session': self._session_name,
                            'new_session': new_session_name
                        })
                        # Clear all data stores
                        self._clear_all_data()
                    self._session_name = new_session_name

            if topic == "SessionInfo":
                self.session_info = deep_merge(self.session_info, data) if self.session_info else (data or {})
                self._trigger_callbacks('session', data)
                logger.info(f"[i] Updated SessionInfo")

            elif topic == "TimingData":
                # CRITICAL: F1 API sends incremental updates, not full snapshots!
                # Must merge with existing data, not replace
                if self.timing_data:
                    self.timing_data = deep_merge(self.timing_data, data)
                else:
                    self.timing_data = data
                self._trigger_callbacks('timing', data)
                logger.debug(f"[i][i] Updated TimingData - {len(self.timing_data.get('Lines', {}))} drivers")

            elif topic == "Position.z":
                if self.position_data:
                    self.position_data = deep_merge(self.position_data, data)
                else:
                    self.position_data = data
                self._trigger_callbacks('position', data)
                logger.debug(f"[i] Updated Position data")

            elif topic == "WeatherData":
                self.weather_data = deep_merge(self.weather_data, data) if self.weather_data else (data or {})
                self._trigger_callbacks('weather', data)
                logger.debug(f"[i][i] Updated WeatherData")

            elif topic == "DriverList":
                self.driver_list = deep_merge(self.driver_list, data) if self.driver_list else (data or {})
                self._trigger_callbacks('drivers', data)
                logger.info(f"[i] Updated DriverList - {len(data)} drivers")

            elif topic == "RaceControlMessages":
                if isinstance(data, dict) and 'Messages' in data:
                    self.race_control_messages = data['Messages']
                self._trigger_callbacks('race_control', data)
                logger.debug(f"[i] Updated RaceControl - {len(self.race_control_messages)} messages")

            elif topic == "TrackStatus":
                self.track_status = deep_merge(self.track_status, data) if self.track_status else (data or {})
                self._trigger_callbacks('track_status', data)
                logger.debug(f"[i] Updated TrackStatus: {data.get('Status', 'Unknown')}")

            elif topic == "SessionData":
                self.session_data = deep_merge(self.session_data, data) if self.session_data else (data or {})
                self._trigger_callbacks('session_data', data)
                logger.debug(f"[i] Updated SessionData")

            elif topic == "SessionStatus":
                self.session_status = deep_merge(self.session_status, data) if self.session_status else (data or {})
                self._trigger_callbacks('session_status', data)

            elif topic == "AudioStreams":
                self.audio_streams = data or {}
                self._trigger_callbacks('audio_streams', self.audio_streams)
                if isinstance(self.audio_streams, dict):
                    logger.debug(f"[i] Updated AudioStreams: {list(self.audio_streams.keys())}")
                else:
                    logger.debug("[i] Updated AudioStreams")

            elif topic == "ContentStreams":
                self.content_streams = data or {}
                self._trigger_callbacks('content_streams', self.content_streams)
                logger.debug("[i] Updated ContentStreams payload")

            elif topic == "LapCount":
                self.lap_count = deep_merge(self.lap_count, data) if self.lap_count else (data or {})
                self._trigger_callbacks('lap_count', data)
                # Only log significant lap changes
                if data and data.get('CurrentLap'):
                    logger.debug(f"[i] Lap {data.get('CurrentLap', '?')}/{data.get('TotalLaps', '?')}")

            elif topic == "CarData.z":
                if self.car_data:
                    self.car_data = deep_merge(self.car_data, data)
                else:
                    self.car_data = data
                self._trigger_callbacks('car_data', data)
                # Removed logging - too frequent

            elif topic == "TimingAppData":
                if self.timing_app_data:
                    self.timing_app_data = deep_merge(self.timing_app_data, data)
                else:
                    self.timing_app_data = data
                self._trigger_callbacks('timing_app', data)
                # Removed logging - too frequent

            elif topic == "TimingStats":
                self.timing_stats = deep_merge(self.timing_stats, data) if self.timing_stats else (data or {})
                self._trigger_callbacks('timing_stats', data)
                # Removed logging - too frequent

            elif topic == "TeamRadio":
                captures = []
                if isinstance(data, dict):
                    captures = data.get('Captures') or []
                elif isinstance(data, list):
                    captures = data

                if captures:
                    def normalize_capture(entry: Dict[str, Any]) -> Dict[str, Any]:
                        capture_copy = entry.copy()
                        raw_path = capture_copy.get('Path') or capture_copy.get('Url')
                        try:
                            logger.debug(f"[i][i] TeamRadio capture keys: {list(capture_copy.keys())}")
                        except Exception:
                            pass
                        if raw_path:
                            path_str = str(raw_path)
                            if not path_str.lower().startswith('http'):
                                normalized_path = path_str.lstrip('/')
                                if not normalized_path.lower().startswith('teamradio'):
                                    normalized_path = f"TeamRadio/{normalized_path}"
                                full_path = f"{TEAM_RADIO_BASE_URL}/{normalized_path}"
                                capture_copy['Path'] = full_path
                                capture_copy['Url'] = full_path
                            else:
                                capture_copy['Path'] = path_str
                                capture_copy['Url'] = path_str
                        return capture_copy

                    normalized_existing: list[Dict[str, Any]] = []
                    existing_paths: set[str] = set()
                    for existing in self.team_radio:
                        if not isinstance(existing, dict):
                            continue
                        normalized_existing_entry = normalize_capture(existing)
                        normalized_existing.append(normalized_existing_entry)
                        path_key = normalized_existing_entry.get('Path')
                        if path_key:
                            existing_paths.add(path_key)

                    normalized_new: list[Dict[str, Any]] = []
                    for capture in captures:
                        if not isinstance(capture, dict):
                            continue
                        logger.debug(f"[i][i] TeamRadio raw capture: {capture}")
                        normalized_new.append(normalize_capture(capture))

                    merged: list[Dict[str, Any]] = normalized_existing
                    for capture in normalized_new:
                        path_key = capture.get('Path')
                        if path_key and path_key in existing_paths:
                            continue
                        merged.append(capture)
                        if path_key:
                            existing_paths.add(path_key)

                    # Keep the most recent 100 entries to limit memory usage
                    self.team_radio = merged[-100:]
                self._trigger_callbacks('team_radio', self.team_radio)
                logger.debug(f"[i] Updated TeamRadio - {len(self.team_radio)} messages")

            else:
                logger.debug(f"[i] Unknown topic: {topic}")

        except Exception as e:
            logger.error(f"Error processing {topic}: {e}", exc_info=True)

    def _clear_all_data(self):
        """Clear all data stores on session transition."""
        self.timing_data = {}
        self.position_data = {}
        self.weather_data = {}
        self.race_control_messages = []
        self.driver_list = {}
        self.track_status = {}
        self.session_data = {}
        self.session_status = {}
        self.lap_count = {}
        self.car_data = {}
        self.timing_app_data = {}
        self.timing_stats = {}
        self.team_radio = []
        self.audio_streams = {}
        self.content_streams = {}
        logger.info("[i] All data stores cleared for new session")

    def _trigger_callbacks(self, event_type: str, data: Any):
        """Trigger registered callbacks - runs in background task."""
        if event_type in self.callbacks:
            for callback in self.callbacks[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    logger.error(f"Error in callback for {event_type}: {e}")

    def on_event(self, event_type: str, callback: Callable):
        """Register callback for specific event type."""
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        self.callbacks[event_type].append(callback)

    def _on_connect(self):
        """Handle connection established."""
        self._is_connected = True
        self.connected = True
        self._connected_at = time.time()
        logger.info("[i] Connected to F1 Live Timing SignalR hub")

    def _on_close(self):
        """Handle connection closed."""
        self._is_connected = False
        self.connected = False
        logger.info("[i] Disconnected from F1 Live Timing")

    def _on_error(self, error):
        """Handle connection error."""
        logger.error(f"SignalR error: {error}")

    async def connect(self):
        """Connect to F1 Live Timing service."""
        try:
            logger.info("[i] Connecting to F1 Live Timing...")
            self._event_loop = asyncio.get_running_loop()
            self._updates_ready = asyncio.Event()
            self._pending_updates = {}
            self._running = True

            # Pre-negotiate to get AWSALBCORS cookie
            try:
                loop = asyncio.get_running_loop()
                r = await loop.run_in_executor(
                    None,
                    lambda: requests.options(F1_NEGOTIATE_URL, headers=self.headers, timeout=10),
                )
                if 'AWSALBCORS' in r.cookies:
                    self.headers.update({
                        "Cookie": f"AWSALBCORS={r.cookies['AWSALBCORS']}"
                    })
                    logger.info("[i] Got AWSALBCORS cookie")
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
                .configure_logging(logging.CRITICAL) \
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
                    logger.error("[i] Connection timeout")
                    self.disconnect()
                    return False
                await asyncio.sleep(0.1)

            # Start the event-loop-owned processor before subscribing.  The
            # SignalR client may deliver the initial completion immediately.
            self._processor_task = asyncio.create_task(self._process_updates())

            # Subscribe to topics
            logger.info(f"[i] Subscribing to {len(self.topics)} topics...")
            self._connection.send(
                "Subscribe",
                [self.topics],
                on_invocation=self._on_message
            )

            logger.info("[i] Successfully subscribed to F1 Live Timing feeds")
            self._t_last_message = time.time()
            return True

        except Exception as e:
            logger.error(f"[i] Connection error: {e}")
            self.disconnect()
            return False

    def disconnect(self):
        """Disconnect from F1 Live Timing."""
        self._running = False
        self._pending_updates = {}
        if self._updates_ready is not None:
            self._updates_ready.set()
        if self._processor_task:
            self._processor_task.cancel()
            self._processor_task = None
        if self._connection:
            try:
                self._connection.stop()
            except:
                pass
        self.connected = False
        self._is_connected = False
        self._connection = None
        logger.info("[i] Disconnected from F1 Live Timing")

    def is_alive(self):
        """
        Check if connection is alive and receiving data
        Based on f1-dash: 30-second timeout is optimal for F1 Live Timing
        """
        if not self.connected:
            return False
        if self._t_last_message is None:
            return False
        # 30-second timeout from f1-dash (proven in production)
        # SignalR heartbeat is ~10s, so 30s catches real disconnects quickly
        # without false positives during brief network hiccups
        return (time.time() - self._t_last_message) < 30

    def needs_resubscribe(self, max_data_silence: float = 45.0) -> bool:
        """Detect a live socket that is no longer delivering F1 state changes.

        SignalR heartbeats are expected even after a stale subscription.  They
        must not keep an old timing snapshot alive indefinitely.
        """
        if not self.connected:
            return False
        last_data_time = self._t_last_data_update or self._connected_at
        return bool(last_data_time and (time.time() - last_data_time) > max_data_silence)

    def reset_live_state(self, reason: str) -> None:
        """Discard a stale upstream snapshot before obtaining a fresh one."""
        self._clear_all_data()
        self.session_info = {}
        self._session_name = None
        self._t_last_data_update = None
        self._t_last_timing_update = None
        self._trigger_callbacks('session_reset', {'reason': reason})

    async def start_managed_connection(self):
        """
        Start managed connection with automatic reconnection.
        Based on f1-dash manager pattern:
        - 30-second timeout for detecting stale connections
        - Automatic reconnection on failures
        - Continuous monitoring loop
        """
        reconnect_delay = 3  # seconds between reconnection attempts

        logger.info("[i] Starting F1 Live Timing connection manager...")

        while True:
            try:
                logger.info("[i] Attempting to connect to F1 Live Timing...")

                # Attempt to connect
                connected = await self.connect()

                if not connected:
                    logger.error(f"[i] Connection failed, retrying in {reconnect_delay}s...")
                    await asyncio.sleep(reconnect_delay)
                    continue

                logger.info("[i] Connected! Starting health monitoring...")

                # Monitor connection health
                last_log_time = time.time()
                while self.connected:
                    await asyncio.sleep(5)  # Check every 5 seconds

                    # Log health status every 30 seconds
                    if time.time() - last_log_time > 30:
                        if self._t_last_message:
                            age = time.time() - self._t_last_message
                            logger.info(f"[i] Connection healthy - last message {age:.1f}s ago")
                        last_log_time = time.time()

                    if not self.is_alive():
                        logger.warning("[i] Connection appears stale (no messages for 30s), reconnecting...")
                        self.disconnect()
                        break

                    if self.needs_resubscribe():
                        logger.warning("[i] No F1 data update for 45s; refreshing the SignalR subscription...")
                        self.reset_live_state('upstream_data_stale')
                        self.disconnect()
                        break

                # Connection lost or stale - reconnect
                logger.info(f"[i] Connection lost, reconnecting in {reconnect_delay}s...")
                await asyncio.sleep(reconnect_delay)

            except Exception as e:
                logger.error(f"[i] Error in connection manager: {e}", exc_info=True)
                self.disconnect()
                await asyncio.sleep(reconnect_delay)

    async def reconnect_if_needed(self, force: bool = False):
        """Reconnect to get fresh data."""
        if force or not self.is_alive():
            self.disconnect()
            await asyncio.sleep(1)
            await self.connect()

    # Data accessor methods
    async def get_session_info(self):
        """Get current session information."""
        return self.session_info if self.session_info else {
            "Meeting": {"Name": "No Active Session"},
            "Type": "Unknown",
            "Name": "No Active Session"
        }

    async def get_driver_list(self):
        """Get list of drivers in current session."""
        return self.driver_list

    async def get_timing_data(self):
        """Get current timing data."""
        return self.timing_data

    async def get_position_data(self):
        """Get current position data."""
        return self.position_data

    async def get_weather_data(self):
        """Get current weather data."""
        return self.weather_data

    async def get_race_control_messages(self):
        """Get race control messages."""
        return self.race_control_messages

    async def get_track_status(self):
        """Get track status."""
        return self.track_status

    async def get_session_status(self):
        """Get session status and lap count."""
        return {
            "session_data": self.session_data,
            "lap_count": self.lap_count
        }

    async def get_timing_app_data(self):
        """Get timing app data (tyres, DRS, etc.)."""
        return self.timing_app_data

    async def get_timing_stats(self):
        """Get timing statistics."""
        return self.timing_stats

    async def get_car_data(self):
        """Get car telemetry data."""
        return self.car_data

    async def get_team_radio(self):
        """Get team radio messages."""
        return self.team_radio

    async def get_audio_streams(self):
        """Get audio stream metadata."""
        return self.audio_streams

    async def get_content_streams(self):
        """Get content stream metadata."""
        return self.content_streams


# Global client instance
f1_client = F1LiveTimingClient()
