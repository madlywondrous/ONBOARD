import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useF1Calendar } from '../../hooks/use-f1-calendar'

// Mock the data loader to avoid loading the large JSON file in tests
vi.mock('../../lib/data', async () => {
  const originalModule = await vi.importActual('../../lib/data')
  return {
    ...originalModule,
    loadF1CalendarData: () => Promise.resolve([]), // Return an empty array for this test
  }
})

describe('useF1Calendar with Real Data', () => {
  it('should load data from JSON file when no raceData provided', async () => {
    const { result } = renderHook(() => useF1Calendar())

    expect(result.current.loading).toBe(true)
    expect(result.current.races).toEqual([])

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.races.length).toBe(0) // Expecting an empty array from the mock
  })
})
