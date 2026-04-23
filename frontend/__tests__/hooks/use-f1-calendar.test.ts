import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useF1Calendar } from '@/hooks/use-f1-calendar'
import type { Race } from '@/lib/types'
import * as f1Data from '@/lib/data'

// Mock the data loading function
vi.mock('@/lib/data', async () => {
  const actual = await vi.importActual('@/lib/data')
  return {
    ...actual,
    loadF1CalendarData: vi.fn(),
  }
})

const mockLoadF1CalendarData = vi.mocked(f1Data.loadF1CalendarData)

describe('useF1Calendar', () => {
  const mockRaces: Race[] = [
    {
      id: '1-australian-grand-prix',
      name: 'Australian Grand Prix',
      circuit: 'Albert Park Circuit',
      country: 'Australia',
      city: 'Melbourne',
      date: '2025-03-16',
      time: '10:30',
      round: 1,
      status: 'upcoming',
      url: 'https://www.formula1.com/en/racing/2025/australian-grand-prix',
      circuitUrl: 'https://www.formula1.com/en/racing/2025/circuits/albert-park',
      sessions: {
        practice1: '2025-03-14T10:30:00',
        practice2: '2025-03-14T14:00:00',
        practice3: '2025-03-15T10:30:00',
        qualifying: '2025-03-15T14:00:00',
        race: '2025-03-16T10:30:00'
      }
    },
    {
      id: '2-chinese-grand-prix',
      name: 'Chinese Grand Prix',
      circuit: 'Shanghai International Circuit',
      country: 'China',
      city: 'Shanghai',
      date: '2025-03-23',
      time: '07:00',
      round: 2,
      status: 'upcoming',
      url: 'https://www.formula1.com/en/racing/2025/chinese-grand-prix',
      circuitUrl: 'https://www.formula1.com/en/racing/2025/circuits/shanghai-international',
      sessions: {
        practice1: '2025-03-21T03:30:00',
        practice2: '2025-03-21T07:00:00',
        practice3: '2025-03-22T03:30:00',
        qualifying: '2025-03-22T07:00:00',
        race: '2025-03-23T07:00:00'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadF1CalendarData.mockResolvedValue(mockRaces)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should load races from data transformation layer when no raceData provided', async () => {
    const { result } = renderHook(() => useF1Calendar())

    expect(result.current.loading).toBe(true)
    expect(result.current.races).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockLoadF1CalendarData).toHaveBeenCalledTimes(1)
    expect(result.current.races).toEqual(mockRaces)
    expect(result.current.error).toBeNull()
  })

  it('should not be in a loading state when raceData is provided', async () => {
    const { result } = renderHook(() => useF1Calendar(mockRaces))

    expect(result.current.loading).toBe(false)

    await waitFor(() => {
      expect(mockLoadF1CalendarData).not.toHaveBeenCalled()
    })

    expect(result.current.races).toEqual(mockRaces)
  })

  it('should handle loading errors gracefully', async () => {
    const errorMessage = 'Failed to load data'
    mockLoadF1CalendarData.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useF1Calendar())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.races).toEqual([])
  })

  it('should calculate race statistics correctly', async () => {
    const racesWithDifferentStatuses: Race[] = [
      { ...mockRaces[0], status: 'completed' },
      { ...mockRaces[1], status: 'upcoming' },
      {
        ...mockRaces[0],
        id: '3-test-race',
        country: 'Italy',
        status: 'upcoming'
      }
    ]

    const { result } = renderHook(() => useF1Calendar(racesWithDifferentStatuses))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.completedRaces).toBe(1)
    expect(result.current.upcomingRaces).toBe(2)
    expect(result.current.totalCountries).toBe(3) // Australia, China, Italy
  })
})
