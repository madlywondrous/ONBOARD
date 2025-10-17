"use client"

import { useState, useEffect, useReducer } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Flag, Radio, Zap, Timer, Circle, Thermometer, Droplets, Wind, CloudRain, Info, AlertTriangle } from "lucide-react"
import { useSSELiveData } from "@/hooks/use-sse-live-data"

// Use relative URLs so Next.js rewrites can proxy to backend
const API_BASE_URL = ""

// Deep merge utility for incremental updates
function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return source
  }
  
  const output = { ...target }
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key])
      } else {
        output[key] = source[key]
      }
    }
  }
  return output
}

// F1 color coding for sectors (Official F1 Standards)
const SECTOR_STATUS_COLORS: { [key: number]: string } = {
  0: "#525252",       // No time - gray
  2048: "#3B82F6",    // Blue - normal time (changed from white)
  2064: "#22C55E",    // Green - personal best
  2068: "#FACC15",    // Yellow - slower than PB / average
  2049: "#22C55E",    // Green - improvement
  2051: "#C084FC",    // Purple - overall fastest
}

// Helper function to get sector color
const getSectorColor = (status: number): string => {
  return SECTOR_STATUS_COLORS[status] || "#3B82F6" // Default to blue
}

interface TimingLine {
  RacingNumber: string
  Position: string
  InPit: boolean
  PitOut?: boolean
  Stopped?: boolean
  Retired?: boolean
  KnockedOut?: boolean
  NumberOfPitStops?: number
  GapToLeader?: string | { Value: string }
  IntervalToPositionAhead?: { Value: string }
  Sectors: Array<{
    Value?: string
    Status?: number
    Segments?: Array<{ Status: number } | number>
  } | null>
  BestLapTimes?: Array<{ Value?: string }>
  Stats?: Array<{
    TimeDiffToFastest?: string
    TimeDifftoPositionAhead?: string
  }>
  Speeds?: {
    I1?: { Value: string }  // Sector 1 speed
    I2?: { Value: string }  // Sector 2 speed
    FL?: { Value: string }  // Finish line speed
    ST?: { Value: string }  // Speed trap
  }
  LastLapTime?: { Value?: string } | string | null
}

interface Driver {
  driver_number: number
  name_acronym: string
  team_colour: string
  // Also support F1 API format
  Tla?: string
  TeamColour?: string
}

interface TimingAppLine {
  Stints?: Array<{
    Compound: string
    New: string
    TotalLaps: number
    StartLaps?: number
  }>
  DRS?: {
    Status: number  // 0=disabled, 1=available, 2=open
  }
  StatusText?: string
  GridPos?: string
}

interface TimingStatsEntry {
  PersonalBestLapTime?: {
    Value?: string
    Lap?: number
  }
  BestSectors?: Array<{
    Value?: string
    Lap?: number
  }>
}

interface TimingStats {
  Lines?: {
    [driverNumber: string]: TimingStatsEntry
  }
}

interface SessionInfo {
  Meeting: { 
    Name: string
    Location: string
    Country: { Name: string; Code: string }
  }
  Type: string
  status: string
  StartDate?: string
  EndDate?: string
}

interface RaceControlMessage {
  Utc: string
  Category: string
  Flag?: string
  Scope?: string
  Sector?: number
  Lap?: string
  Message: string
}

interface TrackStatus {
  Status: string
  Message: string
}

// State management types
type LiveDataState = {
  drivers: { [key: string]: Driver }
  timingLines: TimingLine[]
  tyreData: { [key: string]: TimingAppLine }
  raceControl: RaceControlMessage[]
  sessionInfo: SessionInfo | null
  trackStatus: TrackStatus | null
  weather: WeatherData | null
  positions: PositionData | null
  carData: CarData | null
  teamRadio: TeamRadioMessage[]
  timingStats: TimingStats | null
  lapCounter: {CurrentLap: number; TotalLaps: number} | null
  loading: boolean
  lastUpdateTime: number
}

type LiveDataAction =
  | { type: 'SET_INITIAL_DATA'; payload: Partial<LiveDataState> }
  | { type: 'UPDATE_FROM_WEBSOCKET'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DRIVERS'; payload: { [key: string]: Driver } }

interface WeatherData {
  AirTemp: string
  Humidity: string
  Pressure: string
  Rainfall: string
  TrackTemp: string
  WindDirection: string
  WindSpeed: string
}

interface PositionData {
  Position: {
    [driverNumber: string]: {
      X: number
      Y: number
      Z: number
      Status: string
    }
  }
}

interface CarData {
  Entries: {
    [driverNumber: string]: {
      Channels: {
        "0": number[]  // RPM
        "2": number[]  // Speed
        "3": number[]  // Gear
        "4": number[]  // Throttle
        "5": number[]  // Brake
        "45": number[] // DRS
      }
    }
  }
}

interface TeamRadioMessage {
  RacingNumber: string
  Utc: string
  Message: string
  Path?: string  // Audio file path
  Url?: string
}

const isPlainObject = (value: unknown): value is Record<string, any> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const sortKeys = (keys: string[]): string[] => {
  return [...keys].sort((a, b) => {
    const aNum = Number(a)
    const bNum = Number(b)
    const aIsNum = Number.isFinite(aNum)
    const bIsNum = Number.isFinite(bNum)

    if (aIsNum && bIsNum) {
      return aNum - bNum
    }

    if (aIsNum) return -1
    if (bIsNum) return 1
    return a.localeCompare(b)
  })
}

const normalizeCollection = (value: unknown): any[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (isPlainObject(value)) {
    return sortKeys(Object.keys(value)).map((key) => value[key])
  }
  return []
}

const normalizeSegments = (segments: unknown): Array<{ Status: number } | number> => {
  return normalizeCollection(segments)
}

const normalizeSectors = (sectors: unknown): Array<any | null> => {
  if (!sectors) return []

  const collection = normalizeCollection(sectors).map((sector: any) => {
    if (!sector) return null
    if (sector.Segments) {
      return {
        ...sector,
        Segments: normalizeSegments(sector.Segments)
      }
    }
    return sector
  })

  if (collection.length > 0) {
    return [0, 1, 2].map((idx) => collection[idx] ?? null)
  }

  if (isPlainObject(sectors)) {
    return ["0", "1", "2"].map((key) => {
      const sector = (sectors as Record<string, any>)[key]
      if (!sector) return null
      return {
        ...sector,
        Segments: normalizeSegments(sector.Segments)
      }
    })
  }

  return []
}

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const asBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true
    if (normalized === "false" || normalized === "0" || normalized === "no") return false
    return normalized.length > 0
  }
  return Boolean(value)
}

