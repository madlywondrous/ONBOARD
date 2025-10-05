# F1 Live Timing API - Complete Data Reference
## Official F1 SignalR API - All Available Topics & Fields

**Last Updated**: October 5, 2025  
**Data Source**: Official F1 Live Timing via SignalR Core  
**Backend**: FastAPI with f1_livetiming_client.py

---

## 📡 Available API Endpoints

### Current Implementation

| Endpoint | Status | Description | Currently Used? |
|----------|--------|-------------|----------------|
| `/api/live/session` | ✅ Working | Session info, meeting, type | ✅ YES |
| `/api/live/timing` | ✅ Working | Lap times, sectors, positions | ✅ YES |
| `/api/live/timing-app` | ✅ Working | Tires, DRS, penalties | ✅ YES (tires only) |
| `/api/live/positions` | ✅ Working | Track positions (X,Y,Z coords) | ❌ NO |
| `/api/live/weather` | ✅ Working | Weather data | ❌ NO |
| `/api/live/track-status` | ✅ Working | Flags, safety car | ✅ YES |
| `/api/live/race-control` | ✅ Working | Race control messages | ✅ YES |
| `/api/live/car-data` | ✅ Working | Telemetry (speed, RPM, gear) | ❌ NO |
| `/api/drivers` | ✅ Working | Driver list with teams | ✅ YES |
| `/api/teams` | ✅ Working | Team list | ✅ YES (other sections) |

---

## 🔥 SignalR Topics Subscribed

The backend subscribes to **20 topics** from F1 Live Timing:

```python
topics = [
    "Heartbeat",           # Keep-alive
    "AudioStreams",        # Radio feeds
    "DriverList",          # Driver info
    "ExtrapolatedClock",   # Session clock
    "RaceControlMessages", # Flags, incidents
    "SessionInfo",         # Meeting, circuit info
    "SessionStatus",       # Red flag, checkered flag
    "TeamRadio",           # Radio messages
    "TimingAppData",       # Tires, DRS, penalties
    "TimingStats",         # Additional stats
    "TrackStatus",         # Green/Yellow/Red flags
    "WeatherData",         # Weather info
    "Position.z",          # Driver positions (compressed)
    "CarData.z",           # Telemetry (compressed)
    "ContentStreams",      # Video/audio streams
    "SessionData",         # Session metadata
    "TimingData",          # Main timing data
    "TopThree",            # Fastest 3 drivers
    "RcmSeries",           # Race control messages
    "LapCount"             # Current lap number
]
```

---

## 📊 DATA STRUCTURES - What We Get

### 1️⃣ **SessionInfo** (`/api/live/session`)

```typescript
interface SessionInfo {
  Meeting: {
    Name: string              // "Singapore Grand Prix"
    OfficialName: string      // "FORMULA 1 SINGAPORE AIRLINES..."
    Location: string          // "Marina Bay"
    Country: {
      Code: string            // "SGP"
      Name: string            // "Singapore"
    }
    Circuit: {
      Key: number
      ShortName: string       // "Marina Bay"
    }
  }
  Name: string                // "Race"
  Type: string                // "Race" | "Qualifying" | "Practice"
  Number: number              // Session number
  StartDate: string           // ISO timestamp
  EndDate: string             // ISO timestamp
  GmtOffset: string           // "+08:00:00"
  Path: string                // Session path
  status: string              // "live" | "ended" | "upcoming"
}
```

**Currently Using**: ✅ Meeting.Name, Type, status  
**Not Using**: ❌ OfficialName, Location, Country, Circuit, StartDate, EndDate, GmtOffset

---

### 2️⃣ **TimingData** (`/api/live/timing`)

