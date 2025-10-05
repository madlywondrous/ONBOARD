/**
 * Simple Live Timing Component using SSE (f1-dash style)
 * Backend maintains merged state, frontend just displays it
 * NO complex merging needed on frontend!
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Activity } from "lucide-react"
import { useSSELiveData } from "@/hooks/use-sse-live-data"

interface TimingLine {
  position: string
  driverNumber: string
  driverName: string
  teamName: string
  teamColor: string
  bestLapTime: string
  lastLapTime: string
  sector1: string
  sector2: string
  sector3: string
  sectors?: {
    "0"?: { Value?: string }
    "1"?: { Value?: string }
    "2"?: { Value?: string }
  }
}

export function LiveTimingSSE() {
  const { data, connected, error } = useSSELiveData()
  const [timingLines, setTimingLines] = useState<TimingLine[]>([])

  // Process timing data when it changes
  useEffect(() => {
    if (!data?.timing?.Lines) {
      console.log("⚠️ No timing data in SSE message")
      return
    }

    const lines = data.timing.Lines
    const driversList = data.drivers || {}
    
    console.log("🔄 Processing timing data:", {
      driversCount: Object.keys(lines).length,
      lapCount: data.lap_count
    })

    // Convert timing lines to array
    const processed: TimingLine[] = Object.entries(lines)
      .filter(([driverNum, lineData]: [string, any]) => {
        // Skip metadata keys
        if (driverNum.startsWith('_')) return false
        // Must have position
        if (!lineData.Line) return false
        return true
      })
      .map(([driverNum, lineData]: [string, any]) => {
        const driver = driversList[driverNum] || {}
        
        return {
          position: lineData.Line?.toString() || "?",
          driverNumber: driverNum,
          driverName: driver.Tla || driverNum,
          teamName: driver.TeamName || "Unknown",
          teamColor: driver.TeamColour || "FFFFFF",
          bestLapTime: lineData.BestLapTime?.Value || "--:--.---",
          lastLapTime: lineData.LastLapTime?.Value || "--:--.---",
          sector1: lineData.Sectors?.["0"]?.Value || "--:--.---",
          sector2: lineData.Sectors?.["1"]?.Value || "--:--.---",
          sector3: lineData.Sectors?.["2"]?.Value || "--:--.---",
          sectors: lineData.Sectors
        }
      })
      .sort((a, b) => parseInt(a.position) - parseInt(b.position))

    console.log("✅ Processed timing lines:", processed.length)
    setTimingLines(processed)
  }, [data])

  const currentLap = data?.lap_count?.CurrentLap || 0
  const totalLaps = data?.lap_count?.TotalLaps || 0
  const sessionType = data?.session?.Type || "No Session"
  const trackTemp = data?.weather?.TrackTemp || "--"
  const airTemp = data?.weather?.AirTemp || "--"

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Timing (SSE)
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <Badge variant={connected ? "default" : "destructive"} className="gap-2">
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connected ? "Connected" : "Disconnected"}
              </Badge>

              {/* Session Info */}
              <div className="text-sm text-muted-foreground">
                {sessionType}
              </div>

              {/* Lap Counter */}
              {totalLaps > 0 && (
                <div className="text-sm font-mono">
                  Lap {currentLap}/{totalLaps}
                </div>
              )}

              {/* Weather */}
              <div className="text-sm text-muted-foreground">
                🌡️ Track: {trackTemp}°C | Air: {airTemp}°C
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timing Tower */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-xs">
                  <th className="p-2 text-left w-12">POS</th>
                  <th className="p-2 text-left w-16">NUM</th>
                  <th className="p-2 text-left">DRIVER</th>
                  <th className="p-2 text-left">TEAM</th>
                  <th className="p-2 text-right font-mono">SECTOR 1</th>
                  <th className="p-2 text-right font-mono">SECTOR 2</th>
                  <th className="p-2 text-right font-mono">SECTOR 3</th>
                  <th className="p-2 text-right font-mono">LAST LAP</th>
                  <th className="p-2 text-right font-mono">BEST LAP</th>
                </tr>
              </thead>
              <tbody>
                {timingLines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      {connected ? "Waiting for timing data..." : "Connecting..."}
                    </td>
                  </tr>
                ) : (
                  timingLines.map((line) => (
                    <tr
                      key={line.driverNumber}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-2 font-bold">{line.position}</td>
                      <td className="p-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `#${line.teamColor}` }}
                        >
                          {line.driverNumber}
                        </div>
                      </td>
                      <td className="p-2 font-medium">{line.driverName}</td>
                      <td className="p-2 text-sm text-muted-foreground">{line.teamName}</td>
                      <td className="p-2 text-right font-mono text-sm">{line.sector1}</td>
                      <td className="p-2 text-right font-mono text-sm">{line.sector2}</td>
                      <td className="p-2 text-right font-mono text-sm">{line.sector3}</td>
                      <td className="p-2 text-right font-mono text-sm">{line.lastLapTime}</td>
                      <td className="p-2 text-right font-mono text-sm font-bold">{line.bestLapTime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono">
            <div>Connected: {connected ? "YES" : "NO"}</div>
            <div>Has Data: {data ? "YES" : "NO"}</div>
            <div>Drivers Count: {timingLines.length}</div>
            <div>Lap: {currentLap}/{totalLaps}</div>
            <div>Session: {sessionType}</div>
            <div>Last Update: {data?.last_update || "Never"}</div>
            {error && <div className="text-red-500">Error: {error.message}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
