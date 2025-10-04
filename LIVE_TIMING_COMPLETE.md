# F1 Live Timing System - Complete Implementation

## 🏎️ Overview

A professional F1 Live Timing dashboard with real-time data streaming, session recording, and replay capabilities using the official F1 SignalR API.

## ✅ Completed Features

### 1. Official F1 SignalR Integration
- ✅ Connected to `wss://livetiming.formula1.com/signalrcore`
- ✅ AWSALBCORS cookie authentication
- ✅ Subscribed to 20 F1 data topics:
  - Heartbeat, AudioStreams, DriverList
  - ExtrapolatedClock, RaceControlMessages
  - SessionInfo, SessionStatus, SessionData
  - TeamRadio, TimingAppData, TimingStats
  - TrackStatus, WeatherData, LapCount
  - Position.z, CarData.z
  - TimingData, TopThree, RcmSeries
  - ContentStreams

### 2. Session Recording System
- ✅ Automatic recording of live sessions
- ✅ JSONL format for efficient streaming writes
- ✅ Session metadata storage (meeting, type, timestamps)
- ✅ Frame-by-frame data capture
- ✅ Recording management API endpoints
- ✅ Replay capabilities

**Recording Status:** ACTIVE
- Session: Singapore Grand Prix Qualifying
- Started: 2025-10-04 19:50:14
- Frames Captured: Growing every second
- Storage: `/backend/recordings/`

### 3. Professional Live Timing UI
- ✅ Timing tower with all 20 drivers
- ✅ Sector times (S1, S2, S3) with color coding
- ✅ Mini sectors visualization (8 segments per sector)
- ✅ Lap times and gaps
- ✅ Team colors on driver cards
- ✅ PIT status indicators
- ✅ Live/Replay toggle
- ✅ Recording selection dropdown
- ✅ 1-second update frequency

**Color Coding (F1 Official Standards):**
- 🟢 **Green**: Personal best sector/segment
- 🟡 **Yellow**: Overall session best
- 🟣 **Purple**: Overall fastest
- ⚪ **White**: Normal time
- 🟡 **Yellow Badge**: Driver in PIT

### 4. Rich Data Display
- ✅ Position, Driver Number, Driver Acronym
- ✅ 3 Sectors with timing
- ✅ 8 mini-segments per sector showing performance
- ✅ Best lap time
- ✅ Last lap time
- ✅ Gap to leader
- ✅ Gap to car ahead
- ✅ Speed traps (I1, I2, ST)
- ✅ PIT status
- ✅ Retired/Stopped status

## 📁 File Structure

```
backend/
├── f1_livetiming_client.py    # SignalR client for F1 API
├── session_recorder.py         # Recording system
├── main.py                     # FastAPI server with all endpoints
├── mock_data.py                # Fallback data
└── recordings/                 # Session recordings directory
    └── {session_id}/
        ├── metadata.json       # Session info
        └── data.jsonl          # Frame-by-frame data

components/dashboard/
├── live-section.tsx            # Wrapper component
├── live-timing-pro.tsx         # Professional timing tower UI
├── drivers-section.tsx         # Compact drivers display
└── teams-section.tsx           # Team cards with rosters
```

## 🔌 API Endpoints

### Live Data
- `GET /api/live/session` - Current session info
- `GET /api/live/timing` - Timing data (sectors, laps, etc.)
- `GET /api/live/positions` - Driver positions (track map data)
- `GET /api/live/weather` - Weather conditions
- `GET /api/live/track-status` - Track status/flags
- `GET /api/live/race-control` - Race control messages

### Recording Management
- `GET /api/recordings` - List all recordings
- `GET /api/recordings/{session_id}` - Get recording metadata
- `GET /api/recordings/{session_id}/frames` - Get frames for replay
- `GET /api/recordings/latest` - Get most recent recording
- `GET /api/recording/status` - Current recording status
- `POST /api/recording/start` - Start recording
- `POST /api/recording/stop` - Stop recording

### Static Data
- `GET /api/drivers` - All drivers (20 F1 drivers)
- `GET /api/drivers/{number}` - Specific driver
- `GET /api/teams` - All teams (10 F1 teams)
- `GET /health` - Health check with F1 connection status

### WebSocket
- `WS /ws/live` - Real-time push updates

## 🎨 UI Features

### Professional Timing Tower
```
┌─────────────────────────────────────────────────────────┐
│ POS │ NO │ DRIVER │ SECTOR 1 │ SECTOR 2 │ SECTOR 3 │... │
├─────────────────────────────────────────────────────────┤
│  1  │ 🟦4 │  LAN   │ 34.791   │ 46.776   │  ---     │... │
│     │    │        │ ████████ │ ████████ │          │... │
├─────────────────────────────────────────────────────────┤
│  2  │ 🔴1 │  VER   │ 36.747   │ 45.359   │  ---     │... │
│     │    │ [PIT]  │ ████████ │ ████████ │          │... │
└─────────────────────────────────────────────────────────┘
```

