"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  ConstructorStanding,
  ConstructorStandingsResponse,
  DriverStanding,
  DriverStandingsResponse,
} from "@/lib/types"

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ""
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "")
const HAS_CUSTOM_API_BASE = API_BASE_URL.length > 0

interface UseF1StandingsResult {
  driverStandings: DriverStandingsResponse | null
  constructorStandings: ConstructorStandingsResponse | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const buildEndpoint = (path: string) => (HAS_CUSTOM_API_BASE ? `${API_BASE_URL}${path}` : path)

const fetchWithFallback = async (path: string): Promise<Response> => {
  const requestInit: RequestInit = { cache: "no-store" }
  const primary = await fetch(buildEndpoint(path), requestInit)

  if (primary.ok || !HAS_CUSTOM_API_BASE || primary.status !== 404) {
    return primary
  }

  console.warn(`Primary API base returned 404 for ${path}, retrying relative path`)
  return fetch(path, requestInit)
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeDriverStanding = (entry: any): DriverStanding => {
  const driverPayload = entry?.driver ?? entry?.Driver ?? {}
  const constructorPayload = entry?.constructor ?? entry?.Constructor ?? {}

  const fullName =
    entry?.fullName ||
    driverPayload?.fullName ||
    entry?.full_name ||
    driverPayload?.full_name ||
    [driverPayload?.givenName || driverPayload?.given_name || "", driverPayload?.familyName || driverPayload?.family_name || ""]
      .join(" ")
      .trim()

  const code =
    entry?.code ||
    driverPayload?.code ||
    driverPayload?.permanentNumber ||
    driverPayload?.number ||
    driverPayload?.name_acronym ||
    (driverPayload?.familyName || driverPayload?.family_name || "?")
      .slice(0, 3)
      .toUpperCase()

  return {
    position: toNumber(entry?.position, 0),
    points: toNumber(entry?.points, 0),
    wins: toNumber(entry?.wins, 0),
    pointsGapToLeader: toNumber(
      entry?.pointsGapToLeader ?? entry?.points_gap_to_leader,
      0
    ),
    pointsGapToPrevious: toNumber(
      entry?.pointsGapToPrevious ?? entry?.points_gap_to_previous,
      0
    ),
    driver: {
      code: code || null,
      fullName,
      givenName: driverPayload?.givenName ?? driverPayload?.given_name ?? null,
      familyName: driverPayload?.familyName ?? driverPayload?.family_name ?? null,
      number:
        (driverPayload?.number ?? driverPayload?.permanentNumber ?? entry?.driver_number ?? null) &&
        String(driverPayload?.number ?? driverPayload?.permanentNumber ?? entry?.driver_number ?? ""),
      nationality: driverPayload?.nationality ?? entry?.nationality ?? null,
    },
    constructor: {
      name: constructorPayload?.name ?? constructorPayload?.constructor_name ?? null,
      constructorId:
        constructorPayload?.constructorId ??
        constructorPayload?.constructor_id ??
        constructorPayload?.id ??
        null,
      nationality: constructorPayload?.nationality ?? null,
    },
  }
}

const normalizeConstructorStanding = (entry: any): ConstructorStanding => {
  const constructorPayload = entry?.constructor ?? entry?.Constructor ?? {}

  return {
    position: toNumber(entry?.position, 0),
    points: toNumber(entry?.points, 0),
    wins: toNumber(entry?.wins, 0),
    pointsGapToLeader: toNumber(
      entry?.pointsGapToLeader ?? entry?.points_gap_to_leader,
      0
    ),
    pointsGapToPrevious: toNumber(
      entry?.pointsGapToPrevious ?? entry?.points_gap_to_previous,
      0
    ),
    constructor: {
      name: constructorPayload?.name ?? constructorPayload?.constructor_name ?? null,
      constructorId:
        constructorPayload?.constructorId ??
        constructorPayload?.constructor_id ??
        constructorPayload?.id ??
        null,
      nationality: constructorPayload?.nationality ?? null,
    },
  }
}

const normalizeDriverStandingsResponse = (payload: any): DriverStandingsResponse => {
  const standings = Array.isArray(payload?.standings) ? payload.standings : []

  const normalizedStandings = standings.map(normalizeDriverStanding)

  return {
    season: String(payload?.season ?? ""),
    round: toNumber(payload?.round, 0),
    lastUpdated: String(payload?.lastUpdated ?? payload?.last_updated ?? ""),
    source: String(payload?.source ?? "unknown"),
    standings: normalizedStandings,
  }
}

const normalizeConstructorStandingsResponse = (payload: any): ConstructorStandingsResponse => {
  const standings = Array.isArray(payload?.standings) ? payload.standings : []

  const normalizedStandings = standings.map(normalizeConstructorStanding)

  return {
    season: String(payload?.season ?? ""),
    round: toNumber(payload?.round, 0),
    lastUpdated: String(payload?.lastUpdated ?? payload?.last_updated ?? ""),
    source: String(payload?.source ?? "unknown"),
    standings: normalizedStandings,
  }
}

export function useF1Standings(): UseF1StandingsResult {
  const [driverStandingsRaw, setDriverStandingsRaw] = useState<DriverStandingsResponse | null>(null)
  const [constructorStandingsRaw, setConstructorStandingsRaw] = useState<ConstructorStandingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchStandings = useCallback(async () => {
    setLoading(true)
    setError(null)

    const driverPath = "/api/standings/drivers"
    const constructorPath = "/api/standings/constructors"

    try {
      const [driverResponse, constructorResponse] = await Promise.all([
        fetchWithFallback(driverPath),
        fetchWithFallback(constructorPath),
      ])

      if (!driverResponse.ok) {
        throw new Error(`Driver standings request failed (${driverResponse.status})`)
      }

      if (!constructorResponse.ok) {
        throw new Error(`Constructor standings request failed (${constructorResponse.status})`)
      }

      const driverData = normalizeDriverStandingsResponse(await driverResponse.json())
      const constructorData = normalizeConstructorStandingsResponse(await constructorResponse.json())

      if (!isMountedRef.current) {
        return
      }

      setDriverStandingsRaw(driverData)
      setConstructorStandingsRaw(constructorData)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load standings"
      console.error("Failed to load standings", err)
      if (isMountedRef.current) {
        setError(message)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchStandings().catch((err) => {
      console.error("Standings fetch failed", err)
    })
    return () => {
      isMountedRef.current = false
    }
  }, [fetchStandings])

  const driverStandings = useMemo(() => driverStandingsRaw, [driverStandingsRaw])
  const constructorStandings = useMemo(() => constructorStandingsRaw, [constructorStandingsRaw])

  return {
    driverStandings,
    constructorStandings,
    loading,
    error,
    refresh: fetchStandings,
  }
}