```typescript
interface TimingData {
  Lines: {
    [driverNumber: string]: {
      RacingNumber: string
      Line: number
      Position: string          // "1", "2", "3"...
      
      // Sector times
      Sectors: Array<{
        Value: string           // "26.123"
        PreviousValue: string
        Status: number          // 0=no time, 2048=normal, 2064=PB, 2051=fastest, 2068=slower
        Segments: Array<{
          Status: number        // Segment colors
        }>
      }>
      
      // Lap times
      LastLapTime: {
        Value: string           // "1:42.123"
        Status: number
      }
      BestLapTimes: Array<{
        Value: string
        Lap: number
      }>
      
      // Gaps & intervals
      Stats: Array<{
        TimeDiffToFastest: string       // "+2.345"
        TimeDifftoPositionAhead: string // "+0.123"
        TimeDiffToLeader: string        // "+15.678"
      }>
      
      // Speed trap
      Speeds: {
        I1: { Value: string }   // Sector 1 speed
        I2: { Value: string }   // Sector 2 speed
        FL: { Value: string }   // Finish line speed
        ST: { Value: string }   // Speed trap
      }
      
      // Status
      InPit: boolean
      PitOut: boolean
      Stopped: boolean
      Retired: boolean
      Status: number            // 0=OnTrack, 1=Outlap, 2=Pitlane
      
      // Number of laps
      NumberOfLaps: number
      NumberOfPitStops: number
    }
  }
  SessionPart: number
  Withheld: boolean
}
```

**Currently Using**: ✅ Position, Sectors (value & segments), BestLapTimes, Stats (gaps), InPit  
**Not Using**: ❌ Speeds (I1, I2, FL, ST), LastLapTime, PitOut, Stopped, Retired, NumberOfPitStops

---

### 3️⃣ **TimingAppData** (`/api/live/timing-app`)

```typescript
interface TimingAppData {
  Lines: {
    [driverNumber: string]: {
      // Tire information
      Stints: Array<{
        Compound: string      // "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET"
        New: string           // "true" | "false"
        TyresNotChanged: string
        TotalLaps: number     // Laps on this tire
        StartLaps: number     // Lap number stint started
      }>
      
      // DRS information
      DRS: {
        Status: number        // 0=disabled, 1=enabled, 2=open
      }
      
      // Grid position
      GridPos: string
      
      // Penalties
      TimePenalty: {
        Value: number         // Seconds
        Reason: string
      }
      
      // Messages
      StatusText: string      // "ON TRACK" | "IN PIT" | "OUT"
    }
  }
}
```

**Currently Using**: ✅ Stints (Compound, New, TotalLaps)  
**Not Using**: ❌ DRS, GridPos, TimePenalty, StatusText

---

### 4️⃣ **Position.z** (`/api/live/positions`)

```typescript
interface PositionData {
  Position: {
    [driverNumber: string]: {
      Position: number        // Race position
      X: number              // X coordinate on track
      Y: number              // Y coordinate on track
      Z: number              // Z coordinate (elevation)
      Status: string         // "OnTrack" | "PitLane" | "OutLap"
    }
  }
  Timestamp: string
}
```

**Currently Using**: ❌ NOT USING AT ALL  
**Potential Use**: Track map visualization, driver positions on circuit

---

### 5️⃣ **CarData.z** (`/api/live/car-data`)

```typescript
interface CarData {
  Entries: {
    [driverNumber: string]: {
      Cars: {
        [carIndex: string]: {
          Channels: {
            "0": number[]     // RPM
            "2": number[]     // Speed (km/h)
            "3": number[]     // nGear (gear number)
            "4": number[]     // Throttle (0-100)
            "5": number[]     // Brake (boolean)
            "45": number[]    // DRS (0-100)
          }
          Utc: string
        }
      }
    }
  }
  Timestamp: string
}
```

**Currently Using**: ❌ NOT USING AT ALL  
**Potential Use**: Telemetry graphs, speed comparison, gear usage analysis

---

### 6️⃣ **WeatherData** (`/api/live/weather`)