const normalizeTimingLine = (driverNumber: string, rawLine: Record<string, any> | undefined): TimingLine => {
  const lineData = rawLine ?? {}
  const normalizedSectors = normalizeSectors(lineData.Sectors)
  const bestLapTimes = normalizeCollection(lineData.BestLapTimes)
  const stats = normalizeCollection(lineData.Stats)
  const pitStopsRaw = lineData.NumberOfPitStops ?? lineData.PitStops
  const pitStops = asNumber(pitStopsRaw)
  const positionSource = lineData.Position ?? lineData.Line ?? driverNumber
  const lastLapTimeRaw = lineData.LastLapTime
  const lastLapTime = typeof lastLapTimeRaw === "string"
    ? { Value: lastLapTimeRaw }
    : lastLapTimeRaw ?? null

  return {
    ...lineData,
    RacingNumber: driverNumber,
    Position: String(positionSource),
    InPit: asBoolean(lineData.InPit),
    PitOut: asBoolean(lineData.PitOut),
    Stopped: asBoolean(lineData.Stopped),
    Retired: asBoolean(lineData.Retired),
    KnockedOut: asBoolean(lineData.KnockedOut),
    NumberOfPitStops: pitStops,
    GapToLeader: lineData.GapToLeader,
    IntervalToPositionAhead: lineData.IntervalToPositionAhead,
    Sectors: [0, 1, 2].map((idx) => normalizedSectors[idx] ?? null),
    BestLapTimes: bestLapTimes,
    Stats: stats,
    Speeds: lineData.Speeds,
    LastLapTime: lastLapTime
  }
}

const mergeTimingLines = (existing: TimingLine[], incomingTiming: any): TimingLine[] => {
  if (!incomingTiming && existing.length === 0) {
    return []
  }

  const existingMap = existing.reduce<Record<string, any>>((acc, line) => {
    if (!line?.RacingNumber) {
      return acc
    }
    acc[line.RacingNumber] = line
    return acc
  }, {})

  const merged = deepMerge({ Lines: existingMap }, incomingTiming || {})
  const linesObject = (merged?.Lines ?? {}) as Record<string, any>

  const normalizedLines = Object.entries(linesObject)
    .filter(([driverNumber]) => !driverNumber.startsWith("_"))
    .map(([driverNumber, lineData]) => normalizeTimingLine(driverNumber, lineData))

  return normalizedLines.sort((a, b) => {
    const positionA = asNumber(a.Position) ?? parseInt(a.Position ?? "", 10)
    const positionB = asNumber(b.Position) ?? parseInt(b.Position ?? "", 10)
    const safeA = Number.isFinite(positionA) ? Number(positionA) : 999
    const safeB = Number.isFinite(positionB) ? Number(positionB) : 999
    return safeA - safeB
  })
}

const normalizeTimingAppDriverData = (driverData: any): TimingAppLine => {
  const stints = normalizeCollection(driverData?.Stints).map((stint: any) => {
    const totalLaps = asNumber(stint?.TotalLaps) ?? 0
    const startLaps = asNumber(stint?.StartLaps)
    const compound = stint?.Compound || "UNKNOWN"
    const isNew = typeof stint?.New === "boolean" ? String(stint.New) : (stint?.New ?? "false")

    return {
      ...stint,
      Compound: compound,
      New: isNew,
      TotalLaps: totalLaps,
      StartLaps: startLaps
    }
  })

  const drsStatus = asNumber(driverData?.DRS?.Status)

  return {
    ...driverData,
    Stints: stints,
    DRS: driverData?.DRS ? { Status: drsStatus ?? 0 } : undefined,
    StatusText: driverData?.StatusText,
    GridPos: driverData?.GridPos
  }
}

const sanitizeTimingAppLines = (timingAppData: any): Record<string, TimingAppLine> => {
  if (!timingAppData) return {}

  const lines = timingAppData.Lines ?? timingAppData
  if (!isPlainObject(lines)) return {}

  return Object.entries(lines)
    .filter(([driverNumber]) => !driverNumber.startsWith("_"))
    .reduce<Record<string, TimingAppLine>>((acc, [driverNumber, driverData]) => {
      if (!driverData) return acc
      acc[driverNumber] = normalizeTimingAppDriverData(driverData)
      return acc
    }, {})
}

