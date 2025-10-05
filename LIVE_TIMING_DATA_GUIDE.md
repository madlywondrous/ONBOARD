# 🏎️ LIVE TIMING - Available API Data Fields
## Step-by-Step Guide to Adding Columns

**Current State**: Clean slate with just POS and DRV  
**Goal**: Add columns one by one based on what you want to see

---

## 📊 AVAILABLE DATA - Choose What to Add

### From `TimingData.Lines[driverNumber]`

#### 1️⃣ **Position & Basic Info**
```typescript
✅ Position: string              // "1", "2", "3" (CURRENTLY SHOWING)
✅ RacingNumber: string          // "44", "1", "16" (CURRENTLY SHOWING)
❌ Line: number                  // Line number in timing sheet
```

#### 2️⃣ **Gap & Interval Data**
```typescript
// All from line.Stats array:
❌ TimeDiffToFastest: string        // "+2.345" - Gap to fastest lap
❌ TimeDifftoPositionAhead: string  // "+0.123" - Gap to car ahead (interval)
❌ TimeDiffToLeader: string         // "+15.678" - Gap to race leader
```
**Display Options**:
- Show gap to leader
- Show interval to car ahead
- Show gap to fastest lap
- Show all three

---

#### 3️⃣ **Sector Times** (3 columns)
```typescript
// line.Sectors[0-2]:
❌ Sectors[0].Value: string      // "26.123" - Sector 1 time
❌ Sectors[1].Value: string      // "38.456" - Sector 2 time
❌ Sectors[2].Value: string      // "24.789" - Sector 3 time
❌ Sectors[n].Status: number     // Color coding:
   // 0 = no time (gray)
   // 2048 = normal time (white)
   // 2064 = personal best (green)
   // 2051 = overall fastest (purple)
   // 2068 = slower than PB (yellow)
```
**Display Options**:
- Plain text times
- Color-coded text
- With colored dots
- Background color

---

#### 4️⃣ **Lap Times**
```typescript
❌ LastLapTime.Value: string         // "1:42.123" - Most recent lap
❌ BestLapTimes[0].Value: string     // "1:41.456" - Personal best lap
❌ BestLapTimes[0].Lap: number       // Lap number of best lap
```
**Display Options**:
- Show best lap only
- Show last lap only
- Show both

---

#### 5️⃣ **Speed Data** (Real speeds!)
```typescript
❌ Speeds.I1.Value: string       // Sector 1 speed trap (km/h)
❌ Speeds.I2.Value: string       // Sector 2 speed trap (km/h)
❌ Speeds.FL.Value: string       // Finish line speed (km/h)
❌ Speeds.ST.Value: string       // Main speed trap (km/h)
```
**Display Options**:
- Show all 3 sector speeds
- Show speed trap only
- Show finish line speed

---

#### 6️⃣ **Status Indicators**
```typescript
❌ InPit: boolean                // Currently in pit lane
❌ PitOut: boolean               // Just exited pits
❌ Stopped: boolean              // Car stopped on track
❌ Retired: boolean              // Out of race
❌ Status: number                // 0=OnTrack, 1=Outlap, 2=Pitlane
```
**Display Options**:
- PIT badge (cyan)
- OUT badge (green)
- STOPPED badge (red)
- RETIRED badge (gray)

---

#### 7️⃣ **Track Segments** (Mini track map)
```typescript
❌ Sectors[0-2].Segments[].Status: number   // 24 mini-segments showing track progress
   // Same color coding as sectors
```
**Display Options**:
- Horizontal bar (current style)
- Dots
- Hide completely

---

#### 8️⃣ **Lap Count**
```typescript
❌ NumberOfLaps: number          // Total laps completed
❌ NumberOfPitStops: number      // Number of pit stops
```

---

### From `TimingAppData.Lines[driverNumber]`

#### 9️⃣ **Tire Information**
```typescript
// Current stint (last item in Stints array):
❌ Stints[-1].Compound: string       // "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"
❌ Stints[-1].New: string            // "true" or "false" - New tires?
❌ Stints[-1].TotalLaps: number      // Laps on current tires
❌ Stints[-1].StartLaps: number      // Lap number stint started
```
**Display Options**:
- Icon only (current)
- Icon + laps
- Colored dot + laps
- Just letter (S/M/H)

---

#### 🔟 **DRS Status**
```typescript
❌ DRS.Status: number            // 0=Disabled, 1=Enabled, 2=Open
```
**Display Options**:
- Green "DRS" badge when enabled
- Different color when open
- Hide when disabled

---

#### 1️⃣1️⃣ **Penalties**
```typescript
❌ TimePenalty.Value: number     // Penalty in seconds
❌ TimePenalty.Reason: string    // "Track limits" etc.
```
**Display Options**:
- "+5s" badge (yellow/orange)
- Show reason on hover

---

#### 1️⃣2️⃣ **Grid Position**
```typescript
❌ GridPos: string               // Starting grid position
```

---

#### 1️⃣3️⃣ **Status Text**
```typescript
❌ StatusText: string            // "ON TRACK", "IN PIT", "OUT"
```

---

### From Driver Data

#### 1️⃣4️⃣ **Driver Details**
```typescript
✅ name_acronym: string          // "VER", "HAM" (CURRENTLY SHOWING)
❌ full_name: string             // "Max Verstappen"
✅ team_colour: string           // "0600EF" (CURRENTLY SHOWING as border)
❌ team_name: string             // "Red Bull Racing"
❌ country_code: string          // "NED", "GBR"
```

---

## 🎯 RECOMMENDED LAYOUT OPTIONS

### Option 1: Minimal (Current + 3 more)
```
POS | DRV | GAP | BEST LAP | TYRE
```

### Option 2: Standard F1 Style (Like your reference image)
```
POS | DRV | INTERVAL | LAST LAP | GAP | S1 | S2 | S3 | SPEEDS (I1/I2/FL) | TYRE | TRACK BAR
```

### Option 3: Full Data
```
POS | DRV | GAP | INT | LAST | BEST | S1 | S2 | S3 | SPD1 | SPD2 | SPD3 | TYRE | PIT STOPS | TRACK
```

### Option 4: Compact & Clean
```
POS | DRV | LAP TIME | S1 | S2 | S3 | TYRE+LAPS | TRACK
```

---

## 📝 TELL ME WHAT YOU WANT

**Step by step, I'll add columns in this order (or tell me your preferred order):**

1. ⬜ Gap/Interval data? (Which one: Gap to leader, Interval, or Gap to fastest?)
2. ⬜ Lap times? (Last lap, Best lap, or both?)
3. ⬜ Sector times? (S1, S2, S3 with colors?)
4. ⬜ Speeds? (All 3 sectors, or just speed trap?)
5. ⬜ Tire info? (Icon + laps, or just indicator?)
6. ⬜ Track segments bar? (Mini colored bar or skip?)
7. ⬜ DRS indicator? (Show when enabled?)
8. ⬜ Pit indicators? (PIT/OUT badges?)
9. ⬜ Penalties? (Show time penalties?)
10. ⬜ Pit stop count?

---

## 🚀 JUST TELL ME:

1. **Which columns do you want?** (Pick from the list above)
2. **In what order?** (Left to right)
3. **How should each look?** (Colors, size, style)

I'll add them one by one, perfectly aligned!

---

**Current Clean Slate**: Just POS + DRV showing  
**Ready to add**: Any of the fields above  
**Your call**: What's first? 🎯
