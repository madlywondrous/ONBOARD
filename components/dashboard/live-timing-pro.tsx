"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Circle, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Save,
  History,
  Signal
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Use relative URLs so Next.js rewrites can proxy to backend
const API_BASE_URL = ""

// Status colors for sector segments (F1 official colors)
const SECTOR_STATUS_COLORS: { [key: number]: string } = {
  0: "#FFFFFF",       // No time
  2048: "#FFFFFF",    // Normal (white)
  2049: "#00FF00",    // Personal best (green)
  2050: "#FFFF00",    // Overall best (yellow - not used in segments) 
  2051: "#800080",    // Purple (overall fastest)
  2052: "#FFFFFF",    // Invalidated (white)
  2064: "#00FF00",    // Personal best segment
  2068: "#FFFF00",    // Session best segment
}

interface TimingLine {
  RacingNumber: string
  Line: number
  Position: string
  InPit: boolean
  PitOut: boolean
  Stopped: boolean
  Retired: boolean
  Sectors: Array<{
    Value: string
    Status: number
    Segments: Array<{ Status: number }>
    PersonalFastest: boolean
    OverallFastest: boolean
  }>
  Speeds?: {
    I1?: { Value: string }
    I2?: { Value: string }
    ST?: { Value: string }
  }
  BestLapTimes?: Array<{ Value: string; Lap: number }>
  LastLapTime?: { Value: string }
  Stats?: Array<{
    TimeDiffToFastest?: string
    TimeDifftoPositionAhead?: string
  }>
}

interface TimingAppLine {
  RacingNumber: string
  Stints?: Array<{
    Compound: string
    New: string
    TotalLaps: number
    LapNumber: number
  }>
}

interface Driver {
  driver_number: number
  full_name: string
  name_acronym: string
  team_colour: string
}

interface SessionInfo {
  Meeting: {
    Name: string
    Location: string
  }
  Type: string
  SessionStatus: string
  status: string
}

interface RecordingInfo {
  session_id: string
  recording_started: string
  total_frames?: number
}

