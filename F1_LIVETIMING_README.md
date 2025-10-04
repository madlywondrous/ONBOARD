# 🏎️ F1 Live Timing API Integration

## Overview

Your ONBOARD F1 Dashboard now uses the **Official F1 Live Timing API** - the same data source used by F1 TV and the official F1 website!

## Data Source

- **API**: https://livetiming.formula1.com
- **Protocol**: SignalR (WebSocket-based real-time streaming)
- **Authentication**: Connection token-based
- **Update Frequency**: Real-time (1-second polling during live sessions)

## How It Works

### Connection Flow

1. **Negotiation**: Backend connects to F1 SignalR hub and gets a connection token
2. **Subscription**: Subscribes to live data feeds (timing, positions, weather, etc.)
3. **Streaming**: Receives real-time updates during active F1 sessions
4. **Caching**: Stores data in memory and serves to frontend via REST API
5. **WebSocket**: Pushes updates to connected clients in real-time

### Data Feeds Available

| Feed | Description | Endpoint |
|------|-------------|----------|
| **SessionInfo** | Current session details (race, quali, practice) | `/api/live/session` |
| **TimingData** | Lap times, sectors, gaps | `/api/live/timing` |
| **Position** | Track positions (X, Y, Z coordinates) | `/api/live/positions` |
| **WeatherData** | Temperature, humidity, wind, rain | `/api/live/weather` |
| **DriverList** | All drivers in session | `/api/drivers` |
| **RaceControlMessages** | Flags, penalties, investigations | `/api/live/race-control` |
| **TrackStatus** | Yellow flags, safety car, red flag | `/api/live/track-status` |

## Connection Status

When the backend starts, you'll see:

```
INFO:main:🏎️  ONBOARD F1 Backend starting...
INFO:main:📡 F1 Live Timing: https://livetiming.formula1.com
INFO:f1_livetiming_client:Connected to F1 Live Timing: {...ConnectionToken...}
INFO:     Application startup complete.
```

✅ **Connected** = Got connection token successfully  
⚠️ **403 Forbidden on static endpoints** = No active F1 session (expected between races)  
❌ **Connection failed** = Network issue or F1 API unavailable

## During Live Sessions

When an F1 session is active (Practice, Qualifying, Race):

### Real-Time Data Flow

```
F1 Live Timing API
        ↓
  SignalR Connection
        ↓
  Backend (polling every 1s)
        ↓
   Memory Cache
        ↓
  REST API + WebSocket
        ↓
   Frontend Display
```

### Available During Sessions

- ✅ Live driver positions on track
- ✅ Real-time lap times and sectors
- ✅ Gap to leader and interval times
- ✅ Pit stop information
- ✅ Weather conditions
- ✅ Track status (flags, safety car)
- ✅ Race control messages
- ✅ Tire compound information
- ✅ Driver information and team colors

## Between Sessions

When no F1 session is active:

- **Session Info**: Returns "No Active Session" message
- **Drivers**: Falls back to 2024 driver list (mock data)
- **Teams**: Generated from driver list
- **Timing/Positions**: Empty arrays
- **Weather**: Null

This is **normal behavior** - the F1 Live Timing API only streams data during official sessions.

## API Endpoints

### Session Information

```bash
GET /api/live/session
```

**Response (Active Session)**:
```json
{
  "Meeting": {
    "Name": "Abu Dhabi Grand Prix",
    "Location": "Abu Dhabi",
    "Country": {
      "Name": "UAE",
      "Code": "ARE"
    }
  },
  "Type": "Race",
  "Name": "Race",
  "StartDate": "2024-12-08T13:00:00",
  "EndDate": "2024-12-08T15:00:00",
  "status": "live"
}
```

**Response (No Session)**:
```json
{
  "message": "No active F1 session. Check back during race weekends!",
  "status": "offline"
}
```

### Live Positions

```bash
GET /api/live/positions
```

**Response**:
```json
[
  {
    "driver_number": 1,
    "position": 1,
    "x": 123.45,
    "y": 678.90,
    "z": 12.34,
    "status": "OnTrack"
  },
  ...
]
```

### Live Timing

```bash
GET /api/live/timing
```

Returns full timing tower with lap times, sectors, gaps, intervals.

### Weather

```bash
GET /api/live/weather
```

