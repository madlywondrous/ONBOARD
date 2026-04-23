export interface F1Period {
  start: string
  end: string
  name: string
  status: 'upcoming' | 'active' | 'completed'
}

export interface F1Race {
  name: string
  date: string
  country: string
  circuit: string
}

export const F1_2025_CALENDAR = {
  preSeasonTesting: {
    start: '2025-02-26',
    end: '2025-02-28',
    name: 'Pre-Season Testing',
    venue: 'Bahrain International Circuit'
  },
  
  races: [
    { name: 'Australian Grand Prix', date: '2025-03-16', country: 'Australia', circuit: 'Albert Park' },
    // Add more races as needed
  ] as F1Race[],
  
  summerBreak: {
    start: '2025-08-04',
    end: '2025-08-28',
    name: 'Summer Break'
  },
  
  postSeasonTesting: {
    start: '2025-12-09', 
    end: '2025-12-10',
    name: 'Post-Season Testing',
    venue: 'Yas Marina Circuit'
  },
  
  winterBreak: {
    start: '2025-12-15',
    end: '2026-02-25', 
    name: 'Winter Break'
  }
}

export function getCurrentSeasonStatus(currentRaceWeekend?: { name: string; country: string; isLive?: boolean }): {
  status: 'PRE_SEASON' | 'SEASON_ACTIVE' | 'SUMMER_BREAK' | 'POST_SEASON' | 'WINTER_BREAK' | 'RACE_WEEKEND'
  message: string
  indicator: 'green' | 'yellow' | 'red' | 'blue'
} {
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0]
  
  // If there's a current race weekend, prioritize showing that
  if (currentRaceWeekend) {
    return {
      status: 'RACE_WEEKEND',
      message: currentRaceWeekend.isLive ? `LIVE: ${currentRaceWeekend.country.toUpperCase()} GP` : `${currentRaceWeekend.country.toUpperCase()} GP WEEKEND`,
      indicator: currentRaceWeekend.isLive ? 'red' : 'green'
    }
  }
  
  // Pre-season testing
  if (currentDate >= F1_2025_CALENDAR.preSeasonTesting.start && 
      currentDate <= F1_2025_CALENDAR.preSeasonTesting.end) {
    return {
      status: 'PRE_SEASON',
      message: 'PRE-SEASON TESTING',
      indicator: 'blue'
    }
  }
  
  // Season active (March 14 - August 3)
  if (currentDate >= '2025-03-14' && currentDate < F1_2025_CALENDAR.summerBreak.start) {
    return {
      status: 'SEASON_ACTIVE',
      message: 'SEASON LIVE',
      indicator: 'green'
    }
  }
  
  // Summer break
  if (currentDate >= F1_2025_CALENDAR.summerBreak.start && 
      currentDate <= F1_2025_CALENDAR.summerBreak.end) {
    return {
      status: 'SUMMER_BREAK',
      message: 'SUMMER BREAK',
      indicator: 'yellow'
    }
  }
  
  // Season active (August 31 - December 7)
  if (currentDate >= '2025-08-31' && currentDate <= '2025-12-07') {
    return {
      status: 'SEASON_ACTIVE',
      message: 'SEASON LIVE',
      indicator: 'green'
    }
  }
  
  // Post-season testing
  if (currentDate >= F1_2025_CALENDAR.postSeasonTesting.start && 
      currentDate <= F1_2025_CALENDAR.postSeasonTesting.end) {
    return {
      status: 'POST_SEASON',
      message: 'POST-SEASON TEST',
      indicator: 'blue'
    }
  }
  
  // Winter break (default)
  return {
    status: 'WINTER_BREAK',
    message: 'WINTER BREAK',
    indicator: 'red'
  }
}

export function getNextEvent(): { name: string; date: string; daysUntil: number } | null {
  const now = new Date()
  const currentDate = now.toISOString().split('T')[0]
  
  // Find next upcoming event
  const allEvents = [
    { name: 'Pre-Season Testing', date: F1_2025_CALENDAR.preSeasonTesting.start },
    { name: 'Australian Grand Prix', date: '2025-03-16' },
    { name: 'Summer Break', date: F1_2025_CALENDAR.summerBreak.start },
    { name: 'Dutch Grand Prix', date: '2025-08-31' },
    { name: 'Abu Dhabi Grand Prix', date: '2025-12-07' },
    { name: 'Post-Season Testing', date: F1_2025_CALENDAR.postSeasonTesting.start }
  ]
  
  const upcomingEvents = allEvents
    .filter(event => event.date > currentDate)
    .sort((a, b) => a.date.localeCompare(b.date))
  
  if (upcomingEvents.length === 0) return null
  
  const nextEvent = upcomingEvents[0]
  const eventDate = new Date(nextEvent.date)
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    ...nextEvent,
    daysUntil
  }
}
