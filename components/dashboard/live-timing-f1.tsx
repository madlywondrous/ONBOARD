"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Flag, Radio, Zap, Timer, Circle } from "lucide-react"
import Image from "next/image"

// Use relative URLs so Next.js rewrites can proxy to backend
const API_BASE_URL = ""

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
  Sectors: Array<{
    Value: string
    Status: number
    Segments: Array<{ Status: number }>
  }>
  BestLapTimes?: Array<{ Value: string }>
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
}

interface Driver {
  driver_number: number
  name_acronym: string
  team_colour: string
}

interface TimingAppLine {
  Stints?: Array<{
    Compound: string
    New: string
    TotalLaps: number
  }>
  DRS?: {
    Status: number  // 0=disabled, 1=available, 2=open
  }
}

interface SessionInfo {
  Meeting: { Name: string }
  Type: string
  status: string
}

interface RaceControlMessage {
  Utc: string
  Category: string
  Flag?: string
  Scope?: string
  Sector?: number
  Message: string
}

interface TrackStatus {
  Status: string
  Message: string
}

export function LiveTimingF1() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [timingLines, setTimingLines] = useState<TimingLine[]>([])
  const [drivers, setDrivers] = useState<{ [key: string]: Driver }>({})
  const [tyreData, setTyreData] = useState<{ [key: string]: TimingAppLine }>({})
  const [raceControl, setRaceControl] = useState<RaceControlMessage[]>([])
  const [trackStatus, setTrackStatus] = useState<TrackStatus | null>(null)
  const [loading, setLoading] = useState(true)

  console.log("🏁 LiveTimingF1 component rendered!", { loading, drivers: Object.keys(drivers).length, timingLines: timingLines.length })

  useEffect(() => {
    console.log("🏁 LiveTimingF1 mounted - fetching data...")
    fetchInitialData()
    const interval = setInterval(fetchLiveData, 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchInitialData = async () => {
    try {
      const driversRes = await fetch(`${API_BASE_URL}/api/drivers`)
      const driversData = await driversRes.json()
      const driversMap: { [key: string]: Driver } = {}
      driversData.forEach((d: Driver) => {
        driversMap[d.driver_number.toString()] = d
      })
      setDrivers(driversMap)
      await fetchLiveData()
    } catch (error) {
      console.error("Failed to fetch initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLiveData = async () => {
    try {
      console.log('🏁 Fetching LIVE data from SignalR...')
      
      const [sessionRes, timingRes, tyreRes, rcRes, tsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/live/session`),
        fetch(`${API_BASE_URL}/api/live/timing`),
        fetch(`${API_BASE_URL}/api/live/timing-app`),
        fetch(`${API_BASE_URL}/api/live/race-control`),
        fetch(`${API_BASE_URL}/api/live/track-status`)
      ])

      const sessionData = await sessionRes.json()
      console.log("🏁 Session data:", sessionData)
      setSessionInfo(sessionData)

      const timingData = await timingRes.json()
      console.log("🏁 Timing data:", timingData)
      if (timingData.Lines) {
        const lines = Object.values(timingData.Lines) as TimingLine[]
        const sorted = lines.sort((a, b) => 
          (parseInt(a.Position) || 999) - (parseInt(b.Position) || 999)
        )
        console.log(`🏁 Sorted ${sorted.length} drivers`)
        setTimingLines(sorted)
      }

      const tyreDataRes = await tyreRes.json()
      console.log("🏁 Tyre data:", tyreDataRes)
      if (tyreDataRes.Lines) {
        const tyreMap: { [key: string]: TimingAppLine } = {}
        Object.entries(tyreDataRes.Lines).forEach(([key, value]) => {
          tyreMap[key] = value as TimingAppLine
        })
        setTyreData(tyreMap)
      }

      const rcData = await rcRes.json()
      console.log("🏁 Race control data:", rcData)
      setRaceControl(Array.isArray(rcData) ? rcData.slice(-5) : [])

      const tsData = await tsRes.json()
      console.log("🏁 Track status data:", tsData)
      setTrackStatus(tsData)

    } catch (error) {
      console.error("❌ Failed to fetch live data:", error)
    }
  }

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
    const driverTyreData = tyreData[racingNumber]
    if (!driverTyreData?.Stints || driverTyreData.Stints.length === 0) return null
    const currentStint = driverTyreData.Stints[driverTyreData.Stints.length - 1]
    return {
      compound: currentStint.Compound,
      isNew: currentStint.New === "true",
      laps: currentStint.TotalLaps || 0
    }
  }

  const getSegmentColor = (status: number): string => {
    return SECTOR_STATUS_COLORS[status] || "#404040"
  }

  if (loading) {
    return <LiveTimingSkeleton />
  }

  const isLive = sessionInfo?.status === "live"

  return (
    <div className="h-full bg-black overflow-hidden flex flex-col">
      {/* Stats Cards - Updated with proper data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 flex-shrink-0">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider mb-1">SESSION</p>
                <p className="text-sm font-bold text-white">{sessionInfo?.Type || "N/A"}</p>
              </div>
              <Timer className="w-5 h-5 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider mb-1">TIME LEFT</p>
                <p className="text-sm font-bold text-orange-500">{sessionInfo?.status === "live" ? "LIVE" : "ENDED"}</p>
              </div>
              <Circle className="w-5 h-5 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider mb-1">WEATHER</p>
                <p className="text-sm font-bold text-cyan-500">DRY</p>
              </div>
              <Zap className="w-5 h-5 text-cyan-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider mb-1">TRACK STATUS</p>
                <p className="text-sm font-bold text-green-500">{trackStatus?.Message || "ALL CLEAR"}</p>
              </div>
              <Flag className="w-5 h-5 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid - Aligned with Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 min-h-0">
        {/* Timing Tower - Takes 3 columns (same as first 3 stats cards) */}
        <Card className="bg-neutral-900 border-neutral-700 overflow-hidden sm:col-span-3 flex flex-col">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            {/* Header Row */}
            <div className="bg-neutral-800/50 border-b border-neutral-700 px-3 py-1.5 flex items-center gap-2.5 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold flex-shrink-0">
              <div className="w-10 text-center">POS</div>
              <div className="w-12">DRV</div>
              <div className="w-20 text-center">TYRE</div>
              <div className="w-16">GAP</div>
              <div className="w-16 text-center">STATUS</div>
              <div className="w-12 text-center">DRS</div>
              <div className="w-20">LAP TIME</div>
              <div className="flex gap-2.5">
                <div className="w-28 text-center">S1</div>
                <div className="w-28 text-center">S2</div>
                <div className="w-28 text-center">S3</div>
              </div>
              <div className="w-40 text-center">SPEED</div>
              {/* We'll add more columns here step by step */}
            </div>

            <div className="flex-1 overflow-y-auto timing-scroll">
              {timingLines.map((line, idx) => {
                const driver = drivers[line.RacingNumber]
                const teamColor = driver?.team_colour || "666666"
                const currentTyre = getCurrentTyre(line.RacingNumber)

                return (
                  <div
                    key={line.RacingNumber}
                    className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors px-3 py-2"
                    style={{ borderLeft: `4px solid #${teamColor}` }}
                  >
                    {/* Single Row Layout - Compact */}
                    <div className="flex items-center gap-2.5">
                      {/* Position */}
                      <div className="text-3xl font-bold text-white w-10 text-center flex-shrink-0">
                        {line.Position}
                      </div>

                      {/* Driver Badge */}
                      <div
                        className="px-2 py-1 rounded font-bold text-sm flex-shrink-0 w-12 text-center"
                        style={{ backgroundColor: `#${teamColor}`, color: '#000' }}
                      >
                        {driver?.name_acronym || line.RacingNumber}
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
                                {line.NumberOfPitStops || 0}PIT
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

                      {/* Gap/Interval - Left Aligned */}
                      <div className="flex flex-col items-start justify-center w-16 flex-shrink-0">
                        {idx === 0 ? (
                          <div className="text-xs font-mono text-white font-bold">LEAD</div>
                        ) : (
                          <>
                            {/* Interval to car ahead */}
                            <div className="text-sm font-mono text-white font-bold leading-none">
                              {line.Stats?.[1]?.TimeDifftoPositionAhead || line.Stats?.[0]?.TimeDiffToFastest || "---"}
                            </div>
                            {/* Gap to leader */}
                            <div className="text-[10px] font-mono text-neutral-500 leading-none mt-0.5">
                              {line.Stats?.[1]?.TimeDiffToFastest || line.Stats?.[0]?.TimeDiffToFastest || "---"}
                            </div>
                          </>
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
                          return null
                        })()}
                      </div>

                      {/* DRS Indicator */}
                      <div className="w-12 flex items-center justify-center flex-shrink-0">
                        {(() => {
                          const drsStatus = tyreData[line.RacingNumber]?.DRS?.Status || 0
                          const isDrsActive = drsStatus >= 1 // 1=available, 2=open
                          return (
                            <div 
                              className={`px-2 py-1.5 rounded border font-bold text-[10px] ${
                                isDrsActive 
                                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                                  : 'border-neutral-700 text-neutral-700 bg-neutral-700/10'
                              }`}
                            >
                              DRS
                            </div>
                          )
                        })()}
                      </div>

                      {/* Lap Time - Best on top, Last on bottom */}
                      <div className="flex flex-col items-start justify-center w-20 flex-shrink-0">
                        {/* Best Lap Time */}
                        <div className="text-sm font-mono text-white font-bold leading-none">
                          {line.BestLapTimes?.[0]?.Value || "---"}
                        </div>
                        {/* Last Lap Time */}
                        <div className="text-[10px] font-mono text-neutral-500 leading-none mt-0.5">
                          {line.Sectors?.[2]?.Value ? (
                            (() => {
                              const s1 = parseFloat(line.Sectors[0]?.Value || "0")
                              const s2 = parseFloat(line.Sectors[1]?.Value || "0")
                              const s3 = parseFloat(line.Sectors[2]?.Value || "0")
                              const lastLap = s1 + s2 + s3
                              return lastLap > 0 ? `${lastLap.toFixed(3)}` : "---"
                            })()
                          ) : "---"}
                        </div>
                      </div>

                      {/* Sector Times - S1, S2, S3 with track segment indicators */}
                      <div className="flex gap-2.5">
                        {[0, 1, 2].map((sectorIdx) => {
                          const sector = line.Sectors?.[sectorIdx]
                          
                          return (
                            <div key={sectorIdx} className="flex flex-col items-start w-28 flex-shrink-0">
                              {/* Track segments indicator bar */}
                              <div className="w-full h-2 flex gap-0.5 mb-2">
                                {sector?.Segments?.map((segment, segIdx) => {
                                  const segColor = getSectorColor(segment.Status)
                                  return (
                                    <div
                                      key={segIdx}
                                      className="flex-1 h-full rounded-sm"
                                      style={{ backgroundColor: segColor }}
                                    />
                                  )
                                }) || <div className="w-full h-full rounded-full bg-neutral-700" />}
                              </div>
                              
                              {/* Best and Current times side by side */}
                              <div className="flex items-center gap-3">
                                {/* Best sector time (larger) */}
                                <div className="text-base font-mono text-white font-bold leading-none">
                                  {sector?.Value || "---"}
                                </div>
                                
                                {/* Current sector time (medium) */}
                                <div 
                                  className="text-xs font-mono leading-none"
                                  style={{ color: getSectorColor(sector?.Status || 0) }}
                                >
                                  {sector?.Value || "---"}
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
              })}
            </div>
          </CardContent>
        </Card>

        {/* Race Control - Takes 1 column (same as 4th stats card) */}
        <Card className="bg-neutral-900 border-neutral-700 overflow-hidden sm:col-span-1 flex flex-col">
          <CardHeader className="pb-3 border-b border-neutral-800 flex-shrink-0">
            <CardTitle className="text-base font-bold text-white tracking-wider flex items-center gap-2">
              <Flag className="w-4 h-4 text-orange-500" />
              RACE CONTROL
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto timing-scroll">
              {raceControl.length > 0 ? (
                <div className="divide-y divide-neutral-800">
                  {[...raceControl].reverse().map((msg, idx) => {
                    const flagImage = msg.Flag?.toLowerCase().replace(/\s+/g, '-')
                    return (
                      <div key={idx} className="p-3 hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-start gap-3">
                          {msg.Flag && (
                            <Image
                              src={`/image Resource/Flags /${flagImage}-flag.svg`}
                              alt={msg.Flag}
                              width={24}
                              height={24}
                              className="mt-0.5 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {msg.Flag && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] px-1.5 py-0 ${
                                    msg.Flag === 'YELLOW' ? 'border-yellow-500 text-yellow-500' :
                                    msg.Flag === 'GREEN' ? 'border-green-500 text-green-500' :
                                    msg.Flag === 'RED' ? 'border-red-500 text-red-500' :
                                    'border-neutral-600 text-neutral-400'
                                  }`}
                                >
                                  {msg.Flag}
                                </Badge>
                              )}
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {new Date(msg.Utc).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed">
                              {msg.Message}
                            </p>
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
