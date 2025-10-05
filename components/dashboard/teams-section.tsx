"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Users, TrendingUp, Flag } from "lucide-react"

interface Team {
  name: string
  color: string
  drivers: Array<{
    number: number
    name: string
    acronym: string
  }>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function TeamsSection() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams`)
      const data = await response.json()
      setTeams(data)
    } catch (error) {
      console.error("Failed to fetch teams:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <TeamsSectionSkeleton />
  }

  return (
    <div className="space-y-4 bg-black min-h-full">
      {/* Header */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-red-500" />
              F1 Teams 2025
            </CardTitle>
            <Badge variant="outline" className="text-white border-neutral-700">
              {teams.length} Teams
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team, index) => (
          <Card
            key={team.name}
            className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all group cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl text-white"
                    style={{
                      background: `linear-gradient(135deg, #${team.color}44, #${team.color}88)`
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-neutral-900"
                    style={{ backgroundColor: `#${team.color}` }}
                  />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg text-white group-hover:text-red-400 transition-colors">
                    {team.name}
                  </CardTitle>
                  <p className="text-sm text-neutral-500">
                    {team.drivers.length} drivers
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Drivers */}
              <div className="space-y-2">
                {team.drivers.map((driver) => (
                  <div
                    key={driver.number}
                    className="bg-neutral-800/50 rounded-lg p-3 flex items-center gap-3 hover:bg-neutral-800 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, #${team.color}22, #${team.color}44)`
                      }}
                    >
                      {driver.number}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{driver.name}</p>
                      <Badge
                        variant="outline"
                        className="text-xs mt-1 border-neutral-700 text-neutral-400"
                      >
                        {driver.acronym}
                      </Badge>
                    </div>
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: `#${team.color}` }}
                    />
                  </div>
                ))}
              </div>

              {/* Team Stats Placeholder */}
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-neutral-500">Points</p>
                    <p className="text-lg font-bold text-white">-</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Wins</p>
                    <p className="text-lg font-bold text-white">-</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Podiums</p>
                    <p className="text-lg font-bold text-white">-</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {teams.length === 0 && (
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No teams available</h3>
            <p className="text-neutral-400">
              Team data will be loaded when available
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TeamsSectionSkeleton() {
  return (
    <div className="space-y-4 bg-black min-h-full">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <Skeleton className="h-8 w-48 bg-neutral-800" />
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-neutral-800" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-16 bg-neutral-800" />
                <Skeleton className="h-16 bg-neutral-800" />
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-12 bg-neutral-800" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
