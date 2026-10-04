"use client"

import { useEffect, useReducer, useRef, useCallback, useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Flag, Zap, Thermometer, Droplets, Wind, CloudRain, Info, AlertTriangle, Gauge, Settings2, Activity, ChevronsUp, Octagon } from "lucide-react"
import { useSSELiveData } from "@/hooks/use-sse-live-data"

// Use relative URLs so Next.js rewrites can proxy to backend
const API_BASE_URL = ""

type JsonRecord = Record<string, unknown>

const mergeValues = (targetValue: unknown, sourceValue: unknown): unknown => {
  if (Array.isArray(sourceValue)) {
    return [...sourceValue]
  }

  if (sourceValue === null || typeof sourceValue !== "object") {
    return sourceValue
  }

  const base = targetValue && typeof targetValue === "object" && !Array.isArray(targetValue)
    ? (targetValue as JsonRecord)
    : {}

  const result: JsonRecord = { ...base }
  for (const [key, value] of Object.entries(sourceValue as JsonRecord)) {
    result[key] = mergeValues(result[key], value)
  }

  return result
}

const deepMerge = (target: JsonRecord, source: unknown): JsonRecord => {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return target
  }

  const result: JsonRecord = { ...target }
  for (const [key, value] of Object.entries(source as JsonRecord)) {
    result[key] = mergeValues(result[key], value)
  }

  return result
}

// F1 color coding for sectors (Official F1 Standards)
const SECTOR_STATUS_COLORS: { [key: number]: string } = {
  0: "#525252",       // No time - gray
  2048: "#0082fa",    // Blue - normal time
  2064: "#00d200",    // Green - personal best
  2068: "#f5d500",    // Yellow - slower than PB / average
  2049: "#00d200",    // Green - improvement
  2051: "#b108ff",    // Purple - overall fastest
}

