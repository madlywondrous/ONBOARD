"use client"

import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Award, RefreshCw, ShieldHalf, Trophy } from "lucide-react"
import { useF1Standings } from "@/hooks/use-standings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatGapValue, formatPointsValue } from "@/lib/utils"
import type {
  ConstructorStanding,
  ConstructorStandingsResponse,
  DriverStanding,
  DriverStandingsResponse,
} from "@/lib/types"

const formatRelativeTime = (isoTimestamp?: string) => {
  if (!isoTimestamp) {
    return "Unknown"
  }

  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown"
  }

  return formatDistanceToNow(parsed, { addSuffix: true })
}

export function StandingsSection() {
  const { driverStandings, constructorStandings, loading, error, refresh } = useF1Standings()

  if (loading) {
    return <StandingsSectionSkeleton />
  }

  if (error) {
    return <StandingsSectionError message={error} onRetry={refresh} />
  }

  if (!driverStandings || !constructorStandings) {
    return <StandingsSectionError message="Standings data is not available yet" onRetry={refresh} />
  }

  const seasonLabel = driverStandings.season ? `Season ${driverStandings.season}` : "Current Season"
  const roundLabel = driverStandings.round ? `Round ${driverStandings.round}` : null
  const lastUpdatedLabel = formatRelativeTime(driverStandings.lastUpdated || constructorStandings.lastUpdated)

  return (
    <div className="space-y-4 bg-black min-h-full pb-6">
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-white text-2xl">
              <Trophy className="h-6 w-6 text-red-500" />
              2025 Championship Standings
            </CardTitle>
            <CardDescription className="text-neutral-400">
              {seasonLabel}
              {roundLabel ? ` · ${roundLabel}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-neutral-700 text-neutral-300">
              Source: {driverStandings.source}
            </Badge>
            <Badge variant="outline" className="border-neutral-700 text-neutral-300">
              Updated {lastUpdatedLabel}
            </Badge>
            <Button
              variant="secondary"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                refresh().catch((err) => {
                  console.error("Failed to refresh standings", err)
                })
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DriverStandingsCard title="Drivers Championship" data={driverStandings} />
        <ConstructorStandingsCard title="Constructors Championship" data={constructorStandings} />
      </div>
    </div>
  )
}

interface StandingsCardProps<T> {
  title: string
  data: T
}

function DriverStandingsCard({ title, data }: StandingsCardProps<DriverStandingsResponse>) {
  const leaderPoints = useMemo(() => data.standings[0]?.points ?? 1, [data.standings])

  return (
    <Card className="bg-neutral-900/80 border-neutral-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Award className="h-5 w-5 text-red-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-neutral-400">
          {data.standings.length} drivers ranked by points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
  {data.standings.map((standing: DriverStanding, index: number) => {
          const highlight = index < 3
          const progress = Math.max(6, Math.min(100, (standing.points / leaderPoints) * 100))

          return (
            <div
              key={`${standing.driver.code ?? standing.driver.fullName}-${standing.position}`}
              className={cn(
                "relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-colors hover:border-neutral-700",
                highlight && "border-red-500/40 bg-red-500/10"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md bg-neutral-800 text-sm font-semibold text-neutral-200",
                  highlight && "bg-red-600 text-white"
                )}
                >
                  {standing.position}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-white font-semibold truncate">
                      {standing.driver.fullName || "Unknown Driver"}
                    </p>
                    {standing.driver.code && (
                      <Badge variant="outline" className="border-neutral-700 text-neutral-300">
                        {standing.driver.code}
                      </Badge>
                    )}
                    {standing.constructor?.name && (
                      <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                        {standing.constructor.name}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-400">
                    <span>Wins: {standing.wins}</span>
                    <span>Gap: {formatGapValue(standing.pointsGapToLeader)}</span>
                    {standing.pointsGapToPrevious !== 0 && (
                      <span>Prev: {formatGapValue(standing.pointsGapToPrevious)}</span>
                    )}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {formatPointsValue(standing.points)}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">pts</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function ConstructorStandingsCard({ title, data }: StandingsCardProps<ConstructorStandingsResponse>) {
  const leaderPoints = useMemo(() => data.standings[0]?.points ?? 1, [data.standings])

  return (
    <Card className="bg-neutral-900/80 border-neutral-800">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <ShieldHalf className="h-5 w-5 text-red-500" />
          {title}
        </CardTitle>
        <CardDescription className="text-neutral-400">
          {data.standings.length} teams in the fight for glory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
  {data.standings.map((standing: ConstructorStanding, index: number) => {
          const highlight = index < 3
          const progress = Math.max(6, Math.min(100, (standing.points / leaderPoints) * 100))

          return (
            <div
              key={`${standing.constructor?.constructorId ?? standing.constructor?.name ?? index}`}
              className={cn(
                "relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-colors hover:border-neutral-700",
                highlight && "border-red-500/40 bg-red-500/10"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md bg-neutral-800 text-sm font-semibold text-neutral-200",
                  highlight && "bg-red-600 text-white"
                )}
                >
                  {standing.position}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-white font-semibold truncate">
                      {standing.constructor?.name ?? "Team"}
                    </p>
                    <Badge variant="outline" className="border-neutral-700 text-neutral-300">
                      Wins: {standing.wins}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-400">
                    <span>Gap: {formatGapValue(standing.pointsGapToLeader)}</span>
                    {standing.pointsGapToPrevious !== 0 && (
                      <span>Prev: {formatGapValue(standing.pointsGapToPrevious)}</span>
                    )}
                    {standing.constructor?.nationality && (
                      <span>{standing.constructor.nationality}</span>
                    )}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-red-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {formatPointsValue(standing.points)}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">pts</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function StandingsSectionSkeleton() {
  return (
    <div className="space-y-4 bg-black min-h-full pb-6">
      <Card className="bg-neutral-900/80 border-neutral-800">
        <CardHeader>
          <Skeleton className="h-8 w-64 bg-neutral-800" />
          <Skeleton className="h-4 w-48 bg-neutral-800" />
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[...Array(2)].map((_, idx) => (
          <Card key={idx} className="bg-neutral-900/80 border-neutral-800">
            <CardHeader>
              <Skeleton className="h-6 w-40 bg-neutral-800" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(6)].map((_, itemIdx) => (
                <Skeleton key={itemIdx} className="h-20 w-full bg-neutral-800" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StandingsSectionError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center bg-black">
      <Card className="max-w-lg bg-neutral-900/80 border-neutral-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="text-white">Unable to show standings</CardTitle>
          <CardDescription className="text-neutral-400">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            variant="secondary"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              onRetry().catch((err) => {
                console.error("Retrying standings load failed", err)
              })
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
