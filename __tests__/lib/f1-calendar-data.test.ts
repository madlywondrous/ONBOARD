import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  transformRaceData,
  determineRaceStatus,
  createRaceUrl,
  createCircuitUrl,
  getRacesByStatus,
  getNextRace,
  getCurrentLiveRace
} from '@/lib/data/f1-calendar-data'
import { F1CalendarData, F1RaceData } from '@/lib/types'

// Mock data for testing
const mockRaceData: F1RaceData = {
  round: 1,
  raceName: "Australian Grand Prix",
  circuit: {
    name: "Albert Park Circuit",
    location: {
      city: "Melbourne",
      country: "Australia",
      countryCode: "AU"
    }
  },
  date: "2025-03-16",
  sessions: {
    practice1: {
      date: "2025-03-14",
      time: "10:30",
      duration: 90
    },
    practice2: {
      date: "2025-03-14",
      time: "14:00",
      duration: 90
    },
    practice3: {
      date: "2025-03-15",
      time: "10:30",
      duration: 60
    },
    qualifying: {
      date: "2025-03-15",
      time: "14:00",
      duration: 60
    },
    race: {
      date: "2025-03-16",
      time: "10:30",
      duration: 120
    }
  }
}

const mockCalendarData: F1CalendarData = {
  season: 2025,
  races: [mockRaceData]
}