export function LiveTimingPro() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [timingLines, setTimingLines] = useState<TimingLine[]>([])
  const [drivers, setDrivers] = useState<{ [key: string]: Driver }>({})
  const [tyreData, setTyreData] = useState<{ [key: string]: TimingAppLine }>({})
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(true)
  const [recordings, setRecordings] = useState<RecordingInfo[]>([])
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)

  console.log("🏎️ LiveTimingPro component rendered!", { loading, timingLines: timingLines.length })

  useEffect(() => {
    console.log("🏎️ LiveTimingPro mounted - fetching data...")
    fetchInitialData()
    const interval = setInterval(() => {
      if (isLive && !selectedRecording) {
        fetchLiveData()
      }
    }, 1000) // Update every second for live timing

    return () => clearInterval(interval)
  }, [isLive, selectedRecording])

  const fetchInitialData = async () => {
    try {
      // Fetch drivers
      const driversRes = await fetch(`${API_BASE_URL}/api/drivers`)
      const driversData = await driversRes.json()
      const driversMap: { [key: string]: Driver } = {}
      driversData.forEach((d: Driver) => {
        driversMap[d.driver_number.toString()] = d
      })
      setDrivers(driversMap)

      // Fetch recordings
      const recordingsRes = await fetch(`${API_BASE_URL}/api/recordings`)
      const recordingsData = await recordingsRes.json()
      setRecordings(recordingsData.recordings || [])

      // Fetch live data
      await fetchLiveData()
    } catch (error) {
      console.error("Failed to fetch initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLiveData = async () => {
    try {
      console.log('🏎️ Fetching LIVE data from SignalR...')
      
      // Fetch session info
      const sessionRes = await fetch(`${API_BASE_URL}/api/live/session`)
      const sessionData = await sessionRes.json()
      console.log("🏎️ Session data:", sessionData)
      setSessionInfo(sessionData)

      // Fetch timing data
      const timingRes = await fetch(`${API_BASE_URL}/api/live/timing`)
      const timingData = await timingRes.json()
      console.log("🏎️ Timing data:", timingData)

      if (timingData.Lines) {
        const lines = Object.values(timingData.Lines) as TimingLine[]
        const sortedLines = lines.sort((a, b) => {
          const posA = parseInt(a.Position) || 999
          const posB = parseInt(b.Position) || 999
          return posA - posB
        })
        console.log(`🏎️ Sorted ${sortedLines.length} drivers`)
        setTimingLines(sortedLines)
      }

      // Fetch tyre data
      const tyreRes = await fetch(`${API_BASE_URL}/api/live/timing-app`)
      const tyreDataRes = await tyreRes.json()
      console.log("🏎️ Tyre data:", tyreDataRes)
      if (tyreDataRes.Lines) {
        const tyreMap: { [key: string]: TimingAppLine } = {}
        Object.entries(tyreDataRes.Lines).forEach(([key, value]) => {
          tyreMap[key] = value as TimingAppLine
        })
        setTyreData(tyreMap)
      }
    } catch (error) {
      console.error("❌ Failed to fetch live data:", error)
    }
  }

  const loadRecording = async (sessionId: string) => {
    try {
      setIsLive(false)
      setSelectedRecording(sessionId)
      setCurrentFrame(0)

      const framesRes = await fetch(`${API_BASE_URL}/api/recordings/${sessionId}/frames?start=0&count=1`)
      const framesData = await framesRes.json()
      
      if (framesData.frames && framesData.frames.length > 0) {
        const frame = framesData.frames[0]
        setSessionInfo(frame.data.session)
        if (frame.data.timing?.Lines) {
          const lines = Object.values(frame.data.timing.Lines) as TimingLine[]
          setTimingLines(lines.sort((a, b) => {
            const posA = parseInt(a.Position) || 999
            const posB = parseInt(b.Position) || 999
            return posA - posB
          }))
        }
      }
    } catch (error) {
      console.error("Failed to load recording:", error)
    }
  }

  const toggleLive = () => {
    if (!isLive) {
      setSelectedRecording(null)
      setIsLive(true)
      fetchLiveData()
    }
  }

  const getSegmentColor = (status: number): string => {
    return SECTOR_STATUS_COLORS[status] || "#666666"
  }

  const getSectorColor = (sector: TimingLine['Sectors'][0]): string => {
    if (sector.OverallFastest) return "#800080" // Purple
    if (sector.PersonalFastest) return "#00FF00" // Green
    if (sector.Status === 2048) return "#FFFFFF" // White
    return "#FFFFFF"
  }

  const getTyreColor = (compound: string): string => {
    switch (compound?.toUpperCase()) {
      case "SOFT": return "#FF0000"
      case "MEDIUM": return "#FFD700"
      case "HARD": return "#FFFFFF"
      case "INTERMEDIATE": return "#00FF00"
      case "WET": return "#0000FF"
      default: return "#888888"
    }
  }

  const getTyreLabel = (compound: string): string => {
    switch (compound?.toUpperCase()) {
      case "SOFT": return "S"
      case "MEDIUM": return "M"
      case "HARD": return "H"
      case "INTERMEDIATE": return "I"
      case "WET": return "W"
      default: return "?"
    }
  }

  const getCurrentTyre = (racingNumber: string): { compound: string; isNew: boolean; laps: number } | null => {
    const driverTyreData = tyreData[racingNumber]
    if (!driverTyreData?.Stints || driverTyreData.Stints.length === 0) {
      return null
    }
    // Get the last stint (current tyres)
    const currentStint = driverTyreData.Stints[driverTyreData.Stints.length - 1]
    return {
      compound: currentStint.Compound,
      isNew: currentStint.New === "true",
      laps: currentStint.TotalLaps || 0
    }
  }

  if (loading) {
    return <LiveTimingSkeleton />
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-500 mb-1">
            {sessionInfo?.Meeting?.Name || "F1 LIVE TIMING"}
          </h1>
          <div className="flex items-center gap-3">
            <Badge 
              variant={sessionInfo?.status === "live" ? "default" : "outline"}
              className={sessionInfo?.status === "live" ? "bg-red-600 animate-pulse" : ""}
            >
              {sessionInfo?.status === "live" ? (
                <><Signal className="w-3 h-3 mr-1" /> LIVE</>
              ) : "OFFLINE"}
            </Badge>
            <span className="text-neutral-400 text-sm">
              {sessionInfo?.Type || "No Active Session"}
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={toggleLive}
            className={isLive ? "bg-red-600" : ""}
          >
            {isLive ? <Signal className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isLive ? "LIVE" : "Go Live"}
          </Button>
          
          {recordings.length > 0 && (
            <select
              className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 text-sm"
              value={selectedRecording || ""}
              onChange={(e) => e.target.value && loadRecording(e.target.value)}
            >
              <option value="">Select Recording</option>
              {recordings.map((rec) => (
                <option key={rec.session_id} value={rec.session_id}>
                  {rec.session_id}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Timing Tower */}
      <div className="space-y-[2px]">
        {/* Header Row */}
        <div className="bg-neutral-900 grid grid-cols-[60px_80px_100px_60px_1fr_1fr_1fr_120px_100px] gap-2 px-3 py-2 text-xs font-bold text-neutral-400 border-b border-neutral-700">
          <div>POS</div>
          <div>NO</div>
          <div>DRIVER</div>
          <div className="text-center">TYRE</div>
          <div className="text-center">SECTOR 1</div>
          <div className="text-center">SECTOR 2</div>
          <div className="text-center">SECTOR 3</div>
          <div className="text-center">LAP TIME</div>
          <div className="text-center">GAP</div>
        </div>

        {/* Driver Rows */}
        {timingLines.map((line) => {
          const driver = drivers[line.RacingNumber]
          const teamColor = driver?.team_colour || "FFFFFF"
          const currentTyre = getCurrentTyre(line.RacingNumber)
          
          return (
            <div
              key={line.RacingNumber}
              className="bg-neutral-900/50 hover:bg-neutral-800/70 grid grid-cols-[60px_80px_100px_60px_1fr_1fr_1fr_120px_100px] gap-2 px-3 py-3 items-center border-l-4 transition-colors"
              style={{ borderLeftColor: `#${teamColor}` }}
            >
              {/* Position */}
              <div className="text-2xl font-bold">
                {line.Position}
              </div>

              {/* Driver Number */}
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `#${teamColor}` }}
                >
                  {line.RacingNumber}
                </div>
              </div>

              {/* Driver Acronym */}
              <div className="font-bold text-lg">
                {driver?.name_acronym || line.RacingNumber}
                {line.InPit && (
                  <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-500">
                    PIT
                  </Badge>
                )}
              </div>

              {/* Tyre Info */}
              <div className="flex flex-col items-center gap-1">
                {currentTyre ? (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2"
                      style={{ 
                        borderColor: getTyreColor(currentTyre.compound),
                        color: getTyreColor(currentTyre.compound)
                      }}
                    >
                      {getTyreLabel(currentTyre.compound)}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {currentTyre.laps}L
                      {currentTyre.isNew && <span className="text-green-500 ml-1">●</span>}
                    </div>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-neutral-700 flex items-center justify-center text-neutral-600 text-xs">
                    ?
                  </div>
                )}
              </div>

              {/* Sector 1 */}
              <div className="flex flex-col gap-1">
                <div 
                  className="text-center font-mono text-sm font-bold"
                  style={{ color: line.Sectors?.[0] ? getSectorColor(line.Sectors[0]) : "#666" }}
                >
                  {line.Sectors?.[0]?.Value || "---"}
                </div>
                {line.Sectors?.[0]?.Segments && (
                  <div className="flex gap-[2px] h-1">
                    {line.Sectors[0].Segments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-full"
                        style={{ backgroundColor: getSegmentColor(seg.Status) }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sector 2 */}
              <div className="flex flex-col gap-1">
                <div 
                  className="text-center font-mono text-sm font-bold"
                  style={{ color: line.Sectors?.[1] ? getSectorColor(line.Sectors[1]) : "#666" }}
                >
                  {line.Sectors?.[1]?.Value || "---"}
                </div>
                {line.Sectors?.[1]?.Segments && (
                  <div className="flex gap-[2px] h-1">
                    {line.Sectors[1].Segments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-full"
                        style={{ backgroundColor: getSegmentColor(seg.Status) }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sector 3 */}
              <div className="flex flex-col gap-1">
                <div 
                  className="text-center font-mono text-sm font-bold"
                  style={{ color: line.Sectors?.[2] ? getSectorColor(line.Sectors[2]) : "#666" }}
                >
                  {line.Sectors?.[2]?.Value || "---"}
                </div>
                {line.Sectors?.[2]?.Segments && (
                  <div className="flex gap-[2px] h-1">
                    {line.Sectors[2].Segments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-full"
                        style={{ backgroundColor: getSegmentColor(seg.Status) }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Lap Time */}
              <div className="text-center">
                <div className="font-mono font-bold text-sm">
                  {line.BestLapTimes?.[1]?.Value || line.LastLapTime?.Value || "---"}
                </div>
                <div className="text-xs text-neutral-500">
                  {line.Speeds?.ST?.Value && `${line.Speeds.ST.Value} km/h`}
                </div>
              </div>

              {/* Gap */}
              <div className="text-center">
                <div className="font-mono text-sm text-neutral-300">
                  {line.Stats?.[1]?.TimeDiffToFastest || "---"}
                </div>
                <div className="text-xs text-neutral-500">
                  {line.Stats?.[1]?.TimeDifftoPositionAhead || "---"}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {timingLines.length === 0 && (
        <Card className="bg-neutral-900 border-neutral-800 mt-8">
          <CardContent className="py-12 text-center">
            <Signal className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Timing Data Available</h3>
            <p className="text-neutral-400">
              Live timing data will appear when a session is active
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LiveTimingSkeleton() {
  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      <Skeleton className="h-12 w-96 bg-neutral-800" />
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 bg-neutral-800" />
        ))}
      </div>
    </div>
  )
}