// Reducer for atomic state updates
function liveDataReducer(state: LiveDataState, action: LiveDataAction): LiveDataState {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload, loading: false }
    
    case 'UPDATE_FROM_WEBSOCKET': {
      const data = action.payload
      const updates: Partial<LiveDataState> = {}
      
      console.log('🔄 REDUCER: Processing WebSocket update', {
        hasSession: !!data.session,
        hasTiming: !!data.timing,
        hasLapCount: !!data.lap_count,
        timingLinesCount: data.timing?.Lines ? Object.keys(data.timing.Lines).length : 0
      })
      
      // Update session info
      if (data.session) {
        updates.sessionInfo = data.session
        console.log('✅ REDUCER: Updated sessionInfo', data.session.Type, data.session.Meeting?.Name)
      }
      
      // Update timing data - CRITICAL: Merge incrementally, don't replace!
      if (data.timing) {
        const mergedTimingLines = mergeTimingLines(state.timingLines, data.timing)
        updates.timingLines = mergedTimingLines
        console.log('✅ REDUCER: Merged timingLines, count:', mergedTimingLines.length)
      }
      
      // Update lap counter - CRITICAL!
      if (data.lap_count) {
        updates.lapCounter = {
          CurrentLap: data.lap_count.CurrentLap || 0,
          TotalLaps: data.lap_count.TotalLaps || 0
        }
        console.log('✅ REDUCER: Updated lapCounter', updates.lapCounter)
      }
      
      // Update timing app data (tyres, DRS)
      if (data.timing_app_data) {
        const timingAppLines = sanitizeTimingAppLines(data.timing_app_data)
        if (Object.keys(timingAppLines).length > 0) {
          updates.tyreData = { ...state.tyreData, ...timingAppLines }
        }
      }
      
      // Update weather
      if (data.weather) {
        updates.weather = data.weather
      }
      
      // Update track status
      if (data.track_status) {
        updates.trackStatus = data.track_status
      }

      if (data.timing_stats) {
        const mergedStats = deepMerge(state.timingStats || {}, data.timing_stats)
        updates.timingStats = mergedStats as TimingStats
      }
      
      // Update race control
      if (Array.isArray(data.race_control)) {
        updates.raceControl = data.race_control.slice(-20)
      }
      
      // Update team radio
      if (Array.isArray(data.team_radio)) {
        const sortedRadio = [...data.team_radio]
          .filter((entry) => entry && entry.Utc)
          .sort((a: TeamRadioMessage, b: TeamRadioMessage) => {
            const timeA = new Date(a.Utc).getTime()
            const timeB = new Date(b.Utc).getTime()
            return timeB - timeA
          })
          .slice(0, 10)
        updates.teamRadio = sortedRadio
      }
      
      // Update positions
      if (data.positions) {
        updates.positions = data.positions
      }
      
      // Update car data
      if (data.car_data) {
        updates.carData = data.car_data
      }
      
      // Update drivers
      if (data.drivers) {
        const driversMap: { [key: string]: Driver } = {}
        Object.entries(data.drivers).forEach(([key, value]) => {
          if (key.startsWith('_') || !value) return
          driversMap[key] = value as Driver
        })
        updates.drivers = { ...state.drivers, ...driversMap }
      }
      
      return { ...state, ...updates, lastUpdateTime: Date.now() }
    }
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_DRIVERS':
      return { ...state, drivers: action.payload }
    
    default:
      return state
  }
}

const initialState: LiveDataState = {
  drivers: {},
  timingLines: [],
  tyreData: {},
  raceControl: [],
  sessionInfo: null,
  trackStatus: null,
  weather: null,
  positions: null,
  carData: null,
  teamRadio: [],
  timingStats: null,
  lapCounter: null,
  loading: true,
  lastUpdateTime: 0
}