### Features:
1. **Live Indicator**: Animated red "LIVE" badge when session is active
2. **Team Colors**: Left border and driver number background in team color
3. **Sector Display**: 
   - Large sector time with color coding
   - 8 mini-segments showing micro-sector performance
4. **Lap Times**: Best lap + Gap to leader
5. **Status Badges**: PIT, OUT, etc.
6. **Playback Controls**: Live/Replay toggle, recording selector

## 🚀 How to Use

### Start Backend
```bash
cd backend
conda activate onboard-f1
python main.py
```

### Start Frontend
```bash
cd ..
pnpm dev
```

### Navigate
Open http://localhost:3000 and go to the "Live" section

### Recording
- **Auto-start**: Recording starts automatically when a live session is detected
- **Manual control**: Use `/api/recording/start` and `/api/recording/stop`
- **Replay**: Select a recording from the dropdown to replay past sessions

### Viewing Data
- **Live Mode**: Real-time updates every second during active sessions
- **Replay Mode**: Load any recorded session and view historical data
- **Recording Selection**: Dropdown shows all available recordings

## 📊 Data Structure

### Timing Line (per driver)
```json
{
  "RacingNumber": "1",
  "Position": "2",
  "InPit": true,
  "Sectors": [
    {
      "Value": "36.747",
      "Status": 0,
      "Segments": [
        {"Status": 2048},  // 8 segments per sector
        ...
      ],
      "PersonalFastest": false,
      "OverallFastest": false
    }
  ],
  "BestLapTimes": [
    {"Value": "1:29.572", "Lap": 11}
  ],
  "Speeds": {
    "I1": {"Value": "233"},
    "I2": {"Value": "220"},
    "ST": {"Value": "315"}
  },
  "Stats": [
    {
      "TimeDiffToFastest": "+0.010",
      "TimeDifftoPositionAhead": "+0.096"
    }
  ]
}
```

### Session Info
```json
{
  "Meeting": {
    "Name": "Singapore Grand Prix",
    "Location": "Marina Bay",
    "Country": {"Name": "Singapore", "Code": "SGP"}
  },
  "Type": "Qualifying",
  "SessionStatus": "Started",
  "status": "live"
}
```

## 🔄 Update Frequency

- **SignalR Push**: Real-time as events happen
- **Polling**: Every 5 seconds to ensure data freshness
- **UI Refresh**: Every 1 second for live updates
- **Recording**: Each poll cycle (5 seconds)

## 🎯 Future Enhancements

### Planned Features:
1. **Track Map**: Live driver positions visualization
2. **Telemetry Graphs**: Speed, throttle, brake visualization
3. **Tyre Strategy**: Compound and stint tracking
4. **Radio Messages**: Team radio playback
5. **Race Control Timeline**: Important session events
6. **Mini Sectors Analysis**: Detailed segment-by-segment comparison
7. **Export Data**: Download session data as CSV/JSON
8. **Comparison Mode**: Compare two laps/drivers side-by-side

### UI Improvements:
- [ ] Car status icons (DRS, tyre compound)
- [ ] Pit stop duration display
- [ ] Lap-by-lap history graph
- [ ] Driver onboard camera integration
- [ ] Session timeline scrubber
- [ ] Multiple view layouts (tower, track, gaps)

## 🐛 Known Limitations

1. **Position Data**: Currently returning empty (might need track-specific decoding)
2. **Car Data**: Available but not yet visualized
3. **Tyre Info**: Data available in CarData.z but not parsed yet
4. **DRS Status**: Available in timing data, needs UI display
5. **Weather Updates**: Not frequent during qualifying

## 📝 Technical Notes

- **Storage Format**: JSONL for efficient line-by-line reading
- **Auto-recording**: Starts when session detected, stops on session end
- **Fallback**: Uses mock data when no live session
- **CORS**: Configured for localhost:3000
- **Port**: Backend on 8000, Frontend on 3000

## 🏁 Current Status

**LIVE NOW: Singapore Grand Prix Qualifying**
- ✅ Backend connected and recording
- ✅ 20 drivers tracked
- ✅ Sector times updating
- ✅ Recording active (Frame count growing)
- ✅ Professional UI displaying live data

## 📚 References

- F1 Live Timing: https://livetiming.formula1.com
- Fast-F1: https://github.com/theOehrly/Fast-F1
- SlowlyDev F1-Dash: https://github.com/slowlydev/f1-dash
- SignalR Core: https://github.com/mandrewcito/signalrcore

---

**Last Updated**: October 4, 2025
**Status**: ✅ FULLY OPERATIONAL
**Session**: Singapore GP Qualifying (LIVE)
