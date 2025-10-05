# F1 Dashboard Live Data Troubleshooting

## 🔍 Changes Made for Better Data Display

### Problem
The dashboard wasn't showing live data properly:
- Sectors not displaying with colors
- Speed data not showing
- Gap/interval times missing
- Data felt unresponsive

### Root Causes Identified
1. **Wrong data structure assumptions** - F1 API data structure varies
2. **Hardcoded property access** - Not checking multiple possible locations
3. **Type mismatches** - Some fields are strings, some are objects
4. **Missing fallbacks** - When data doesn't exist, should gracefully handle

### Solutions Implemented

## 1. Enhanced Logging

Added comprehensive console logging to debug data structure:

```typescript
// Log full timing data structure
console.log("🏁 Timing data structure:", JSON.stringify(timingData, null, 2).substring(0, 500))

// Log first driver's complete data
console.log(`🏁 First driver (${line.RacingNumber}) full data:`, {
  position: line.Position,
  sectors: line.Sectors,
  speeds: line.Speeds,
  stats: line.Stats,
  gapToLeader: line.GapToLeader,
  intervalToPositionAhead: line.IntervalToPositionAhead
})

// Log sector data structure
console.log(`🏁 Sector data for driver ${line.RacingNumber}:`, {
  sectors: line.Sectors,
  sector0: line.Sectors?.[0],
  hasSegments: !!sector?.Segments,
  segmentCount: sector?.Segments?.length
})
```

## 2. Fixed Type Definitions

Updated `TimingLine` interface to handle F1 API variations:

```typescript
interface TimingLine {
  RacingNumber: string
  Position: string
  // ... other fields
  GapToLeader?: string | { Value: string }  // Can be string OR object
  IntervalToPositionAhead?: { Value: string }
  Sectors: Array<{
    Value: string
    Status: number
    Segments: Array<{ Status: number } | number>  // Can be object OR number
  }>
  Stats?: Array<{
    TimeDiffToFastest?: string
    TimeDifftoPositionAhead?: string  // Note: lowercase 'to'
  }>
}
```

## 3. Robust Gap/Interval Extraction

Fixed to check multiple possible data locations:

```typescript
// Interval to car ahead - tries multiple locations
const gapToLeader = line.GapToLeader
const intervalValue = typeof gapToLeader === 'string' ? gapToLeader : gapToLeader?.Value
const interval = intervalValue ||
               line.IntervalToPositionAhead?.Value ||
               line.Stats?.[0]?.TimeDifftoPositionAhead ||
               line.Stats?.[1]?.TimeDifftoPositionAhead ||
               "---"

// Gap to leader - separate logic
const gapValue = typeof gapToLeader === 'object' ? gapToLeader?.Value : null
const gap = gapValue ||
           line.Stats?.[0]?.TimeDiffToFastest ||
           line.Stats?.[1]?.TimeDiffToFastest ||
           "---"
```

## 4. Fixed Sector Segments

Handle both object and number segment types:

```typescript
sector.Segments.map((segment, segIdx) => {
  // Segment can be { Status: number } or just number
  const segStatus = typeof segment === 'number' ? segment : segment.Status
  const segColor = getSectorColor(segStatus)
  return <div style={{ backgroundColor: segColor }} />
})
```

## 5. Performance Optimizations

- **Backend**: Update every 500ms (was 5000ms)
- **Frontend**: Poll every 500ms (was 1000ms)
- **No-cache headers**: Prevent stale data
- **Cache busting**: Force fresh data on every request

## 🧪 How to Test

### 1. Open Browser Console

Press `F12` or `Cmd+Option+I` and go to Console tab

### 2. Watch for Logs

You should see every 500ms:
```
🏁 Fetching LIVE data from SignalR...
🏁 Session data: { ... }
🏁 Timing data: { ... }
🏁 Timing data structure: { "Lines": { ... } }
🏁 Sorted 20 drivers
🏁 First driver data: { ... }
🏁 First driver (1) full data: { position: "1", sectors: [...], speeds: {...}, ... }
🏁 Sector data for driver 1: { sectors: [...], ... }
```

### 3. Check Data Structure

Look at the console logs to see:
- **Are sectors present?** `sectors: [{ Value: "...", Segments: [...] }]`
- **Do segments exist?** `hasSegments: true, segmentCount: 8`
- **Are speeds available?** `speeds: { I1: { Value: "320" }, ... }`
- **Is gap data there?** `gapToLeader: "+1.234"` or `gapToLeader: { Value: "+1.234" }`

### 4. Network Tab

Check Network tab to see:
- Requests to `/api/live/timing` every 500ms
- Response status: `200 OK`
- Response size: Should be large JSON (10-50kb)
- Cache-Control header: `no-cache, no-store, must-revalidate`

