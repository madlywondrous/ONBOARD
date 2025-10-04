"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Users, Search, Trophy, Flag, TrendingUp } from "lucide-react"
import Image from "next/image"

interface Driver {
  driver_number: number
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  country_code?: string
  headshot_url?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// 2025 F1 Driver Standings (example data - replace with real API)
const driverStandings = [
  { position: 1, points: 350, wins: 8, podiums: 14 },
  { position: 2, points: 320, wins: 6, podiums: 13 },
  { position: 3, points: 290, wins: 5, podiums: 11 },
  // ... more standings
]

export function DriversSection() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drivers`)
      const data = await response.json()
      
      // Sort by driver number
      const sortedDrivers = data.sort((a: Driver, b: Driver) => 
        a.driver_number - b.driver_number
      )
      
      setDrivers(sortedDrivers)
    } catch (error) {
      console.error("Failed to fetch drivers:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDrivers = drivers.filter(driver =>
    driver.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.name_acronym.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group drivers by team
  const driversByTeam = filteredDrivers.reduce((acc, driver) => {
    if (!acc[driver.team_name]) {
      acc[driver.team_name] = []
    }
    acc[driver.team_name].push(driver)
    return acc
  }, {} as Record<string, Driver[]>)

  if (loading) {
    return <DriversSectionSkeleton />
  }

  return (
    <div className="space-y-4 bg-black min-h-full p-6">
      {/* Header */}
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-red-500" />
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  2025 F1 Drivers
                </CardTitle>
                <p className="text-neutral-400 text-sm mt-1">
                  {drivers.length} drivers across {Object.keys(driversByTeam).length} teams
                </p>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Drivers Grid by Team */}
      <div className="space-y-6">
        {Object.entries(driversByTeam).map(([teamName, teamDrivers]) => (
          <Card key={teamName} className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-8 rounded"
                  style={{ backgroundColor: teamDrivers[0]?.team_colour ? `#${teamDrivers[0].team_colour}` : '#666' }}
                />
                <CardTitle className="text-xl text-white">{teamName}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamDrivers.map((driver) => (
                  <div
                    key={driver.driver_number}
                    className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800 hover:bg-neutral-750 transition-colors cursor-pointer"
                    onClick={() => setSelectedDriver(driver)}
                  >
                    {/* Driver Number */}
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: `#${driver.team_colour}` }}
                    >
                      {driver.driver_number}
                    </div>
                    
                    {/* Driver Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">
                          {driver.name_acronym}
                        </h3>
                        {driver.country_code && (
                          <span className="text-xs">{driver.country_code}</span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400">{driver.full_name}</p>
                      
                      {/* Stats (placeholder) */}
                      <div className="flex gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1 text-neutral-400">
                          <Trophy className="w-3 h-3" />
                          <span>0 wins</span>
                        </div>
                        <div className="flex items-center gap-1 text-neutral-400">
                          <Flag className="w-3 h-3" />
                          <span>0 podiums</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Points (placeholder) */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">0</div>
                      <div className="text-xs text-neutral-400">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="py-12 text-center">
            <p className="text-neutral-400">No drivers found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DriversSectionSkeleton() {
  return (
    <div className="space-y-4 bg-black min-h-full p-6">
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
      </Card>
      
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="bg-neutral-900 border-neutral-700">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex items-center gap-4 p-4">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