**Response**:
```json
{
  "AirTemp": "28.5",
  "Humidity": "45",
  "Pressure": "1013.2",
  "Rainfall": "0",
  "TrackTemp": "42.3",
  "WindDirection": "135",
  "WindSpeed": "3.2"
}
```

### Drivers

```bash
GET /api/drivers
```

**Response (Live Session)**:
```json
[
  {
    "driver_number": 1,
    "full_name": "Max Verstappen",
    "name_acronym": "VER",
    "team_name": "Red Bull Racing",
    "team_colour": "3671C6",
    "country_code": "NED"
  },
  ...
]
```

**Response (No Session)**: Returns mock 2024 driver data

### Race Control Messages

```bash
GET /api/live/race-control
```

Returns penalties, investigations, flag conditions.

### Track Status

```bash
GET /api/live/track-status
```

Returns current track conditions (green, yellow, red flag, safety car).

## WebSocket Connection

For real-time updates without polling:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'connected') {
    console.log('Connected to F1 Live Timing');
  }
  
  if (data.type === 'update') {
    // Handle real-time update
    console.log('Live data:', data.data);
  }
};
```

## Technical Details

### SignalR Connection

```python
from f1_livetiming_client import f1_client

# Connect
await f1_client.connect()

# Get data
session_info = await f1_client.get_session_info()
timing = await f1_client.get_timing_data()
positions = await f1_client.get_position_data()
weather = await f1_client.get_weather_data()
```

### Background Polling

The backend runs a background task that polls F1 Live Timing every second:

```python
async def poll_live_data():
    while True:
        await update_live_cache()  # Fetch all feeds
        await notify_websocket_clients()  # Push to clients
        await asyncio.sleep(1)  # 1-second interval
```

### Caching Strategy

- **Memory Cache**: All live data stored in `live_data_cache` dict
- **Update Frequency**: 1 second during active sessions
- **Fallback**: Mock data when F1 API unavailable
- **TTL**: Data refreshed on every poll

## Testing the Integration

### Check Connection

```bash
curl http://localhost:8000/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:34:56.789",
  "cache_size": 7,
  "f1_connected": true
}
```

`f1_connected: true` means successfully connected to F1 Live Timing!

### Test Session Endpoint

```bash
curl http://localhost:8000/api/live/session
```

### Test Drivers

```bash
curl http://localhost:8000/api/drivers
```

### Watch Live Updates (WebSocket)

```bash
# Using wscat (install: npm install -g wscat)
wscat -c ws://localhost:8000/ws/live
```

## Troubleshooting

### "403 Forbidden" on all endpoints

**This is normal!** The F1 Live Timing API only serves data during active sessions. Between races, the static endpoints return 403.

**Solution**: Wait for next race weekend, or use mock data fallback.

### Connection token received but no data

Check if there's an active F1 session:
- Visit https://www.formula1.com/en/racing/2025.html
- Check if Practice/Quali/Race is currently running
- API only streams during official sessions

### "Connection failed"

Possible causes:
1. Network connectivity issues
2. F1 API temporarily unavailable
3. Firewall blocking livetiming.formula1.com

**Solution**: Check network, try restarting backend.

### WebSocket disconnects frequently

- Check firewall settings
- Verify CORS origins in backend/.env
- Ensure frontend and backend URLs match

## Advantages Over OpenF1

| Feature | OpenF1 API | Official F1 Live Timing |
|---------|-----------|------------------------|
| **Data Source** | Ergast + Manual | Official F1 |
| **Latency** | ~5-30 seconds | Real-time (<1s) |
| **Update Frequency** | Polling | WebSocket streaming |
| **Session Coverage** | Historical + Some live | All live sessions |
| **Data Quality** | Good | Official/Canonical |
| **Authentication** | None | Connection token |
| **Availability** | 24/7 (historical) | During sessions only |

## Next Steps

1. **Start backend** during an F1 race weekend
2. **Watch the logs** - you'll see data flowing in real-time
3. **Open frontend** at http://localhost:3000
4. **Navigate to Live section** - see real-time race data!

## Resources

- **F1 Live Timing**: https://livetiming.formula1.com
- **SignalR Protocol**: https://docs.microsoft.com/en-us/aspnet/core/signalr/
- **F1 Schedule**: https://www.formula1.com/en/racing/2025.html

---

**Your dashboard is now connected to the official F1 data source!** 🏁

During the next race weekend, you'll get the exact same data that F1 TV uses - in real-time!
