"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Radio, Cloud, Wind, Thermometer, Droplets, Gauge, Timer, Flag, AlertCircle } from "lucide-react"

interface LiveSession {
  session_key: number
  session_name: string
  session_type: string
  date_start: string
  circuit_short_name: string
  country_name: string
  status?: string
  message?: string
}

interface LivePosition {
  driver_number: number
  position: number
  date: string
}

interface WeatherData {
  air_temperature: number
  track_temperature: number
  humidity: number
  pressure: number
  wind_speed: number
  wind_direction: number
  rainfall: number
}

interface DriverInfo {
  driver_number: number
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function LiveSection() {
  const [session, setSession] = useState<LiveSession | null>(null)
  const [positions, setPositions] = useState<LivePosition[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [drivers, setDrivers] = useState<DriverInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch live session data
  const fetchLiveData = async () => {
    try {
      // Get live session
      const sessionRes = await fetch(`${API_BASE_URL}/api/live/session`)
      const sessionData = await sessionRes.json()
      
      if (sessionData.session_key) {
        setSession(sessionData)
        
        // Get positions
        const positionsRes = await fetch(
          `${API_BASE_URL}/api/live/positions?session_key=${sessionData.session_key}`
        )
        const positionsData = await positionsRes.json()
        
        // Group by driver and get latest position
        const latestPositions = new Map<number, LivePosition>()
        positionsData.forEach((pos: LivePosition) => {
          const existing = latestPositions.get(pos.driver_number)
          if (!existing || new Date(pos.date) > new Date(existing.date)) {
            latestPositions.set(pos.driver_number, pos)
          }
        })
        
        setPositions(
          Array.from(latestPositions.values())
            .sort((a, b) => a.position - b.position)
        )
        
        // Get weather
        try {
          const weatherRes = await fetch(
            `${API_BASE_URL}/api/live/weather?session_key=${sessionData.session_key}`
          )
          const weatherData = await weatherRes.json()
          setWeather(weatherData)
        } catch (err) {
          console.warn("Weather data not available")
        }
        
        // Get drivers info
        const driversRes = await fetch(
          `${API_BASE_URL}/api/drivers?session_key=${sessionData.session_key}`
        )
        const driversData = await driversRes.json()
        setDrivers(driversData)
      } else {
        setSession(sessionData)
      }
      
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch live data")
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // Get driver info by number
  const getDriverInfo = (driverNumber: number): DriverInfo | null => {
    return drivers.find(d => d.driver_number === driverNumber) || null
  }

  if (loading) {
    return <LiveSectionSkeleton />
  }

  if (!session || !session.session_key) {
    return (
      <div className="space-y-4 bg-black min-h-full p-6">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-16 h-16 text-neutral-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Live Session</h2>
            <p className="text-neutral-400 text-center max-w-md">
              {session?.message || "There is currently no active F1 session. Check back during race weekends for live timing!"}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLive = session.status === 'live'

  return (
    <div className="space-y-4 bg-black min-h-full p-6">
      {/* Session Header */}
      <Card className={`border-2 ${isLive ? 'border-red-500 bg-gradient-to-r from-red-500/20 to-orange-500/20' : 'border-neutral-700 bg-neutral-900'}`}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isLive && <Radio className="w-6 h-6 text-red-500 animate-pulse" />}
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  {session.session_name}
                </CardTitle>
                <p className="text-neutral-400 text-sm mt-1">
                  {session.circuit_short_name} • {session.country_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isLive ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                {isLive ? "🔴 LIVE" : "UPCOMING"}
              </Badge>
              <span className="text-xs text-neutral-500">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="bg-orange-500/20 border-orange-500/30">
          <CardContent className="py-3">
            <p className="text-orange-400 text-sm">⚠️ {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Timing Tower */}
        <div className="lg:col-span-2">
          <Card className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Live Timing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-neutral-700 text-xs font-semibold text-neutral-400 uppercase">
                    <div className="col-span-1">Pos</div>
                    <div className="col-span-5">Driver</div>
                    <div className="col-span-3">Team</div>
                    <div className="col-span-3 text-right">Status</div>
                  </div>
                  
                  {/* Drivers */}
                  {positions.map((pos) => {
                    const driver = getDriverInfo(pos.driver_number)
                    return (
                      <div
                        key={pos.driver_number}
                        className="grid grid-cols-12 gap-2 items-center py-3 px-2 rounded hover:bg-neutral-800 transition-colors"
                      >
                        <div className="col-span-1">
                          <span className="text-2xl font-bold text-white">
                            {pos.position}
                          </span>
                        </div>
                        <div className="col-span-5 flex items-center gap-2">
                          <div
                            className="w-1 h-12 rounded"
                            style={{ backgroundColor: driver?.team_colour ? `#${driver.team_colour}` : '#666' }}
                          />
                          <div>
                            <div className="font-bold text-white">
                              {driver?.name_acronym || pos.driver_number}
                            </div>
                            <div className="text-xs text-neutral-400">
                              {driver?.full_name || `Driver ${pos.driver_number}`}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3 text-sm text-neutral-400">
                          {driver?.team_name || '-'}
                        </div>
                        <div className="col-span-3 text-right">
                          {isLive && (
                            <Badge variant="outline" className="text-xs">
                              <Flag className="w-3 h-3 mr-1" />
                              Racing
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-neutral-400">No timing data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weather & Info Sidebar */}
        <div className="space-y-4">
          {/* Weather Card */}
          {weather && (
            <Card className="bg-neutral-900 border-neutral-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cloud className="w-5 h-5" />
                  Weather
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Thermometer className="w-4 h-4" />
                    <span className="text-sm">Air</span>
                  </div>
                  <span className="text-white font-bold">{weather.air_temperature.toFixed(1)}°C</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Track</span>
                  </div>
                  <span className="text-white font-bold">{weather.track_temperature.toFixed(1)}°C</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Droplets className="w-4 h-4" />
                    <span className="text-sm">Humidity</span>
                  </div>
                  <span className="text-white font-bold">{weather.humidity.toFixed(0)}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Wind className="w-4 h-4" />
                    <span className="text-sm">Wind</span>
                  </div>
                  <span className="text-white font-bold">
                    {weather.wind_speed.toFixed(1)} km/h
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Gauge className="w-4 h-4" />
                    <span className="text-sm">Pressure</span>
                  </div>
                  <span className="text-white font-bold">{weather.pressure.toFixed(0)} hPa</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Info */}
          <Card className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-lg">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Type</span>
                <span className="text-white font-medium">{session.session_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Start Time</span>
                <span className="text-white font-medium">
                  {new Date(session.date_start).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Drivers</span>
                <span className="text-white font-medium">{drivers.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LiveSectionSkeleton() {
  return (
    <div className="space-y-4 bg-black min-h-full p-6">
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <Skeleton className="h-6 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-4">
          <Card className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