describe('f1-calendar-data', () => {
  beforeEach(() => {
    // Reset any mocked dates
    vi.restoreAllMocks()
  })

  describe('transformRaceData', () => {
    it('should transform F1 calendar data to Race array', () => {
      const result = transformRaceData(mockCalendarData)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: '1-australian-grand-prix',
        name: 'Australian Grand Prix',
        circuit: 'Albert Park Circuit',
        country: 'Australia',
        city: 'Melbourne',
        date: '2025-03-16',
        time: '10:30',
        round: 1,
        url: 'https://www.formula1.com/en/racing/2025/australian-grand-prix',
        circuitUrl: 'https://www.formula1.com/en/racing/2025/circuits/albert-park'
      })
    })

    it('should transform sessions correctly', () => {
      const result = transformRaceData(mockCalendarData)
      
      expect(result[0].sessions).toEqual({
        practice1: '2025-03-14T10:30:00',
        practice2: '2025-03-14T14:00:00',
        practice3: '2025-03-15T10:30:00',
        qualifying: '2025-03-15T14:00:00',
        race: '2025-03-16T10:30:00'
      })
    })

    it('should handle missing optional sessions', () => {
      const raceWithoutP3: F1RaceData = {
        ...mockRaceData,
        sessions: {
          practice1: mockRaceData.sessions.practice1!,
          practice2: mockRaceData.sessions.practice2!,
          qualifying: mockRaceData.sessions.qualifying!,
          race: mockRaceData.sessions.race
        }
      }

      const result = transformRaceData({ season: 2025, races: [raceWithoutP3] })
      
      expect(result[0].sessions).toEqual({
        practice1: '2025-03-14T10:30:00',
        practice2: '2025-03-14T14:00:00',
        qualifying: '2025-03-15T14:00:00',
        race: '2025-03-16T10:30:00'
      })
      expect(result[0].sessions.practice3).toBeUndefined()
    })
  })

  describe('determineRaceStatus', () => {
    it('should return "upcoming" for future races', () => {
      // Mock current date to be before the race
      vi.setSystemTime(new Date('2025-03-10T10:00:00Z'))
      
      const status = determineRaceStatus(mockRaceData)
      expect(status).toBe('upcoming')
    })

    it('should return "live" for races currently happening', () => {
      // Mock current date to be during the race
      vi.setSystemTime(new Date('2025-03-16T10:45:00Z'))
      
      const status = determineRaceStatus(mockRaceData)
      expect(status).toBe('live')
    })

    it('should return "completed" for past races', () => {
      // Mock current date to be after the race
      vi.setSystemTime(new Date('2025-03-16T13:00:00Z'))
      
      const status = determineRaceStatus(mockRaceData)
      expect(status).toBe('completed')
    })
  })

  describe('createRaceUrl', () => {
    it('should generate correct race URL', () => {
      const url = createRaceUrl('Australian Grand Prix')
      expect(url).toBe('https://www.formula1.com/en/racing/2025/australian-grand-prix')
    })

    it('should handle special characters in race names', () => {
      const url = createRaceUrl('São Paulo Grand Prix')
      expect(url).toBe('https://www.formula1.com/en/racing/2025/so-paulo-grand-prix')
    })

    it('should handle multiple spaces', () => {
      const url = createRaceUrl('United  States   Grand Prix')
      expect(url).toBe('https://www.formula1.com/en/racing/2025/united-states-grand-prix')
    })
  })

  describe('createCircuitUrl', () => {
    it('should generate correct circuit URL', () => {
      const url = createCircuitUrl('Albert Park Circuit')
      expect(url).toBe('https://www.formula1.com/en/racing/2025/circuits/albert-park')
    })

    it('should remove common circuit words', () => {
      const url = createCircuitUrl('Silverstone International Circuit')
      expect(url).toBe('https://www.formula1.com/en/racing/2025/circuits/silverstone')
    })

    it('should handle autodromo names', () => {
      const url = createCircuitUrl('Autodromo Nazionale di Monza')
      expect(url).toBe('https://www.formula1.com/en/racing/2025/circuits/nazionale-di-monza')
    })
  })

  describe('getRacesByStatus', () => {
    it('should filter races by status', () => {
      // Mock to make race upcoming
      vi.setSystemTime(new Date('2025-03-10T10:00:00Z'))
      const races = transformRaceData(mockCalendarData)
      
      const upcomingRaces = getRacesByStatus(races, 'upcoming')
      expect(upcomingRaces).toHaveLength(1)
      expect(upcomingRaces[0].status).toBe('upcoming')
    })

    it('should return empty array when no races match status', () => {
      // Mock to make race upcoming
      vi.setSystemTime(new Date('2025-03-10T10:00:00Z'))
      const races = transformRaceData(mockCalendarData)
      
      const liveRaces = getRacesByStatus(races, 'live')
      expect(liveRaces).toHaveLength(0)
    })
  })

  describe('getNextRace', () => {
    it('should return the next upcoming race', () => {
      // Mock to make both races upcoming
      vi.setSystemTime(new Date('2025-03-10T10:00:00Z'))
      
      const multipleRaces: F1CalendarData = {
        season: 2025,
        races: [
          mockRaceData,
          {
            ...mockRaceData,
            round: 2,
            raceName: "Chinese Grand Prix",
            date: "2025-03-23",
            sessions: {
              ...mockRaceData.sessions,
              race: { date: "2025-03-23", time: "12:30", duration: 120 }
            }
          }
        ]
      }

      const races = transformRaceData(multipleRaces)
      
      const nextRace = getNextRace(races)
      expect(nextRace?.name).toBe('Australian Grand Prix')
      expect(nextRace?.date).toBe('2025-03-16')
    })

    it('should return null when no upcoming races', () => {
      // Mock to make race completed
      vi.setSystemTime(new Date('2025-03-20T10:00:00Z'))
      const races = transformRaceData(mockCalendarData)
      
      const nextRace = getNextRace(races)
      expect(nextRace).toBeNull()
    })
  })

  describe('getCurrentLiveRace', () => {
    it('should return live race when one exists', () => {
      // Mock to make race live
      vi.setSystemTime(new Date('2025-03-16T10:45:00Z'))
      const races = transformRaceData(mockCalendarData)
      
      const liveRace = getCurrentLiveRace(races)
      expect(liveRace?.name).toBe('Australian Grand Prix')
      expect(liveRace?.status).toBe('live')
    })

    it('should return null when no live races', () => {
      // Mock to make race upcoming
      vi.setSystemTime(new Date('2025-03-10T10:00:00Z'))
      const races = transformRaceData(mockCalendarData)
      
      const liveRace = getCurrentLiveRace(races)
      expect(liveRace).toBeNull()
    })
  })
})