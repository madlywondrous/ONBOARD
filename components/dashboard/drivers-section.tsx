"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Users, Search, Flag, Hash } from "lucide-react"

interface Driver {
  driver_number: number
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  country_code?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function DriversSection() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drivers`)
      const data = await response.json()
      setDrivers(data)
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
    <div className="space-y-4 bg-black min-h-full">
      {/* Header */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" />
              F1 Drivers 2025
            </CardTitle>
            <Badge variant="outline" className="text-white border-neutral-700">
              {drivers.length} Drivers
            </Badge>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search drivers, teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Drivers Grid by Team */}
      <div className="space-y-4">
        {Object.entries(driversByTeam).map(([teamName, teamDrivers]) => {
          const teamColor = teamDrivers[0]?.team_colour || "FFFFFF"
          
          return (
            <Card key={teamName} className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: `#${teamColor}` }}
                  />
                  <div>
                    <CardTitle className="text-lg text-white">{teamName}</CardTitle>
                    <p className="text-sm text-neutral-500">{teamDrivers.length} drivers</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamDrivers.map((driver) => (
                    <div
                      key={driver.driver_number}
                      className="bg-neutral-800/50 rounded-lg p-4 hover:bg-neutral-800 transition-all cursor-pointer group border border-neutral-700/50 hover:border-neutral-600"
                    >
                      <div className="flex items-center gap-4">
                        {/* Driver Number */}
                        <div
                          className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-2xl text-white relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, #${teamColor}22, #${teamColor}44)`
                          }}
                        >
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{ backgroundColor: `#${teamColor}` }}
                          />
                          <span className="relative z-10">{driver.driver_number}</span>
                        </div>
                        
                        {/* Driver Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white truncate group-hover:text-red-400 transition-colors">
                              {driver.full_name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs border-neutral-700 text-neutral-400"
                            >
                              {driver.name_acronym}
                            </Badge>
                            {driver.country_code && (
                              <span className="text-xs text-neutral-500">
                                <Flag className="w-3 h-3 inline mr-1" />
                                {driver.country_code}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Team Color Indicator */}
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className="w-3 h-3 rounded-full ring-2 ring-neutral-700"
                            style={{ backgroundColor: `#${teamColor}` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredDrivers.length === 0 && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No drivers found</h3>
            <p className="text-neutral-400">
              Try adjusting your search query
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DriversSectionSkeleton() {
  return (
    <div className="space-y-4 bg-black min-h-full">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <Skeleton className="h-8 w-48 bg-neutral-800" />
          <Skeleton className="h-10 w-full bg-neutral-800 mt-4" />
        </CardHeader>
      </Card>
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <Skeleton className="h-6 w-32 bg-neutral-800" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(2)].map((_, j) => (
                <Skeleton key={j} className="h-20 bg-neutral-800" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