export function LiveTimingF1() {
  const [state, dispatch] = useReducer(liveDataReducer, initialState)
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--:--')

  // SSE connection for real-time updates (f1-dash style - simpler!)
  const { data: sseData, connected: sseConnected, error: sseError } = useSSELiveData()

  // Debug: Log state changes
  useEffect(() => {
    console.log('🎯 STATE CHANGED:', {
      lapCounter: state.lapCounter,
      timingLinesCount: state.timingLines.length,
      sessionType: state.sessionInfo?.Type,
      trackStatus: state.trackStatus?.Status,
      weatherAirTemp: state.weather?.AirTemp
    })
  }, [state.lapCounter, state.timingLines.length, state.sessionInfo?.Type, state.trackStatus?.Status, state.weather?.AirTemp])

  console.log("🏁 LiveTimingF1 component rendered!", { 
    loading: state.loading, 
    drivers: Object.keys(state.drivers).length, 
    timingLines: state.timingLines.length,
    lapCounter: state.lapCounter,
    wsConnected: sseConnected,
    sessionInfo: state.sessionInfo?.Type
  })

  // Handle SSE data updates
  useEffect(() => {
    if (sseData) {
      console.log('📨📨📨 SSE data received:', {
        hasSession: !!sseData?.session,
        hasTiming: !!sseData?.timing,
        hasLapCount: !!sseData?.lap_count,
        currentLap: sseData?.lap_count?.CurrentLap,
        totalLaps: sseData?.lap_count?.TotalLaps,
        timingLinesKeys: sseData?.timing?.Lines ? Object.keys(sseData.timing.Lines).length : 0,
      })
      dispatch({ type: 'UPDATE_FROM_WEBSOCKET', payload: sseData })
    }
  }, [sseData])

  // Handle SSE connection status
  useEffect(() => {
    if (sseConnected) {
      console.log('✅✅✅ SSE CONNECTED - Real-time updates enabled!')
      dispatch({ type: 'SET_LOADING', payload: false })
    } else {
      console.log('❌❌❌ SSE DISCONNECTED')
    }
  }, [sseConnected])

  // Handle SSE errors
  useEffect(() => {
    if (sseError) {
      console.error('❌❌❌ SSE ERROR:', sseError)
    }
  }, [sseError])

  // Fetch drivers separately if needed (only once)
  useEffect(() => {
    if (Object.keys(state.drivers).length === 0) {
      fetch(`${API_BASE_URL}/api/drivers`)
        .then(res => res.json())
        .then(data => {
          const driversMap: { [key: string]: Driver } = {}
          data.forEach((d: Driver) => {
            driversMap[d.driver_number.toString()] = d
          })
          dispatch({ type: 'SET_DRIVERS', payload: driversMap })
        })
        .catch(err => console.error('Failed to fetch drivers:', err))
    }
  }, [state.drivers])

  // Simple effect - just log when mounted
  useEffect(() => {
    console.log("🏁 LiveTimingF1 mounted - WebSocket will handle all real-time data")
  }, [])

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const isLive = state.sessionInfo?.status === "live"
      
      if (state.sessionInfo?.EndDate && isLive) {
        // Countdown for live session
        const endTime = new Date(state.sessionInfo.EndDate).getTime()
        const now = Date.now()
        const diff = endTime - now
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        } else {
          setTimeRemaining('00:00:00')
        }
      } else if (state.sessionInfo?.StartDate && !isLive) {
        // Countdown to next session
        const startTime = new Date(state.sessionInfo.StartDate).getTime()
        const now = Date.now()
        const diff = startTime - now
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        } else {
          setTimeRemaining('--:--:--')
        }
      } else {
        setTimeRemaining('--:--:--')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [state.sessionInfo])

  // Helper functions for rendering
  const getTyreColor = (compound: string): string => {
    switch (compound?.toUpperCase()) {
      case "SOFT": return "#FF0000"
      case "MEDIUM": return "#FFD700"
      case "HARD": return "#FFFFFF"
      default: return "#888888"
    }
  }

  const getTyreImage = (compound: string): string => {
    const compoundLower = compound?.toLowerCase() || "unknown"
    return `/image Resource/Tires/${compoundLower}.svg`
  }

  const getTyreLabel = (compound: string): string => {
    switch (compound?.toUpperCase()) {
      case "SOFT": return "S"
      case "MEDIUM": return "M"
      case "HARD": return "H"
      default: return "?"
    }
  }

  const getCurrentTyre = (racingNumber: string) => {
    const driverTyreData = state.tyreData?.[racingNumber]
    if (!driverTyreData?.Stints || driverTyreData.Stints.length === 0) return null

    const currentStint = driverTyreData.Stints[driverTyreData.Stints.length - 1]
    const compound = currentStint?.Compound || "UNKNOWN"
    const newFlag = currentStint?.New
    const isNew = typeof newFlag === "string" ? newFlag.toLowerCase() === "true" : Boolean(newFlag)
    const laps = typeof currentStint?.TotalLaps === "number" ? currentStint.TotalLaps : asNumber(currentStint?.TotalLaps) ?? 0

    return {
      compound,
      isNew,
      laps
    }
  }

  const getTeamRadioSrc = (path?: string) => {
    if (!path) return ""
    const encoded = encodeURIComponent(path)
    const base = API_BASE_URL.endsWith('/') && API_BASE_URL.length > 1
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL
    return `${base}/api/team-radio/proxy?url=${encoded}`
  }

  const getSegmentColor = (status: number): string => {
    return SECTOR_STATUS_COLORS[status] || "#404040"
  }

  if (state.loading) {
    return <LiveTimingSkeleton />
  }

  const isLive = state.sessionInfo?.status === "live"

  // Helper function to get country code from meeting name
  const getCountryCode = (meetingName: string): string => {
    const countryMap: { [key: string]: string } = {
      'bahrain': 'bh', 'saudi arabia': 'sa', 'australia': 'au', 'japan': 'jp',
      'china': 'cn', 'miami': 'us', 'emilia romagna': 'it', 'monaco': 'mc',
      'canada': 'ca', 'spain': 'es', 'austria': 'at', 'great britain': 'gb',
      'hungary': 'hu', 'belgium': 'be', 'netherlands': 'nl', 'italy': 'it',
      'azerbaijan': 'az', 'singapore': 'sg', 'united states': 'us', 'mexico': 'mx',
      'brazil': 'br', 'las vegas': 'us', 'qatar': 'qa', 'abu dhabi': 'ae'
    }
    const name = meetingName.toLowerCase()
    for (const [key, code] of Object.entries(countryMap)) {
      if (name.includes(key)) return code
    }
    return 'xx'
  }

  // Format session type for display
  const formatSessionType = (type: string): string => {
    if (!type) return 'N/A'
    if (type.toLowerCase().includes('practice')) return type.replace('Practice', 'FP')
    if (type.toLowerCase() === 'qualifying') return 'Qualifying'
    if (type.toLowerCase() === 'sprint') return 'Sprint'
    if (type.toLowerCase() === 'race') return 'Race'
    return type
  }

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden">

      {/* Stats Cards - Combined Session Info (2 cols) + Weather + Track Status */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 flex-shrink-0">
        {/* Combined Session Info Card - Spans 2 columns */}
        <Card className="bg-neutral-900 border-neutral-700 sm:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* LEFT SIDE: Flag + GP Name + Session Info */}
              <div className="flex items-center gap-3 flex-1">
                {/* Flag */}
                {state.sessionInfo?.Meeting?.Name && (
                  <div className="flex-shrink-0">
                    <div className="w-16 h-12 relative">
                      <Image
                        src={`https://flagcdn.com/w80/${getCountryCode(state.sessionInfo.Meeting.Name)}.png`}
                        alt={state.sessionInfo.Meeting.Name}
                        width={64}
                        height={48}
                        className="object-cover rounded shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* GP Name + Session Info */}
                <div className="flex flex-col flex-1">
                  <h2 className="text-lg font-bold text-white tracking-wide leading-tight">
                    {state.sessionInfo?.Meeting?.Name?.toUpperCase() || 'N/A'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-neutral-400">
                      {formatSessionType(state.sessionInfo?.Type || 'N/A')}
                    </span>
                    {/* Live Indicator */}
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isLive ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'
                      }`} />
                      <span className={`text-xs font-bold ${
                        isLive ? 'text-red-500' : 'text-neutral-600'
                      }`}>
                        {isLive ? 'LIVE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE: Session-specific Info (Laps for Race, Quali stages, or Session type) */}
              <div className="flex flex-col items-center justify-center px-4 border-l border-r border-neutral-700">
                {state.sessionInfo?.Type?.toLowerCase().includes('race') || state.sessionInfo?.Type?.toLowerCase().includes('sprint') ? (
                  // Race/Sprint: Show lap counter
                  <>
                    <p className="text-xs text-neutral-400 tracking-wider mb-1">LAPS</p>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {state.lapCounter?.CurrentLap || 0}<span className="text-neutral-500">/{state.lapCounter?.TotalLaps || 0}</span>
                    </p>
                  </>
                ) : state.sessionInfo?.Type?.toLowerCase().includes('qualifying') ? (
                  // Qualifying: Show Q1/Q2/Q3 stages
                  <>
                    <p className="text-xs text-neutral-400 tracking-wider mb-1">STAGE</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        true ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-400'
                      }`}>Q1</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        false ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-400'
                      }`}>Q2</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        false ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-400'
                      }`}>Q3</span>
                    </div>
                  </>
                ) : (
                  // Practice: Show session type
                  <>
                    <p className="text-xs text-neutral-400 tracking-wider mb-1">SESSION</p>
                    <p className="text-xl font-bold text-white">
                      {formatSessionType(state.sessionInfo?.Type || 'N/A')}
                    </p>
                  </>
                )}
              </div>

              {/* RIGHT SIDE: Countdown Timer */}
              <div className="flex flex-col items-end">
                <p className="text-xs text-neutral-400 tracking-wider mb-1">
                  {isLive ? 'TIME LEFT' : 'STARTS IN'}
                </p>
                <p className="text-2xl font-bold text-orange-500 tabular-nums font-mono">
                  {timeRemaining}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4 flex flex-col justify-center h-full gap-1">
            <div className="text-xs font-bold text-neutral-400 tracking-wider mb-1">WEATHER</div>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-cyan-500 whitespace-nowrap">{state.weather?.AirTemp || "--"}°C</span>
                <Thermometer className="w-6 h-6 text-cyan-500 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-cyan-400 whitespace-nowrap">{state.weather?.Humidity || "--"}%</span>
                <Droplets className="w-6 h-6 text-cyan-400 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-cyan-300 whitespace-nowrap">{state.weather?.WindSpeed || "--"}m/s</span>
                <Wind className="w-6 h-6 text-cyan-300 flex-shrink-0" />
              </div>
            </div>
          </CardContent>
        </Card>        <Card className="bg-neutral-900 border-neutral-700 overflow-hidden relative">
          {/* Gradient background based on track status - increased opacity */}
          <div className={`absolute inset-0 opacity-30 ${
            state.trackStatus?.Status === '1' || !state.trackStatus?.Status ? 'bg-gradient-to-r from-green-500/30 to-transparent' :
            state.trackStatus?.Status === '2' ? 'bg-gradient-to-r from-yellow-500/30 to-transparent' :
            state.trackStatus?.Status === '4' ? 'bg-gradient-to-r from-red-500/30 to-transparent' :
            state.trackStatus?.Status === '5' ? 'bg-gradient-to-r from-blue-500/30 to-transparent' :
            state.trackStatus?.Status === '6' ? 'bg-gradient-to-r from-purple-500/30 to-transparent' :
            'bg-gradient-to-r from-green-500/30 to-transparent'
          }`} />
          
          <CardContent className="p-4 relative z-10 flex flex-col justify-center h-full gap-1">
            <div className="text-xs font-bold text-neutral-400 tracking-wider mb-1">TRACK STATUS</div>
            <div className="flex items-center justify-between">
              {/* Left: Track Temperature */}
              {state.weather?.TrackTemp && (
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-orange-400 whitespace-nowrap">{state.weather.TrackTemp}°C</span>
                  <Thermometer className="w-6 h-6 text-orange-400 flex-shrink-0" />
                </div>
              )}
              
              {/* Right: Track Status */}
              <span className={`text-lg font-bold whitespace-nowrap ${
                state.trackStatus?.Status === '1' || !state.trackStatus?.Status ? 'text-green-500' :
                state.trackStatus?.Status === '2' ? 'text-yellow-500' :
                state.trackStatus?.Status === '4' ? 'text-red-500' :
                state.trackStatus?.Status === '5' ? 'text-blue-500' :
                state.trackStatus?.Status === '6' ? 'text-purple-500' :
                'text-green-500'
              }`}>
                {state.trackStatus?.Status === '1' || !state.trackStatus?.Status ? 'Track Clear' :
                 state.trackStatus?.Status === '2' ? 'Yellow Flag' :
                 state.trackStatus?.Status === '4' ? 'Red Flag' :
                 state.trackStatus?.Status === '5' ? 'Safety Car' :
                 state.trackStatus?.Status === '6' ? 'VSC' :
                 state.trackStatus?.Message || 'Track Clear'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid - Aligned with Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-shrink-0">
        {/* Timing Tower - Takes 3 columns (same as first 3 stats cards) */}
        <Card className="bg-neutral-900 border-neutral-700 overflow-hidden sm:col-span-3 flex flex-col" style={{ height: 'calc(100vh - 178px)' }}>
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            {/* Header Row */}
            <div className="bg-neutral-800/50 border-b border-neutral-700 px-3 py-1.5 flex items-center gap-2 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold flex-shrink-0">
              <div className="w-10 text-center">POS</div>
              <div className="w-12">DRV</div>
              <div className="w-16">GAP</div>
              <div className="w-20 text-center">TYRE</div>
              <div className="w-16 text-center">STATUS</div>
              <div className="w-12 text-center">DRS</div>
              <div className="w-20">LAP TIME</div>
              <div className="flex gap-2">
                <div className="w-28 text-center">S1</div>
                <div className="w-28 text-center">S2</div>
                <div className="w-28 text-center">S3</div>
              </div>
              <div className="w-40 text-center">SPEED</div>
              {/* We'll add more columns here step by step */}
            </div>

            <div className="flex-1 overflow-y-auto timing-scroll">
              {!state.timingLines || state.timingLines.length === 0 ? (
                <div className="p-8 text-center text-neutral-400">
                  <p className="text-2xl mb-2">⏳</p>
                  <p>No timing data available</p>
                  <p className="text-xs mt-2">State has {state.timingLines?.length || 0} timing lines</p>
                </div>
              ) : (
                state.timingLines.map((line: TimingLine, idx: number) => {
                  const driver = state.drivers[line.RacingNumber]
                  const teamColor = driver?.team_colour || driver?.TeamColour || "666666"
                  const currentTyre = getCurrentTyre(line.RacingNumber)
                  const driverTyreData = state.tyreData?.[line.RacingNumber]
                  const totalStints = driverTyreData?.Stints?.length ?? 0
                  const pitStopCount = line.NumberOfPitStops ?? (totalStints > 0 ? Math.max(totalStints - 1, 0) : 0)
                  const drsStatus = driverTyreData?.DRS?.Status ?? 0
                  const statusText = driverTyreData?.StatusText
                  const timingStatsEntry = state.timingStats?.Lines?.[line.RacingNumber]
                  const bestLapTime = timingStatsEntry?.PersonalBestLapTime?.Value
                    || line.BestLapTimes?.[0]?.Value
                    || "---"
                  const lastLapTime = (() => {
                    if (typeof line.LastLapTime === 'string') {
                      return line.LastLapTime
                    }
                    if (line.LastLapTime?.Value) {
                      return line.LastLapTime.Value
                    }
                    const s1 = parseFloat(line.Sectors?.[0]?.Value || "0")
                    const s2 = parseFloat(line.Sectors?.[1]?.Value || "0")
                    const s3 = parseFloat(line.Sectors?.[2]?.Value || "0")
                    const total = s1 + s2 + s3
                    return total > 0 ? total.toFixed(3) : "---"
                  })()
                  const bestSectors = normalizeCollection(timingStatsEntry?.BestSectors || [])

                  // Debug log for first driver to see data structure
                  if (idx === 0) {
                    console.log(`🏁 First driver (${line.RacingNumber}) full data:`, {
                      position: line.Position,
                      racingNumber: line.RacingNumber,
                      driverExists: !!driver,
                      sectors: line.Sectors,
                      speeds: line.Speeds,
                      stats: line.Stats,
                      gapToLeader: line.GapToLeader,
                      intervalToPositionAhead: line.IntervalToPositionAhead
                    })
                  }

                return (
                  <div
                    key={line.RacingNumber}
                    className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors px-3 py-2"
                    style={{ borderLeft: `4px solid #${teamColor}` }}
                  >
                    {/* Single Row Layout - Compact */}
                    <div className="flex items-center gap-2">
                      {/* Position */}
                      <div className="text-3xl font-bold text-white w-10 text-center flex-shrink-0">
                        {line.Position}
                      </div>

                      {/* Driver Badge */}
                      <div
                        className="px-2 py-1 rounded font-bold text-sm flex-shrink-0 w-12 text-center"
                        style={{ backgroundColor: `#${teamColor}`, color: '#000' }}
                      >
                        {driver?.name_acronym || driver?.Tla || line.RacingNumber}
                      </div>

                      {/* Gap/Interval - Left Aligned */}
                      <div className="flex flex-col items-start justify-center w-16 flex-shrink-0">
                        {idx === 0 ? (
                          <div className="text-xs font-mono text-white font-bold">LEAD</div>
                        ) : (
                          <>
                            {/* Interval to car ahead */}
                            <div className="text-sm font-mono text-white font-bold leading-none">
                              {(() => {
                                // Try multiple possible locations for interval data
                                const gapToLeader = line.GapToLeader
                                const intervalValue = typeof gapToLeader === 'string' ? gapToLeader : gapToLeader?.Value
                                const interval = intervalValue ||
                                               line.IntervalToPositionAhead?.Value ||
                                               line.Stats?.[0]?.TimeDifftoPositionAhead ||
                                               line.Stats?.[1]?.TimeDifftoPositionAhead ||
                                               "---"
                                return interval
                              })()}
                            </div>
                            {/* Gap to leader */}
                            <div className="text-[10px] font-mono text-neutral-500 leading-none mt-0.5">
                              {(() => {
                                const gapToLeader = line.GapToLeader
                                const gapValue = typeof gapToLeader === 'object' ? gapToLeader?.Value : null
                                const gap = gapValue ||
                                           line.Stats?.[0]?.TimeDiffToFastest ||
                                           line.Stats?.[1]?.TimeDiffToFastest ||
                                           "---"
                                return gap
                              })()}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Tire Section - Compact */}
                      <div className="flex items-center gap-1 w-20 flex-shrink-0">
                        {currentTyre ? (
                          <>
                            {/* Circular tire icon */}
                            <div className="relative flex-shrink-0">
                              <Image
                                src={getTyreImage(currentTyre.compound)}
                                alt={currentTyre.compound}
                                width={24}
                                height={24}
                                className="opacity-90"
                              />
                            </div>
                            
                            {/* Pit stops and laps count */}
                            <div className="flex flex-col items-start leading-none">
                              <div className="text-[10px] text-white font-bold">
                                {pitStopCount}PIT
                              </div>
                              <div className="text-[10px] text-white font-bold mt-0.5">
                                {currentTyre.laps}LAP
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-neutral-600">---</div>
                        )}
                      </div>

                      {/* STATUS Indicator (PIT/OUT/KO) */}
                      <div className="w-16 flex items-center justify-center flex-shrink-0">
                        {(() => {
                          if (line.InPit) {
                            return (
                              <div className="px-2 py-1.5 rounded border border-cyan-500 font-bold text-[10px] text-cyan-500 bg-cyan-500/10">
                                PIT
                              </div>
                            )
                          }
                          if (line.PitOut) {
                            return (
                              <div className="px-2 py-1.5 rounded border border-red-500 font-bold text-[10px] text-red-500 bg-red-500/10">
                                OUT
                              </div>
                            )
                          }
                          if (line.KnockedOut || line.Stopped || line.Retired) {
                            return (
                              <div className="px-2 py-1.5 rounded border border-neutral-600 font-bold text-[10px] text-neutral-600 bg-neutral-600/10">
                                KO
                              </div>
                            )
                          }
                          if (statusText) {
                            return (
                              <div className="px-2 py-1.5 rounded border border-neutral-700 font-bold text-[10px] text-neutral-400 bg-neutral-800/50">
                                {statusText.toUpperCase()}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>

                      {/* DRS Indicator */}
                      <div className="w-12 flex items-center justify-center flex-shrink-0">
                        {(() => {
                          const isDrsAvailable = drsStatus >= 1
                          const drsIsOpen = drsStatus === 2
                          const drsLabel = drsIsOpen ? 'OPEN' : isDrsAvailable ? 'READY' : 'DRS'
                          return (
                            <div 
                              className={`px-2 py-1.5 rounded border font-bold text-[10px] ${
                                drsIsOpen
                                  ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                                  : isDrsAvailable 
                                    ? 'border-green-500 text-green-500 bg-green-500/10' 
                                    : 'border-neutral-700 text-neutral-700 bg-neutral-700/10'
                              }`}
                            >
                              {drsLabel}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Lap Time - Best on top, Last on bottom */}
                      <div className="flex flex-col items-start justify-center w-20 flex-shrink-0">
                        {/* Best Lap Time */}
                        <div className="text-sm font-mono text-white font-bold leading-none">
                          {bestLapTime}
                        </div>
                        {/* Last Lap Time */}
                        <div className="text-[10px] font-mono text-neutral-500 leading-none mt-0.5">
                          {lastLapTime}
                        </div>
                      </div>

                      {/* Sector Times - S1, S2, S3 with track segment indicators */}
                      <div className="flex gap-2">
                        {[0, 1, 2].map((sectorIdx) => {
                          const sector = line.Sectors?.[sectorIdx]
                          const bestSectorValue = bestSectors?.[sectorIdx]?.Value
                            || (sector as any)?.BestLapTime?.Value
                            || (sector as any)?.BestTime?.Value
                            || (sector as any)?.PersonalBest?.Value
                          const currentSectorValue = sector?.Value || "---"
                          
                          // Debug log for first driver
                          if (idx === 0 && sectorIdx === 0) {
                            console.log(`🏁 Sector data for driver ${line.RacingNumber}:`, {
                              sectors: line.Sectors,
                              sector0: line.Sectors?.[0],
                              hasSegments: !!sector?.Segments,
                              segmentCount: sector?.Segments?.length
                            })
                          }
                          
                          return (
                            <div key={sectorIdx} className="flex flex-col items-start w-28 flex-shrink-0">
                              {/* Track segments indicator bar */}
                              <div className="w-full h-2 flex gap-0.5 mb-2">
                                {sector?.Segments && sector.Segments.length > 0 ? (
                                  sector.Segments.map((segment, segIdx) => {
                                    const segStatus = typeof segment === 'number' ? segment : segment.Status
                                    const segColor = getSectorColor(segStatus)
                                    return (
                                      <div
                                        key={segIdx}
                                        className="flex-1 h-full rounded-sm"
                                        style={{ backgroundColor: segColor }}
                                      />
                                    )
                                  })
                                ) : (
                                  <div className="w-full h-full rounded-full bg-neutral-700" />
                                )}
                              </div>
                              
                              {/* Best and Current times side by side */}
                              <div className="flex items-baseline gap-2">
                                {/* Best sector time (larger) */}
                                <div 
                                  className="text-base font-mono font-bold leading-none"
                                  style={{ color: getSectorColor(sector?.Status || 0) }}
                                >
                                  {bestSectorValue || "---"}
                                </div>
                                <div className="text-[10px] font-mono text-neutral-500 leading-none">
                                  {currentSectorValue}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Speed - I1, I2, FL with horizontal visualization bars */}
                      <div className="w-40 flex flex-col justify-center flex-shrink-0">
                        {(() => {
                          // Get all speeds and find max for scaling
                          const speeds = [
                            { label: 'I1', value: parseFloat(line.Speeds?.I1?.Value || '0') },
                            { label: 'I2', value: parseFloat(line.Speeds?.I2?.Value || '0') },
                            { label: 'FL', value: parseFloat(line.Speeds?.FL?.Value || '0') }
                          ]
                          const telemetryChannels = state.carData?.Entries?.[line.RacingNumber]?.Channels
                          const liveSpeed = telemetryChannels?.["2"]?.length
                            ? telemetryChannels["2"][telemetryChannels["2"].length - 1]
                            : 0

                          if (typeof liveSpeed === 'number' && liveSpeed > 0) {
                            const finishLineIndex = speeds.findIndex((entry) => entry.label === 'FL')
                            if (finishLineIndex >= 0 && speeds[finishLineIndex].value <= 0) {
                              speeds[finishLineIndex] = { ...speeds[finishLineIndex], value: liveSpeed }
                            }
                          }
                          const maxSpeed = Math.max(...speeds.map(s => s.value), 1)
                          
                          return speeds.map((speed, idx) => {
                            const percentage = maxSpeed > 0 ? (speed.value / maxSpeed) * 100 : 0
                            // Color gradient: red (slow) -> yellow (medium) -> green (fast)
                            let barColor = '#525252' // gray for no data
                            if (speed.value > 0) {
                              if (percentage >= 90) barColor = '#22C55E' // green - fastest
                              else if (percentage >= 70) barColor = '#FACC15' // yellow - medium
                              else if (percentage >= 50) barColor = '#FB923C' // orange - slower
                              else barColor = '#EF4444' // red - slowest
                            }
                            
                            return (
                              <div key={idx} className="flex items-center gap-1 leading-none">
                                {/* Speed label - smaller */}
                                <div className="text-[9px] text-neutral-400 w-4 font-bold">{speed.label}</div>
                                
                                {/* Horizontal visualization bar - thinner */}
                                <div className="flex-1 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full transition-all duration-300"
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: barColor
                                    }}
                                  />
                                </div>
                                
                                {/* Speed value */}
                                <div className="text-[9px] font-mono text-white font-bold w-7 text-right">
                                  {speed.value > 0 ? speed.value.toFixed(0) : '---'}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>

                      {/* We'll add more data here step by step */}
                    </div>
                  </div>
                )
              })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Race Control + Team Radio */}
        <div className="sm:col-span-1 flex flex-col gap-3" style={{ height: 'calc(100vh - 178px)' }}>
          {/* Race Control - Takes about 65% */}
          <Card className="bg-neutral-900 border-neutral-700 overflow-hidden flex flex-col" style={{ flex: '0 0 65%' }}>
            <CardHeader className="px-3 py-2 border-b border-neutral-800 flex-shrink-0">
              <CardTitle className="text-[10px] font-bold text-neutral-400 tracking-wider">
                RACE CONTROL
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto timing-scroll">
              {state.raceControl.length > 0 ? (
                <div className="py-2 px-3">
                  {[...state.raceControl].reverse().map((msg: RaceControlMessage, idx: number) => {
                    // Determine icon and color based on message type
                    const getMessageIcon = () => {
                      const message = msg.Message?.toLowerCase() || ''
                      const flag = msg.Flag?.toLowerCase() || ''
                      
                      if (flag === 'yellow' || message.includes('yellow')) {
                        return { icon: AlertTriangle, color: 'text-yellow-500' }
                      } else if (flag === 'green' || message.includes('green') || message.includes('clear')) {
                        return { icon: Flag, color: 'text-green-500' }
                      } else if (flag === 'red' || message.includes('red flag')) {
                        return { icon: AlertTriangle, color: 'text-red-500' }
                      } else if (message.includes('rain') || msg.Category === 'Weather') {
                        return { icon: CloudRain, color: 'text-blue-400' }
                      } else if (message.includes('drs')) {
                        return { icon: Zap, color: 'text-purple-500' }
                      } else {
                        return { icon: Info, color: 'text-neutral-400' }
                      }
                    }
                    
                    const { icon: IconComponent, color } = getMessageIcon()
                    
                    return (
                      <div key={idx} className="relative pl-7 pb-3 last:pb-1">
                        {/* Timeline line */}
                        {idx !== state.raceControl.length - 1 && (
                          <div className="absolute left-[11px] top-5 bottom-0 w-px bg-neutral-800" />
                        )}
                        
                        {/* Icon */}
                        <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center ${color}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        
                        {/* Content */}
                        <div className="space-y-1">
                          {/* Header with flag badge and time */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {msg.Flag && (
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] px-1.5 py-0 h-4 font-bold ${
                                  msg.Flag === 'YELLOW' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                                  msg.Flag === 'GREEN' ? 'border-green-500 text-green-500 bg-green-500/10' :
                                  msg.Flag === 'RED' ? 'border-red-500 text-red-500 bg-red-500/10' :
                                  msg.Flag === 'BLUE' ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                                  'border-neutral-600 text-neutral-400 bg-neutral-800/50'
                                }`}
                              >
                                {msg.Flag}
                              </Badge>
                            )}
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {new Date(msg.Utc).toLocaleTimeString('en-US', { 
                                hour12: true, 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                            {msg.Lap && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-neutral-600 text-neutral-400">
                                {msg.Lap} Lap
                              </Badge>
                            )}
                          </div>
                          
                          {/* Message */}
                          <div className="bg-neutral-800/30 rounded px-2 py-1.5">
                            <p className="text-xs text-neutral-200 leading-tight uppercase tracking-wide">
                              {msg.Message}
                            </p>
                            {msg.Sector && (
                              <p className="text-[10px] text-neutral-500 mt-0.5">
                                Sector: {msg.Sector}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-600">
                  <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No race control messages</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Radio - Takes remaining height (~188px) */}
        <Card className="bg-neutral-900 border-neutral-700 overflow-hidden flex flex-col flex-1">
          <CardHeader className="px-3 py-2 border-b border-neutral-800 flex-shrink-0">
            <CardTitle className="text-[10px] font-bold text-neutral-400 tracking-wider">
              TEAM RADIO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto timing-scroll">
              {state.teamRadio.length > 0 ? (
                <div className="divide-y divide-neutral-800">
                  {state.teamRadio.map((radio: TeamRadioMessage, idx: number) => {
                    const driver = state.drivers[radio.RacingNumber]
                    const teamColor = driver?.team_colour || driver?.TeamColour || "666666"
                    const sourcePath = typeof radio.Path === 'string' ? radio.Path : (typeof radio.Url === 'string' ? radio.Url : undefined)
                    const audioSrc = getTeamRadioSrc(sourcePath)
                    return (
                      <div key={idx} className="p-2 hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-start gap-2">
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0"
                            style={{ backgroundColor: `#${teamColor}` }}
                          >
                            {driver?.name_acronym?.[0] || driver?.Tla?.[0] || radio.RacingNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[9px] font-bold text-white">
                                {driver?.name_acronym || driver?.Tla || `#${radio.RacingNumber}`}
                              </span>
                              <span className="text-[8px] text-neutral-500 font-mono">
                                {new Date(radio.Utc).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-[9px] text-neutral-300 leading-relaxed mb-1">
                              "{radio.Message}"
                            </p>
                            {audioSrc && (
                              <audio 
                                controls 
                                preload="none"
                                crossOrigin="anonymous"
                                className="w-full h-5 mt-1"
                                style={{ 
                                  backgroundColor: '#171717',
                                  borderRadius: '3px',
                                  maxHeight: '20px'
                                }}
                              >
                                <source src={audioSrc} type="audio/mpeg" />
                              </audio>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-neutral-600">
                  <p className="text-[10px]">No radio messages</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

    </div>
  )
}

function LiveTimingSkeleton() {
  return (
    <div className="h-full bg-black">
      <div className="mb-6">
        <Skeleton className="h-8 w-64 bg-neutral-800 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-700">
              <CardContent className="p-3">
                <Skeleton className="h-16 bg-neutral-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
        <Skeleton className="h-[calc(100vh-280px)] bg-neutral-800 rounded-lg" />
        <Skeleton className="h-[calc(100vh-280px)] bg-neutral-800 rounded-lg" />
      </div>
    </div>
  )
}
