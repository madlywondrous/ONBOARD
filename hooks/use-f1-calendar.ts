"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Race, Session } from "@/lib/types"
import { loadF1CalendarData } from "@/lib/data"

// Global cache to prevent multiple API calls
let globalCache: {
  data: Race[] | null
  timestamp: number
  promise: Promise<Race[]> | null
} = {
  data: null,
  timestamp: 0,
  promise: null
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useF1Calendar(raceData?: Race[]) {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRaces = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // If raceData is provided, use it directly
      if (raceData) {
        setRaces(raceData)
        return
      }

      // Check cache first
      const now = Date.now()
      if (globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
        setRaces(globalCache.data)
        return
      }

      // If there's already a pending request, wait for it
      if (globalCache.promise) {
        const data = await globalCache.promise
        setRaces(data)
        return
      }

      // Create new request
      globalCache.promise = loadF1CalendarData()
      const data = await globalCache.promise
      
      // Update cache
      globalCache.data = data
      globalCache.timestamp = now
      globalCache.promise = null
      
      setRaces(data)
    } catch (err) {
      console.error("Error loading races:", err)
      setError(err instanceof Error ? err.message : "Failed to load race calendar data")
      globalCache.promise = null
    } finally {
      setLoading(false)
    }
  }, [raceData])

  useEffect(() => {
    loadRaces()
  }, [loadRaces])

  // Memoized calculations to prevent unnecessary recalculations
  const raceStats = useMemo(() => {
    const completed = races.filter(race => race.status === "completed").length
    const upcoming = races.filter(race => race.status === "upcoming").length
    const live = races.filter(race => race.status === "live").length
    const totalCountries = new Set(races.map(race => race.country)).size

    return {
      completedRaces: completed,
      upcomingRaces: upcoming,
      liveRaces: live,
      totalCountries,
      totalRaces: races.length
    }
  }, [races])

  const retry = useCallback(() => {
    // Clear cache and retry
    globalCache.data = null
    globalCache.timestamp = 0
    globalCache.promise = null
    loadRaces()
  }, [loadRaces])

  return {
    races,
    loading,
    error,
    retry,
    ...raceStats
  }
}