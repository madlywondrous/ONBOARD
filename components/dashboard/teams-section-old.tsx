"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Flag, Trophy, Users, TrendingUp } from "lucide-react"

interface Team {
  name: string
  color: string
  drivers: {
    number: number
    name: string
    acronym: string
  }[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Constructor standings (example - replace with real API)
const constructorStandings: Record<string, { position: number; points: number; wins: number }> = {
  "Red Bull Racing": { position: 1, points: 650, wins: 14 },
  "Ferrari": { position: 2, points: 520, wins: 8 },
  "Mercedes": { position: 3, points: 480, wins: 6 },
  // ... more teams
}

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
      
      // Sort teams by standings position (or alphabetically if no standings)
      const sortedTeams = data.sort((a: Team, b: Team) => {
        const aPos = constructorStandings[a.name]?.position || 999
        const bPos = constructorStandings[b.name]?.position || 999
        return aPos - bPos
      })
      
      setTeams(sortedTeams)
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
    <div className="space-y-4 bg-black min-h-full p-6">
      {/* Header */}
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Flag className="w-8 h-8 text-red-500" />
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                2025 Constructor Championship
              </CardTitle>
              <p className="text-neutral-400 text-sm mt-1">
                {teams.length} teams competing
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {teams.map((team) => {
          const standings = constructorStandings[team.name] || { position: 0, points: 0, wins: 0 }
          
          return (
            <Card
              key={team.name}
              className="bg-neutral-900 border-neutral-700 hover:border-neutral-600 transition-colors"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-16 rounded"
                      style={{ backgroundColor: team.color ? `#${team.color}` : '#666' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        {standings.position > 0 && (
                          <Badge variant="outline" className="text-xs">
                            P{standings.position}
                          </Badge>
                        )}
                        <CardTitle className="text-xl text-white">
                          {team.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{team.drivers.length} drivers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Points */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{standings.points}</div>
                    <div className="text-xs text-neutral-400">points</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Drivers */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-semibold text-neutral-400 uppercase">Drivers</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {team.drivers.map((driver) => (
                      <div
                        key={driver.number}
                        className="flex items-center gap-2 p-2 rounded bg-neutral-800"
                      >
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: `#${team.color}` }}
                        >
                          {driver.number}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {driver.acronym}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {driver.name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-800">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs">Wins</span>
                    </div>
                    <div className="text-xl font-bold text-white">{standings.wins}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                      <Flag className="w-4 h-4" />
                      <span className="text-xs">Podiums</span>
                    </div>
                    <div className="text-xl font-bold text-white">0</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Poles</span>
                    </div>
                    <div className="text-xl font-bold text-white">0</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {teams.length === 0 && (
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="py-12 text-center">
            <p className="text-neutral-400">No team data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TeamsSectionSkeleton() {
  return (
    <div className="space-y-4 bg-black min-h-full p-6">
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-neutral-900 border-neutral-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-2 h-16 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-12 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(2)].map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
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
