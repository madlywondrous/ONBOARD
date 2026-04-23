"use client"

import { useMemo } from "react"
import useSWR from "swr"
import type { Race, Session } from "@/lib/types"
import { loadF1CalendarData } from "@/lib/data"

// SWR fetcher function
const fetcher = () => loadF1CalendarData()

export function useF1Calendar(raceData?: Race[]) {
  // Use SWR for caching and revalidation
  const { data: races, error, isLoading, mutate } = useSWR<Race[]>(
    raceData ? null : 'f1-calendar', // Skip if raceData provided
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
      errorRetryCount: 3,
    }
  )

  const finalRaces = raceData || races || []

  // Memoized calculations to prevent unnecessary recalculations
  const raceStats = useMemo(() => {
    const completed = finalRaces.filter(race => race.status === "completed").length
    const upcoming = finalRaces.filter(race => race.status === "upcoming").length
    const live = finalRaces.filter(race => race.status === "live").length
    const totalCountries = new Set(finalRaces.map(race => race.country)).size

    return {
      completedRaces: completed,
      upcomingRaces: upcoming,
      liveRaces: live,
      totalCountries,
      totalRaces: finalRaces.length
    }
  }, [finalRaces])

  const retry = () => {
    mutate() // Re-fetch data
  }

  return {
    races: finalRaces,
    loading: isLoading,
    error: error?.message || null,
    retry,
    ...raceStats
  }
}