```typescript
interface WeatherData {
  AirTemp: string           // "30.5" (Celsius)
  Humidity: string          // "65" (percentage)
  Pressure: string          // "1013.2" (mbar)
  Rainfall: string          // "0" | "1" (boolean-ish)
  TrackTemp: string         // "45.2" (Celsius)
  WindDirection: string     // "120" (degrees)
  WindSpeed: string         // "2.5" (m/s)
  Timestamp: string
}
```

**Currently Using**: ❌ NOT USING (hardcoded "DRY")  
**Potential Use**: Weather widget, rain indicators, temperature display

---

### 7️⃣ **TrackStatus** (`/api/live/track-status`)

```typescript
interface TrackStatus {
  Status: string            // "1" = AllClear, "2" = Yellow, "4" = SC, "5" = Red, "6" = VSC, "7" = VSC ending
  Message: string           // "AllClear" | "Yellow" | "SCDeployed" | "Red"
  Timestamp: string
}
```

**Currently Using**: ✅ Message (displayed in stats card)  
**Not Using**: Status codes for visual flags

---

### 8️⃣ **RaceControlMessages** (`/api/live/race-control`)

```typescript
interface RaceControlMessage {
  Utc: string               // ISO timestamp
  Lap: number               // Lap number
  Category: string          // "Flag" | "Drs" | "CarEvent" | "Other"
  Message: string           // Full message text
  Status: string            // Message status
  Flag: string              // "GREEN" | "YELLOW" | "RED" | "BLUE" | "WHITE"
  Scope: string             // "Track" | "Driver" | "Sector"
  Sector: number            // Sector number if applicable
  RacingNumber: string      // Driver number if applicable
}
```

**Currently Using**: ✅ Utc, Category, Message, Flag  
**Not Using**: ❌ Lap, Status, Scope, Sector, RacingNumber

---

### 9️⃣ **DriverList** (`/api/drivers`)

```typescript
interface Driver {
  RacingNumber: string
  BroadcastName: string     // "N HULKENBERG"
  FullName: string          // "Nico HÜLKENBERG"
  Tla: string              // "HUL" (3-letter acronym)
  Line: number
  TeamName: string          // "Haas F1 Team"
  TeamColour: string        // "B6BABD" (hex without #)
  FirstName: string
  LastName: string
  Reference: string         // "HULNIC01"
  HeadshotUrl: string       // URL to driver photo
  CountryCode: string       // "DEU"
}
```

**Currently Using**: ✅ RacingNumber, Tla, TeamName, TeamColour  
**Not Using**: ❌ BroadcastName, FullName, HeadshotUrl, CountryCode, FirstName, LastName

---

### 🔟 **LapCount** (Available but not exposed as endpoint yet)

```typescript
interface LapCount {
  CurrentLap: number
  TotalLaps: number
}
```

**Currently Using**: ❌ NOT USING  
**Potential Use**: Progress bar, lap counter

---

### 1️⃣1️⃣ **TimingStats** (Available but not exposed as endpoint yet)

```typescript
interface TimingStats {
  Lines: {
    [driverNumber: string]: {
      PersonalBestLapTime: {
        Value: string
        Lap: number
      }
      BestSectors: Array<{
        Value: string
        Lap: number
      }>
    }
  }
}
```

**Currently Using**: ❌ NOT USING  
**Potential Use**: Best lap comparison, sector comparison

---

## 🚀 RECOMMENDATIONS - What to Add

### High Priority (Easy Wins)

1. **SPEEDS Display** ✨
   - Available: `Speeds.I1`, `Speeds.I2`, `Speeds.FL`, `Speeds.ST`
   - Currently: Using `Math.random()` 😅
   - Impact: Real speed data instead of fake numbers

2. **Weather Widget** 🌡️
   - Available: AirTemp, TrackTemp, Humidity, Rainfall, WindSpeed
   - Currently: Hardcoded "DRY"
   - Impact: Live weather conditions

3. **Lap Counter** 📊
   - Available: `LapCount.CurrentLap`, `LapCount.TotalLaps`
   - Currently: Not shown
   - Impact: Race progress indicator