// Helper function to get sector color
const getSectorColor = (status: number): string => {
  return SECTOR_STATUS_COLORS[status] || "#0082fa" // Default to blue
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
    BestLapTime?: { Value?: string }
    BestTime?: { Value?: string }
    PersonalBest?: { Value?: string }
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

type TimingAppStint = {
  Compound: string
  New: string
  TotalLaps: number
  StartLaps?: number
} & JsonRecord

interface TimingAppLine {
  Stints?: TimingAppStint[]
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
  Meeting?: { 
    Name?: string
    Location?: string
    Country?: { Name?: string; Code?: string }
  }
  Type?: string
  status?: string
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
  sessionStatus: string | null  // "Started", "Finished", "Finalised", "Ends"
  trackStatus: TrackStatus | null
  weather: WeatherData | null
  positions: PositionData | null
  carData: CarData | null
  teamRadio: TeamRadioMessage[]
  timingStats: TimingStats | null
  lapCounter: {CurrentLap: number; TotalLaps: number} | null
  qualifyingPart: number | null
  loading: boolean
  lastUpdateTime: number
}

type LiveDataAction =
  | { type: 'SET_INITIAL_DATA'; payload: Partial<LiveDataState> }
  | { type: 'UPDATE_FROM_WEBSOCKET'; payload: JsonRecord }
  | { type: 'RESET_SESSION' }
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

const isPlainObject = (value: unknown): value is JsonRecord => {
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

const normalizeCollection = (value: unknown): unknown[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (isPlainObject(value)) {
    return sortKeys(Object.keys(value)).map((key) => value[key])
  }
  return []
}
 
type SegmentEntry = JsonRecord | number

const normalizeSegments = (segments: unknown): SegmentEntry[] => {
  return normalizeCollection(segments).reduce<SegmentEntry[]>((acc, entry) => {
    if (typeof entry === "number") {
      acc.push(entry)
    } else if (isPlainObject(entry)) {
      acc.push(entry)
    }
    return acc
  }, [])
}

type SectorEntry = JsonRecord | null

const normalizeSectors = (sectors: unknown): SectorEntry[] => {
  if (!sectors) return []

  const rawSectors = normalizeCollection(sectors).map((sector) => {
    if (!isPlainObject(sector)) {
      return null
    }
    const normalized: JsonRecord = { ...sector }
    const segments = normalizeSegments(normalized["Segments"])
    if (segments.length > 0) {
      normalized["Segments"] = segments
    }
    return normalized
  })

  if (rawSectors.length > 0) {
    return [0, 1, 2].map((idx) => rawSectors[idx] ?? null)
  }

  if (isPlainObject(sectors)) {
    return ["0", "1", "2"].map((key) => {
      const value = sectors[key]
      if (!isPlainObject(value)) {
        return null
      }
      const normalized: JsonRecord = { ...value }
      const segments = normalizeSegments(normalized["Segments"])
      if (segments.length > 0) {
        normalized["Segments"] = segments
      }
      return normalized
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

const toRecord = (value: unknown): JsonRecord | undefined => {
  return isPlainObject(value) ? (value as JsonRecord) : undefined
}

const extractValueString = (input: unknown): string | undefined => {
  if (typeof input === "string") {
    return input
  }
  if (isPlainObject(input)) {
    const value = input["Value"]
    return typeof value === "string" ? value : undefined
  }
  return undefined
}

const normalizeTimingLine = (driverNumber: string, rawLine: unknown): TimingLine => {
  const lineData = (isPlainObject(rawLine) ? rawLine : {}) as Partial<TimingLine> & JsonRecord
  const normalizedSectors = normalizeSectors(lineData.Sectors)
  const bestLapTimes = normalizeCollection(lineData.BestLapTimes) as TimingLine["BestLapTimes"]
  const stats = normalizeCollection(lineData.Stats) as TimingLine["Stats"]
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

const mergeTimingLines = (existing: TimingLine[], incomingTiming: unknown): TimingLine[] => {
  if (!incomingTiming && existing.length === 0) {
    return []
  }

  const existingMap = existing.reduce<JsonRecord>((acc, line) => {
    if (!line?.RacingNumber) {
      return acc
    }
    acc[line.RacingNumber] = line as unknown as JsonRecord
    return acc
  }, {})

  const merged = deepMerge({ Lines: existingMap } as JsonRecord, incomingTiming || {})
  const linesObjectCandidate = merged["Lines"]
  const linesObject = isPlainObject(linesObjectCandidate) ? linesObjectCandidate : {}

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

const normalizeTimingAppDriverData = (driverData: unknown): TimingAppLine => {
  const source = (isPlainObject(driverData) ? driverData : {}) as JsonRecord
  const stints = normalizeCollection(source.Stints).map((entry) => {
    const stintRecord = (isPlainObject(entry) ? entry : {}) as JsonRecord
    const totalLaps = asNumber(stintRecord.TotalLaps) ?? 0
    const startLaps = asNumber(stintRecord.StartLaps)
    const compound = (stintRecord.Compound as string | undefined) || "UNKNOWN"
    const newFlag = stintRecord.New
    const isNew = typeof newFlag === "boolean" ? String(newFlag) : (newFlag as string | undefined) ?? "false"

    const normalizedStint: TimingAppStint = {
      ...stintRecord,
      Compound: compound,
      New: isNew,
      TotalLaps: totalLaps,
      StartLaps: startLaps
    }

    return normalizedStint
  })

  const drsRaw = isPlainObject(source.DRS) ? (source.DRS as JsonRecord) : undefined
  const drsStatus = asNumber(drsRaw?.Status)

  return {
    ...source,
    Stints: stints,
    DRS: drsRaw ? { Status: drsStatus ?? 0 } : undefined,
    StatusText: source.StatusText as string | undefined,
    GridPos: source.GridPos as string | undefined
  }
}

const sanitizeTimingAppLines = (timingAppData: unknown): Record<string, TimingAppLine> => {
  if (!timingAppData) return {}

  const collectionSource = (isPlainObject(timingAppData) ? timingAppData : {}) as JsonRecord
  const linesCandidate = collectionSource.Lines ?? timingAppData
  const lines = isPlainObject(linesCandidate) ? linesCandidate : {}

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

    case 'RESET_SESSION':
      return { ...initialState, drivers: state.drivers }
    
    case 'UPDATE_FROM_WEBSOCKET': {
      const data = action.payload

      // CRITICAL: Always create updates object to ensure state changes
      const updates: Partial<LiveDataState> = {}

      const sessionData = toRecord(data.session)
      const timingData = toRecord(data.timing)
      const lapCountData = toRecord(data.lap_count)
      const timingAppData = toRecord(data.timing_app_data)
      const weatherData = toRecord(data.weather)
      const trackStatusData = toRecord(data.track_status)
      const timingStatsData = toRecord(data.timing_stats)
      const positionsData = toRecord(data.positions)
      const carData = toRecord(data.car_data)
      const driversData = toRecord(data.drivers)

      if (sessionData) {
        const partialSession = sessionData as Partial<SessionInfo> & { Meeting?: unknown }
        const meetingData = toRecord(partialSession.Meeting)
        const sessionInfo: Partial<SessionInfo> = {
          ...(state.sessionInfo ?? {}),
          ...partialSession,
          Meeting: meetingData
            ? {
                ...(state.sessionInfo?.Meeting ?? {}),
                ...meetingData
              }
            : state.sessionInfo?.Meeting
        }
        updates.sessionInfo = sessionInfo as SessionInfo
      }

      if (timingData) {
        const mergedTimingLines = mergeTimingLines(state.timingLines, timingData)
        updates.timingLines = mergedTimingLines
        const qualifyingPart = asNumber(
          timingData.SessionPart ?? timingData.SessionPartNumber ?? timingData.QualifyingPart
        )
        if (qualifyingPart && qualifyingPart >= 1 && qualifyingPart <= 3) {
          updates.qualifyingPart = qualifyingPart
        }
      }

      if (lapCountData) {
        const currentLap = asNumber(lapCountData["CurrentLap"]) ?? state.lapCounter?.CurrentLap ?? 0
        const totalLaps = asNumber(lapCountData["TotalLaps"]) ?? state.lapCounter?.TotalLaps ?? 0
        updates.lapCounter = { CurrentLap: currentLap, TotalLaps: totalLaps }
      }

      if (timingAppData) {
        const timingAppLines = sanitizeTimingAppLines(timingAppData)
        if (Object.keys(timingAppLines).length > 0) {
          updates.tyreData = { ...state.tyreData, ...timingAppLines }
        }
      }

      if (weatherData) {
        updates.weather = {
          ...(state.weather ?? {}),
          ...weatherData
        } as WeatherData
      }

      if (trackStatusData) {
        updates.trackStatus = {
          ...(state.trackStatus ?? {}),
          ...trackStatusData
        } as TrackStatus
      }

      if (timingStatsData) {
        const mergedStats = deepMerge((state.timingStats as JsonRecord | undefined) ?? {}, timingStatsData)
        updates.timingStats = mergedStats as TimingStats
      }

      // CRITICAL: Process session_status to determine if session is live
      const sessionStatusData = toRecord(data.session_status)
      if (sessionStatusData) {
        const statusValue = sessionStatusData.Status as string
        if (statusValue) {
          updates.sessionStatus = statusValue
        }
      }

      if (Array.isArray(data.race_control)) {
        updates.raceControl = data.race_control.slice(-20)
      }

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

      if (positionsData) {
        updates.positions = {
          ...(state.positions ?? {}),
          ...positionsData
        } as PositionData
      }

      if (carData) {
        updates.carData = {
          ...(state.carData ?? {}),
          ...carData
        } as CarData
      }

      if (driversData) {
        const driversMap: { [key: string]: Driver } = {}
        Object.entries(driversData).forEach(([key, value]) => {
          if (key.startsWith('_') || !value) return
          driversMap[key] = value as Driver
        })
        updates.drivers = { ...state.drivers, ...driversMap }
      }

      // CRITICAL FIX: Always create a new state object, even if updates are empty
      // This ensures React detects changes even when only nested values change
      // Always update lastUpdateTime to force React re-render
      const currentTime = Date.now()
      const newState = { 
        ...state, 
        ...updates, 
        loading: false,
        lastUpdateTime: currentTime,
      }
      
      return newState
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
  sessionStatus: null,
  trackStatus: null,
  weather: null,
  positions: null,
  carData: null,
  teamRadio: [],
  timingStats: null,
  lapCounter: null,
  qualifyingPart: null,
  loading: true,
  lastUpdateTime: 0
}

import React from "react"

export const LiveTimingF1 = React.memo(function LiveTimingF1() {
  const [state, dispatch] = useReducer(liveDataReducer, initialState)
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null)
  const expandedRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expandedDriver && expandedRowRef.current) {
      setTimeout(() => {
        expandedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [expandedDriver])

  const renderCountRef = useRef(0)
  renderCountRef.current++

  // Log render count in development only
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[LiveTimingF1 RENDER #${renderCountRef.current}]`,
      `Drivers: ${state.timingLines.length}`,
      `Lap: ${state.lapCounter?.CurrentLap ?? '?'}/${state.lapCounter?.TotalLaps ?? '?'}`
    )
  }

  // SSE callback — fires for EVERY update, bypassing React batching issues
  // This is the f1-dash pattern: direct callback instead of useEffect on state
  const onSSEUpdate = useCallback((updateData: Record<string, unknown>) => {
    if (!updateData) return
    if (updateData.session_reset) {
      dispatch({ type: 'RESET_SESSION' })
      return
    }
    // Single dispatch: the reducer already sets loading=false in UPDATE_FROM_WEBSOCKET.
    // Two dispatches caused two render cycles per SSE message — contributing to stutter.
    dispatch({ type: 'UPDATE_FROM_WEBSOCKET', payload: updateData })
  }, [])

  // SSE connection for real-time updates
  const { connected: sseConnected, error: sseError } = useSSELiveData(onSSEUpdate)

  // Handle SSE errors
  useEffect(() => {
    if (sseError) {
      console.warn('SSE connection error:', sseError)
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
        .catch(err => console.warn('Failed to fetch drivers:', err))
    }
  }, [state.drivers])



  // Helper functions for rendering
  const getTyreImage = (compound: string): string => {
    const compoundLower = compound?.toLowerCase() || "unknown"
    return `/image Resource/Tires/${compoundLower}.svg`
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


  if (state.loading) {
    return <LiveTimingSkeleton />
  }

  // F1 SessionStatus.Status: "Started" = live, "Finished"/"Finalised"/"Ends" = ended
  const isLive = state.sessionStatus === "Started" || (state.timingLines.length > 0 && state.sessionStatus !== "Finished" && state.sessionStatus !== "Finalised" && state.sessionStatus !== "Ends" && state.sessionStatus !== null)
  const liveIndicator = !sseConnected ? 'RECONNECTING' : isLive ? 'LIVE' : 'WAITING'
  const qualifyingPart = state.qualifyingPart ?? 1

  const DEFAULT_FLAG_CODE = "un"

  // Helper function to get country code from meeting name
  const getCountryCode = (meetingName: string): string => {
    const countryMap: { [key: string]: string } = {
      'bahrain': 'bh', 'saudi arabia': 'sa', 'australia': 'au', 'japan': 'jp',
      'china': 'cn', 'miami': 'us', 'emilia romagna': 'it', 'monaco': 'mc',
      'canada': 'ca', 'spain': 'es', 'austria': 'at', 'great britain': 'gb',
      'hungary': 'hu', 'belgium': 'be', 'netherlands': 'nl', 'italy': 'it',
      'azerbaijan': 'az', 'singapore': 'sg', 'united states': 'us', 'mexico': 'mx',
      'brazil': 'br', 'las vegas': 'us', 'qatar': 'qa', 'abu dhabi': 'ae',
      'san marino': 'sm', 'portugal': 'pt', 'france': 'fr', 'germany': 'de',
      'south africa': 'za', 'argentina': 'ar', 'turkey': 'tr'
    }
    const name = meetingName.toLowerCase()
    for (const [key, code] of Object.entries(countryMap)) {
      if (name.includes(key)) return code
    }
    return DEFAULT_FLAG_CODE
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

      {/* Stats Cards - Combined Session Info (2 cols) + Track Status (1 col) + Weather (2 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3 flex-shrink-0">
        {/* Combined Session Info & Track Status Card - Spans 3 columns */}
        <Card className="bg-neutral-900 border-neutral-700 sm:col-span-3 flex flex-col relative overflow-hidden">
          {/* Track Status Gradient on the right side */}
          <div className={`absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none ${
            state.trackStatus?.Status === '1' || !state.trackStatus?.Status ? 'bg-gradient-to-l from-green-500/40 to-transparent' :
            state.trackStatus?.Status === '2' ? 'bg-gradient-to-l from-yellow-500/40 to-transparent' :
            state.trackStatus?.Status === '4' ? 'bg-gradient-to-l from-red-500/40 to-transparent' :
            state.trackStatus?.Status === '5' ? 'bg-gradient-to-l from-blue-500/40 to-transparent' :
            state.trackStatus?.Status === '6' ? 'bg-gradient-to-l from-purple-500/40 to-transparent' :
            'bg-gradient-to-l from-green-500/40 to-transparent'
          }`} />

          <CardContent className="px-3 py-1.5 flex-1 relative z-10">
            <div className="flex items-center gap-6 h-full">
              {/* LEFT SIDE: Flag + GP Name + Session Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Flag */}
                {state.sessionInfo?.Meeting?.Name && (
                  <div className="flex-shrink-0">
                    <div className="w-[64px] h-[48px] relative">
                      <Image
                        src={`https://flagcdn.com/w80/${getCountryCode(state.sessionInfo.Meeting.Name)}.png`}
                        alt={state.sessionInfo.Meeting.Name}
                        width={64}
                        height={48}
                        className="object-cover rounded shadow-md w-full h-full"
                        onError={(e) => {
                          const element = e.currentTarget
                          if (element.src.endsWith(`${DEFAULT_FLAG_CODE}.png`)) {
                            element.style.display = 'none'
                            return
                          }
                          element.src = `https://flagcdn.com/w80/${DEFAULT_FLAG_CODE}.png`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* GP Name + Session Info */}
                <div className="flex flex-col flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white tracking-wide leading-tight truncate uppercase">
                    {state.sessionInfo?.Meeting?.Name || 'N/A'}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-neutral-400">
                      {formatSessionType(state.sessionInfo?.Type || 'N/A')}
                    </span>
                    {/* Live Indicator */}
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isLive ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'
                      }`} />
                      <span className={`text-[10px] font-bold ${
                        isLive ? 'text-red-500' : 'text-neutral-600'
                      }`}>
                        {liveIndicator}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE: Session-specific Info (Laps / Stage) */}
              <div className="flex flex-col items-end justify-center flex-shrink-0">
                {state.sessionInfo?.Type?.toLowerCase().includes('race') || state.sessionInfo?.Type?.toLowerCase().includes('sprint') ? (
                  // Race/Sprint: Show lap counter
                  <>
                    <p className="text-[10px] text-neutral-400 tracking-wider mb-0.5">LAPS</p>
                    <p className="text-2xl font-bold text-white tabular-nums leading-none">
                      {state.lapCounter?.CurrentLap || 0}<span className="text-neutral-500">/{state.lapCounter?.TotalLaps || 0}</span>
                    </p>
                  </>
                ) : state.sessionInfo?.Type?.toLowerCase().includes('qualifying') ? (
                  // Qualifying: Show Q1/Q2/Q3 stages
                  <>
                    <p className="text-[10px] text-neutral-400 tracking-wider mb-1">STAGE</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        qualifyingPart === 1 ? 'bg-[#00d200] text-neutral-900' : 'bg-neutral-700 text-neutral-400'
                      }`}>Q1</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        qualifyingPart === 2 ? 'bg-[#00d200] text-neutral-900' : 'bg-neutral-700 text-neutral-400'
                      }`}>Q2</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        qualifyingPart === 3 ? 'bg-[#00d200] text-neutral-900' : 'bg-neutral-700 text-neutral-400'
                      }`}>Q3</span>
                    </div>
                  </>
                ) : (
                  // Practice: Show session type
                  <>
                    <p className="text-[10px] text-neutral-400 tracking-wider mb-0.5">SESSION</p>
                    <p className="text-xl font-bold text-white leading-none">
                      {formatSessionType(state.sessionInfo?.Type || 'N/A')}
                    </p>
                  </>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="hidden sm:block w-px h-10 bg-neutral-800 mx-1"></div>

              {/* RIGHT SIDE: Track Status */}
              <div className="flex flex-col justify-center flex-shrink-0 min-w-[140px]">
                <div className="text-[10px] font-bold text-neutral-400 tracking-wider mb-1">TRACK STATUS</div>
                <span className={`text-xl font-bold whitespace-nowrap leading-none ${
                  state.trackStatus?.Status === '1' || !state.trackStatus?.Status ? 'text-[#00d200]' :
                  state.trackStatus?.Status === '2' ? 'text-[#f5d500]' :
                  state.trackStatus?.Status === '4' ? 'text-[#e10600]' :
                  state.trackStatus?.Status === '5' ? 'text-[#0082fa]' :
                  state.trackStatus?.Status === '6' ? 'text-[#b108ff]' :
                  'text-[#00d200]'
                }`}>
                  {state.trackStatus?.Status === '1' || !state.trackStatus?.Status ? 'Track Clear' :
                   state.trackStatus?.Status === '2' ? 'Yellow Flag' :
                   state.trackStatus?.Status === '4' ? 'Red Flag' :
                   state.trackStatus?.Status === '5' ? 'Safety Car' :
                   state.trackStatus?.Status === '6' ? 'VSC' :
                   state.trackStatus?.Message || 'Track Clear'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Weather Card - Spans 2 columns */}
        <Card className="bg-neutral-900 border-neutral-700 overflow-hidden sm:col-span-2 flex flex-col">
          <CardHeader className="bg-neutral-800/50 border-b border-neutral-700 px-3 py-1.5 flex flex-row items-center justify-start flex-shrink-0 rounded-t-xl">
            <CardTitle className="text-xs font-formula1 text-neutral-400 tracking-widest leading-[16px]">
              WEATHER
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between px-3 py-1.5 w-full">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Air</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.AirTemp || "--"}°C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Track</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.TrackTemp || "--"}°C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Humidity</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.Humidity || "--"}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Pressure</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.Pressure || "--"} mbar</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Rainfall</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.Rainfall || "0"} mm</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Wind</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.WindSpeed || "--"} km/h</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#a0a0a0] font-medium mb-0.5">Direction</span>
                <span className="text-[15px] font-medium text-white">{state.weather?.WindDirection || "--"}°</span>
              </div>
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
            <div
              className="bg-neutral-800/50 border-b border-neutral-700 px-3 py-1.5 items-center text-xs text-neutral-400 uppercase tracking-wider font-bold flex-shrink-0"
              style={{ display: 'grid', gridTemplateColumns: 'minmax(32px, 0.4fr) minmax(56px, 0.9fr) minmax(56px, 0.8fr) minmax(52px, 0.6fr) minmax(86px, 1fr) minmax(180px, 6fr) minmax(180px, 6fr) minmax(180px, 6fr) minmax(56px, 0.6fr) minmax(36px, 0.4fr)', gap: '8px', minWidth: 0, borderLeft: '4px solid transparent' }}
            >
              <div>POS</div>
              <div className="text-center">DRV</div>
              <div>GAP</div>
              <div>TYRE</div>
              <div>LAP TIME</div>
              <div>S1</div>
              <div>S2</div>
              <div>S3</div>
              <div className="text-right pr-2">STATUS</div>
              <div>DRS</div>
            </div>

            <div className="flex-1 overflow-y-auto timing-scroll">
              {!state.timingLines || state.timingLines.length === 0 ? (
                <div className="p-8 text-center text-neutral-400">
                  <p className="text-2xl mb-2">⏳</p>
                  <p>No timing data available</p>
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
                  const bestSectors = normalizeCollection(timingStatsEntry?.BestSectors || []) as TimingStatsEntry["BestSectors"]
                  const isKnockedOut = line.KnockedOut || line.Stopped || line.Retired

                return (
                  <div
                    key={line.RacingNumber}
                    ref={expandedDriver === line.RacingNumber ? expandedRowRef : null}
                    className={`border-b transition-colors px-3 py-1.5 cursor-pointer ${expandedDriver === line.RacingNumber ? 'bg-neutral-800/80 border-neutral-700' : 'border-neutral-800 hover:bg-neutral-800/50'} ${isKnockedOut ? 'opacity-40 grayscale hover:opacity-60' : ''}`}
                    style={{ borderLeft: `4px solid #${teamColor}` }}
                    onClick={() => setExpandedDriver(expandedDriver === line.RacingNumber ? null : line.RacingNumber)}
                  >
                    {/* Single Row Layout - CSS Grid aligned with header */}
                    <div
                      className="items-center"
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(32px, 0.4fr) minmax(56px, 0.9fr) minmax(56px, 0.8fr) minmax(52px, 0.6fr) minmax(86px, 1fr) minmax(180px, 6fr) minmax(180px, 6fr) minmax(180px, 6fr) minmax(56px, 0.6fr) minmax(36px, 0.4fr)', gap: '8px', minWidth: 0 }}
                    >
                      {/* Position */}
                      <div className="text-2xl font-bold text-white text-left pl-1">
                        {line.Position}
                      </div>

                      {/* Driver Acronym */}
                      <div className="font-bold text-[15px] text-center text-white truncate">
                        {driver?.name_acronym || driver?.Tla || line.RacingNumber}
                      </div>

                      {/* Gap/Interval */}
                      <div className="flex flex-col items-start justify-center min-w-0 overflow-hidden text-left">
                        {idx === 0 ? (
                          <div className="text-xs font-mono text-white font-bold">LEAD</div>
                        ) : (
                          <>
                            <div className="text-[13px] font-mono text-white font-bold leading-none truncate w-full">
                              {(() => {
                                const gapToLeader = line.GapToLeader
                                const intervalValue = typeof gapToLeader === 'string' ? gapToLeader : gapToLeader?.Value
                                return intervalValue ||
                                  line.IntervalToPositionAhead?.Value ||
                                  line.Stats?.[0]?.TimeDifftoPositionAhead ||
                                  line.Stats?.[1]?.TimeDifftoPositionAhead ||
                                  "---"
                              })()}
                            </div>
                            <div className="text-[11px] font-mono text-neutral-500 leading-none mt-0.5 truncate w-full">
                              {(() => {
                                const gapToLeader = line.GapToLeader
                                const gapValue = typeof gapToLeader === 'object' ? gapToLeader?.Value : null
                                return gapValue ||
                                  line.Stats?.[0]?.TimeDiffToFastest ||
                                  line.Stats?.[1]?.TimeDiffToFastest ||
                                  "---"
                              })()}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Tire Section */}
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        {currentTyre ? (
                          <>
                            <div className="flex-shrink-0">
                                <Image
                                  src={getTyreImage(currentTyre.compound)}
                                  alt={currentTyre.compound}
                                  width={26}
                                  height={26}
                                  className="opacity-90"
                                />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                              <div className="text-[11px] text-white font-bold">{pitStopCount}P</div>
                              <div className="text-[11px] text-neutral-400 font-bold mt-0.5">{currentTyre.laps}L</div>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-neutral-600">---</div>
                        )}
                      </div>

                      {/* Lap Time */}
                      <div className="flex flex-col items-start justify-center min-w-0 overflow-hidden w-full text-left">
                        <div className="text-sm font-mono text-white font-bold leading-none truncate w-full">{bestLapTime}</div>
                        <div className="text-xs font-mono text-neutral-500 leading-none mt-0.5 truncate w-full">{lastLapTime}</div>
                      </div>

                      {/* Sector Times - S1, S2, S3 */}
                      {[0, 1, 2].map((sectorIdx) => {
                        const sector = line.Sectors?.[sectorIdx]
                        const sectorRecord = isPlainObject(sector) ? sector : undefined
                        const bestSectorValue = bestSectors?.[sectorIdx]?.Value
                          || extractValueString(sectorRecord?.BestLapTime)
                          || extractValueString(sectorRecord?.BestTime)
                          || extractValueString(sectorRecord?.PersonalBest)
                        const currentSectorValue = extractValueString(sectorRecord?.Value) ?? "---"

                        return (
                          <div key={sectorIdx} className="flex flex-col min-w-0 overflow-hidden">
                            {/* Track segments indicator bar */}
                            <div className="w-full h-1.5 flex gap-[2px] mb-1">
                              {sectorRecord?.Segments && Array.isArray(sectorRecord.Segments) && sectorRecord.Segments.length > 0 ? (
                                sectorRecord.Segments.map((segment, segIdx) => {
                                  const segStatus = typeof segment === 'number' ? segment : segment.Status
                                  const segColor = getSectorColor(segStatus)
                                  return (
                                    <div
                                      key={segIdx}
                                      className="flex-1 h-full rounded-[1px]"
                                      style={{ backgroundColor: segColor }}
                                    />
                                  )
                                })
                              ) : (
                                <div className="w-full h-full rounded-[1px] bg-neutral-800" />
                              )}
                            </div>
                            {/* Sector times (Best and Current on one line) */}
                            <div className="flex items-baseline justify-start gap-1.5 mt-0.5 min-w-0 overflow-hidden w-full">
                              <span
                                className="text-sm font-mono font-bold leading-none truncate"
                                style={{ color: getSectorColor(sector?.Status || 0) }}
                              >
                                {bestSectorValue || "---"}
                              </span>
                              <span className="text-xs font-mono text-neutral-500 leading-none truncate">
                                {currentSectorValue}
                              </span>
                            </div>
                          </div>
                        )
                      })}

                      {/* STATUS Indicator */}
                      <div className="flex items-center justify-end min-w-0 pr-2">
                        {(() => {
                          if (line.InPit) {
                            return (
                              <div className="w-10 text-center px-1.5 py-0.5 rounded border border-[#00d2ff] font-bold text-[11px] text-[#00d2ff] bg-[#00d2ff]/10">PIT</div>
                            )
                          }
                          if (line.PitOut) {
                            return (
                              <div className="w-10 text-center px-1.5 py-0.5 rounded border border-[#e10600] font-bold text-[11px] text-[#e10600] bg-[#e10600]/10">OUT</div>
                            )
                          }
                          if (line.KnockedOut || line.Stopped || line.Retired) {
                            return (
                              <div className="w-10 text-center px-1.5 py-0.5 rounded border border-neutral-600 font-bold text-[11px] text-neutral-500 bg-neutral-600/10">KO</div>
                            )
                          }
                          if (statusText) {
                            return (
                              <div className="w-10 text-center px-1 py-0.5 rounded border border-neutral-700 font-bold text-[10px] text-neutral-400 bg-neutral-800/50 truncate">{statusText.toUpperCase()}</div>
                            )
                          }
                          return null
                        })()}
                      </div>

                      {/* DRS Indicator */}
                      <div className="flex items-center justify-start min-w-0">
                        {(() => {
                          const isDrsAvailable = drsStatus >= 1
                          const drsIsOpen = drsStatus === 2
                          const drsLabel = drsIsOpen ? 'OPEN' : isDrsAvailable ? 'RDY' : 'DRS'
                          return (
                            <div
                              className={`w-10 text-center px-1.5 py-0.5 rounded border font-bold text-[11px] ${
                                drsIsOpen
                                  ? 'border-[#00d200] text-[#00d200] bg-[#00d200]/10'
                                  : isDrsAvailable
                                    ? 'border-[#00d200] text-[#00d200] bg-[#00d200]/10'
                                    : 'border-neutral-700 text-neutral-700 bg-neutral-700/10'
                              }`}
                            >
                              {drsLabel}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Expandable Telemetry Dashboard */}
                    {expandedDriver === line.RacingNumber && (
                      <div className="mt-1 mb-1">
                        {(() => {
                          const telemetryChannels = state.carData?.Entries?.[line.RacingNumber]?.Channels;
                          const rpm = telemetryChannels?.["0"]?.length ? telemetryChannels["0"][telemetryChannels["0"].length - 1] : 0;
                          const speed = telemetryChannels?.["2"]?.length ? telemetryChannels["2"][telemetryChannels["2"].length - 1] : 0;
                          const gear = telemetryChannels?.["3"]?.length ? telemetryChannels["3"][telemetryChannels["3"].length - 1] : 0;
                          const throttle = telemetryChannels?.["4"]?.length ? telemetryChannels["4"][telemetryChannels["4"].length - 1] : 0;
                          const brake = telemetryChannels?.["5"]?.length ? telemetryChannels["5"][telemetryChannels["5"].length - 1] : 0;
                          
                          return (
                            <div className="grid grid-cols-5 gap-3 px-1 py-1 w-full">
                               {/* SPEED CARD */}
                               <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col flex-1 mr-3 min-w-0">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-sans font-semibold truncate mb-1.5">Speed - km/h</span>
                                    <div className="flex gap-[2px] w-full h-3">
                                      {Array.from({ length: 20 }).map((_, i) => (
                                        <div key={i} className={`flex-1 rounded-[1px] ${i < Math.round((Math.min(Number(speed), 350) / 350) * 20) ? 'bg-neutral-400' : 'bg-neutral-800'}`} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center flex-shrink-0">
                                    <span className="text-2xl font-bold font-mono text-white leading-none">{speed}</span>
                                  </div>
                               </div>

                               {/* RPM CARD */}
                               <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col flex-1 mr-3 min-w-0">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-sans font-semibold truncate mb-1.5">RPM</span>
                                    <div className="flex gap-[2px] w-full h-3">
                                      {Array.from({ length: 20 }).map((_, i) => (
                                        <div key={i} className={`flex-1 rounded-[1px] ${i < Math.round((Math.min(Number(rpm), 13000) / 13000) * 20) ? 'bg-neutral-400' : 'bg-neutral-800'}`} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center flex-shrink-0">
                                    <span className="text-2xl font-bold font-mono text-white leading-none">{rpm}</span>
                                  </div>
                               </div>

                               {/* THROTTLE CARD */}
                               <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col flex-1 mr-3 min-w-0">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-sans font-semibold truncate mb-1.5">Throttle - %</span>
                                    <div className="flex gap-[2px] w-full h-3">
                                      {Array.from({ length: 20 }).map((_, i) => (
                                        <div key={i} className={`flex-1 rounded-[1px] ${i < Math.round((Number(throttle) / 100) * 20) ? 'bg-[#00d200]' : 'bg-neutral-800'}`} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center flex-shrink-0">
                                    <span className="text-2xl font-bold font-mono text-[#00d200] leading-none">{throttle}</span>
                                  </div>
                               </div>

                               {/* BRAKE CARD */}
                               <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col flex-1 mr-3 min-w-0">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-sans font-semibold truncate mb-1.5">Brake - %</span>
                                    <div className="flex gap-[2px] w-full h-3">
                                      {Array.from({ length: 20 }).map((_, i) => (
                                        <div key={i} className={`flex-1 rounded-[1px] ${i < Math.round((Number(brake) / 100) * 20) ? 'bg-[#e10600]' : 'bg-neutral-800'}`} />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center flex-shrink-0">
                                    <span className="text-2xl font-bold font-mono text-[#e10600] leading-none">{brake}</span>
                                  </div>
                               </div>

                               {/* GEAR CARD */}
                               <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                                  <div className="flex flex-col flex-1 mr-3 min-w-0">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-sans font-semibold truncate mb-1.5">Gear</span>
                                    <div className="w-full h-3"></div>
                                  </div>
                                  <div className="flex items-center flex-shrink-0">
                                    <span className="text-2xl font-bold font-mono text-white leading-none">G{gear}</span>
                                  </div>
                               </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )
              })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Race Control */}
        <div className="sm:col-span-1 flex flex-col gap-3" style={{ height: 'calc(100vh - 178px)' }}>
          {/* Race Control - Takes full height */}
          <Card className="bg-neutral-900 border-neutral-700 overflow-hidden flex flex-col flex-1">
            <CardHeader className="bg-neutral-800/50 border-b border-neutral-700 px-3 py-1.5 flex flex-row items-center justify-start flex-shrink-0 rounded-t-xl">
              <CardTitle className="text-xs font-formula1 text-neutral-400 tracking-widest leading-[16px]">
                RACE CONTROL
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0 bg-black/20">
              <div className="flex-1 overflow-y-auto timing-scroll">
              {state.raceControl.length > 0 ? (
                <div className="py-1 px-1">
                  {[...state.raceControl].reverse().map((msg: RaceControlMessage, idx: number) => {
                    const messageText = msg.Message || ''
                    const flagClass = msg.Flag === 'YELLOW' ? 'text-yellow-500' :
                                      msg.Flag === 'GREEN' ? 'text-green-500' :
                                      msg.Flag === 'RED' ? 'text-red-500' :
                                      msg.Flag === 'BLUE' ? 'text-[#0090ff]' :
                                      'text-neutral-400'
                    
                    return (
                      <div key={idx} className="flex gap-2.5 py-1.5 px-2 border-b border-neutral-800/40 last:border-0 hover:bg-neutral-800/20 transition-colors items-start">
                        <div className="flex-shrink-0 mt-[1px]">
                          <div className="bg-[#1a1a1a] text-neutral-400 px-1.5 py-0.5 rounded-[3px] border border-neutral-800 text-[11px] font-mono tracking-tight leading-tight">
                            {new Date(msg.Utc).toLocaleTimeString('en-US', { 
                              hour12: false, 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-[2px]">
                          <div className="text-[11px] text-neutral-300 uppercase tracking-wide leading-snug break-words font-medium">
                            {msg.Flag && (
                              <span className={`mr-2 font-bold ${flagClass}`}>
                                {msg.Flag}
                              </span>
                            )}
                            {messageText}
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
      </div>
      </div>

    </div>
  )
})

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