## 🔧 Troubleshooting Steps

### If Gaps Not Showing

**Check console for:**
```javascript
gapToLeader: undefined
Stats: []
```

**Solution:** F1 API might not be sending gap data yet. This happens:
- Before race starts
- First few laps
- During red flag periods

### If Sectors Not Colored

**Check console for:**
```javascript
sectors: [{ Value: "26.432", Status: 0, Segments: undefined }]
```

**Meaning:**
- `Status: 0` = No time recorded (gray)
- `Status: 2048` = Normal lap (blue)
- `Status: 2064` = Personal best (green)
- `Status: 2051` = Overall fastest (purple)

**Solution:** Colors are working if you see Status values. If all 0, wait for drivers to complete laps.

### If Speeds Not Showing

**Check console for:**
```javascript
speeds: { I1: undefined, I2: undefined, FL: undefined }
```

**Solution:** Speed data only available:
- During qualifying and race
- After cars pass speed traps
- Not available in practice sessions sometimes

### If Data Not Updating

**Check console for repeated identical data:**
```javascript
🏁 First driver (1) full data: { position: "1", ... } // Same every time
```

**Solutions:**
1. **Restart backend** - SignalR connection might be stale
2. **Check backend logs** - Look for connection errors
3. **Verify race is live** - F1 API only sends data during sessions

## 📊 Expected Behavior

### During Live Race

✅ Position numbers update every lap  
✅ Sector times turn green/purple as drivers improve  
✅ Segments change color as cars pass mini-sectors  
✅ Gaps update every few seconds  
✅ Speeds show at speed traps  
✅ DRS activates/deactivates  
✅ Tire data updates after pit stops  

### During No Session

❌ Session shows "No active F1 session"  
❌ Timing tower empty or showing "---"  
❌ All data fields show fallback values  
⚠️ This is NORMAL - API has no data to send  

## 🚀 Next Steps

### 1. Restart Backend

```bash
cd backend
# Stop with Ctrl+C if running
python3 main.py
```

### 2. Clear Browser Cache

- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or clear cache in DevTools Network tab

### 3. Check During Live Session

Best test times:
- **Friday Practice**: 10:00-13:00, 14:00-17:00 (Session time)
- **Saturday**: Qualifying 14:00-17:00
- **Sunday**: Race 13:00-16:00

### 4. Monitor Console Logs

Watch the logs for:
- Regular updates every 500ms
- Increasing lap numbers
- Changing positions
- Sector status codes changing

## 🐛 Common Issues

### Issue: "Cannot read property 'Value' of undefined"

**Cause:** Accessing nested property that doesn't exist

**Fix:** Already added optional chaining `?.` everywhere

### Issue: Sectors show "---"

**Cause:** 
- Race not started
- Drivers in garage
- Formation lap

**Fix:** Wait for green flag / first flying lap

### Issue: All gaps show "---"

**Cause:**
- P1 always shows "LEAD"
- Others need 2+ cars on track

**Fix:** Wait for multiple cars to complete lap

### Issue: Speeds all "0" or "---"

**Cause:**
- Speed traps not crossed yet
- Practice session (limited speed data)

**Fix:** Wait for cars to cross finish line

## 📝 Data Availability by Session Type

| Data Type | Practice | Qualifying | Sprint | Race |
|-----------|----------|------------|--------|------|
| Positions | ✅ | ✅ | ✅ | ✅ |
| Lap Times | ✅ | ✅ | ✅ | ✅ |
| Sectors | ✅ | ✅ | ✅ | ✅ |
| Segments | ✅ | ✅ | ✅ | ✅ |
| Gaps | ⚠️ Limited | ✅ | ✅ | ✅ |
| Speeds | ⚠️ Limited | ✅ | ✅ | ✅ |
| DRS | ❌ | ❌ | ✅ | ✅ |
| Pit Stops | ✅ | ⚠️ Limited | ✅ | ✅ |

## 🎯 Success Criteria

Dashboard is working correctly when you see:

1. ✅ Console logs updating every 500ms
2. ✅ Network requests getting 200 responses
3. ✅ Non-empty JSON in network responses
4. ✅ Driver positions rendering
5. ✅ Sector times showing (even if "---" before lap complete)
6. ✅ Team colors visible
7. ✅ Tire compounds displaying
8. ✅ At least some data updating (position, lap count, etc.)

If **ANY** of these work, the connection is good!

If **NONE** work:
- Check backend is running on port 8000
- Check frontend proxy in `next.config.mjs`
- Check CORS settings in backend
- Verify no firewall blocking