4. **DRS Indicator** 💨
   - Available: `TimingAppData.Lines[].DRS.Status`
   - Currently: Not shown
   - Impact: Show when driver has DRS available/open

5. **Penalty Display** ⚠️
   - Available: `TimingAppData.Lines[].TimePenalty`
   - Currently: Not shown
   - Impact: Show time penalties

### Medium Priority (More Work)

6. **Speed Traps** 🎯
   - Available: `Speeds.ST` (speed trap speeds)
   - Use: Speed trap comparison widget

7. **Pit Stop Counter** 🛞
   - Available: `NumberOfPitStops`
   - Use: Show pit stop count per driver

8. **Last Lap Time** ⏱️
   - Available: `LastLapTime.Value`
   - Use: Show most recent lap (vs best lap)

9. **Driver Status** 🚦
   - Available: `Stopped`, `Retired`, `PitOut`
   - Use: Better status indicators

10. **Race Control Details** 📻
    - Available: `Lap`, `Sector`, `RacingNumber` in messages
    - Use: More detailed race control info

### Low Priority (Complex)

11. **Track Map** 🗺️
    - Available: `Position.z` with X,Y,Z coordinates
    - Use: Live track map with driver positions

12. **Telemetry Graphs** 📈
    - Available: `CarData.z` with RPM, Speed, Throttle, Brake
    - Use: Real-time telemetry visualization

13. **Driver Photos** 🏎️
    - Available: `HeadshotUrl`
    - Use: Show driver headshots

---

## 📝 MISSING DATA (Not Available from Live Timing)

### Championship Standings ❌
- Driver championship points
- Constructor championship points
- **Workaround**: Use Ergast API or scrape F1 website

### Historical Data ❌
- Past race results
- Season statistics
- **Workaround**: Use Ergast API

### Qualifying Results ❌
- Q1, Q2, Q3 times
- Grid penalties
- **Workaround**: Store during quali session

---

## 🎯 NEXT STEPS - Quick Wins

### 1. Add Real Speeds (5 mins)
```tsx
// Replace Math.random() with:
<div>{line.Speeds?.I1?.Value || "---"} KPH</div>
<div>{line.Speeds?.I2?.Value || "---"} KPH</div>
<div>{line.Speeds?.FL?.Value || "---"} KPH</div>
```

### 2. Add Lap Counter (10 mins)
```tsx
// In stats cards, add:
<Card>
  <p>LAP</p>
  <p>{lapCount.CurrentLap} / {lapCount.TotalLaps}</p>
</Card>
```

### 3. Add DRS Indicator (15 mins)
```tsx
// Next to tire indicator:
{tyreData[line.RacingNumber]?.DRS?.Status === 2 && (
  <Badge className="bg-green-500">DRS</Badge>
)}
```

### 4. Add Weather Data (20 mins)
```tsx
// Replace "DRY" with:
<Card>
  <p>WEATHER</p>
  <p>{weather?.AirTemp}°C</p>
  <p>{weather?.Rainfall === "1" ? "WET" : "DRY"}</p>
</Card>
```

### 5. Add Penalties (30 mins)
```tsx
// In driver row:
{tyreData[line.RacingNumber]?.TimePenalty?.Value && (
  <Badge className="bg-yellow-500">
    +{tyreData[line.RacingNumber].TimePenalty.Value}s
  </Badge>
)}
```

---

## 💡 Summary

**Total Topics**: 20 subscribed  
**Total Endpoints**: 9 implemented  
**Currently Using**: ~30% of available data  
**Quick Wins Available**: 5 easy improvements  
**Major Features Available**: Track map, telemetry, more stats

**Recommendation**: Start with real speeds, lap counter, and DRS indicators for immediate impact!

---

**Generated**: October 5, 2025  
**Backend**: `/backend/main.py` & `/backend/f1_livetiming_client.py`  
**Frontend**: `/components/dashboard/live-timing-f1.tsx`
