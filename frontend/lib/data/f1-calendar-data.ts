import { F1CalendarData, F1RaceData, Race, RaceStatus, Session } from '@/lib/types'
import { validateRace } from '@/lib/validation'
import { F1_CONFIG } from '@/lib/config'

/**
 * Transform F1 calendar JSON data to Race interface format
 */
export function transformRaceData(jsonData: F1CalendarData): Race[] {
  return jsonData.races.map(transformSingleRace)
}

/**
 * Transform a single race from JSON format to Race interface
 */
function transformSingleRace(raceData: F1RaceData): Race {
  const raceId = generateRaceId(raceData.raceName, raceData.round)
  
  const race: Race = {
    id: raceId,
    name: raceData.raceName,
    circuit: raceData.circuit.name,
    country: raceData.circuit.location.country,
    city: raceData.circuit.location.city,
    date: raceData.date,
    time: raceData.sessions.race.time,
    round: raceData.round,
    status: determineRaceStatus(raceData),
    url: createRaceUrl(raceData.raceName),
    circuitUrl: createCircuitUrl(raceData.circuit.name),
    sessions: transformSessions(raceData.sessions)
  }

  // Validate the transformed race data
  return validateRace(race)
}

/**
 * Generate a unique race ID from race name and round
 */
function generateRaceId(raceName: string, round: number): string {
  const cleanName = raceName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return `${round}-${cleanName}`
}

/**
 * Determine race status based on current date and race date
 */
export function determineRaceStatus(raceData: F1RaceData): RaceStatus {
  const now = new Date()
  
  // Parse race date and time - assuming times are in UTC
  const raceDateTime = new Date(`${raceData.date}T${raceData.sessions.race.time}:00.000Z`)
  const raceDuration = raceData.sessions.race.duration * 60 * 1000 // Convert minutes to milliseconds
  const raceEndTime = new Date(raceDateTime.getTime() + raceDuration)

  // Check if race is currently live
  if (now >= raceDateTime && now <= raceEndTime) {
    return "live"
  }

  // Check if race is completed
  if (now > raceEndTime) {
    return "completed"
  }

  // Race is upcoming
  return "upcoming"
}

/**
 * Transform sessions object to the expected format
 */
function transformSessions(sessions: F1RaceData['sessions']) {
  const transformedSessions: Race['sessions'] = {
    race: `${sessions.race.date}T${sessions.race.time}:00`
  }

  if (sessions.practice1) {
    transformedSessions.practice1 = `${sessions.practice1.date}T${sessions.practice1.time}:00`
  }

  if (sessions.practice2) {
    transformedSessions.practice2 = `${sessions.practice2.date}T${sessions.practice2.time}:00`
  }

  if (sessions.practice3) {
    transformedSessions.practice3 = `${sessions.practice3.date}T${sessions.practice3.time}:00`
  }

  if (sessions.qualifying) {
    transformedSessions.qualifying = `${sessions.qualifying.date}T${sessions.qualifying.time}:00`
  }

  return transformedSessions
}

/**
 * Generate URL for race information page
 */
export function createRaceUrl(raceName: string): string {
  const cleanName = raceName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return `https://www.formula1.com/en/racing/${F1_CONFIG.currentSeason}/${cleanName}`
}

/**
 * Generate URL for circuit information page
 */
export function createCircuitUrl(circuitName: string): string {
  const cleanName = circuitName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/circuit|international|autodrome|autodromo/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://www.formula1.com/en/racing/${F1_CONFIG.currentSeason}/circuits/${cleanName}`
}

export async function loadF1CalendarData(): Promise<Race[]> {
  try {
    const year = F1_CONFIG.currentSeason
    const [meetingsRes, sessionsRes] = await Promise.all([
      fetch(`https://api.openf1.org/v1/meetings?year=${year}`),
      fetch(`https://api.openf1.org/v1/sessions?year=${year}`)
    ])

    if (!meetingsRes.ok || !sessionsRes.ok) {
      throw new Error('Failed to fetch from OpenF1 API')
    }

    const meetings = await meetingsRes.json()
    const sessions = await sessionsRes.json()

    interface OpenF1Meeting {
      meeting_key: number
      meeting_name: string
      circuit_short_name: string
      country_name: string
      location: string
      date_start: string
      circuit_image?: string
    }

    interface OpenF1Session {
      meeting_key: number
      session_name: string
      date_start: string
    }

    // Group sessions by meeting_key
    const sessionsByMeeting = sessions.reduce((acc: Record<number, OpenF1Session[]>, session: OpenF1Session) => {
      if (!acc[session.meeting_key]) {
        acc[session.meeting_key] = []
      }
      acc[session.meeting_key].push(session)
      return acc
    }, {})

    // Filter out testing and map to Race
    const races: Race[] = meetings
      .filter((meeting: OpenF1Meeting) => !meeting.meeting_name.toLowerCase().includes('testing'))
      .map((meeting: OpenF1Meeting, index: number) => {
        const meetingSessions = sessionsByMeeting[meeting.meeting_key] || []
        const sessionMap: Record<string, string> = {}

        meetingSessions.forEach((s: OpenF1Session) => {
          if (s.session_name === 'Practice 1') sessionMap.practice1 = s.date_start
          if (s.session_name === 'Practice 2') sessionMap.practice2 = s.date_start
          if (s.session_name === 'Practice 3') sessionMap.practice3 = s.date_start
          if (s.session_name === 'Qualifying') sessionMap.qualifying = s.date_start
          if (s.session_name === 'Sprint') sessionMap.sprint = s.date_start
          if (s.session_name === 'Sprint Shootout' || s.session_name === 'Sprint Qualifying') sessionMap.sprintQualifying = s.date_start
          if (s.session_name === 'Race') sessionMap.race = s.date_start
        })

        // OpenF1 gives dates with timezone. Extract YYYY-MM-DD for the race date
        // Fallback to meeting.date_start if sessionMap.race is somehow missing
        const raceDateStart = sessionMap.race || meeting.date_start
        const raceDate = raceDateStart.split('T')[0]
        
        const race: Race = {
          id: generateRaceId(meeting.meeting_name, index + 1),
          name: meeting.meeting_name,
          circuit: meeting.circuit_short_name,
          country: meeting.country_name,
          city: meeting.location,
          date: raceDate,
          time: raceDateStart.split('T')[1].substring(0, 5),
          round: index + 1,
          status: 'upcoming',
          url: createRaceUrl(meeting.meeting_name),
          circuitUrl: createCircuitUrl(meeting.circuit_short_name),
          circuitImage: meeting.circuit_image,
          sessions: {
            race: raceDateStart,
            practice1: sessionMap.practice1,
            practice2: sessionMap.practice2,
            practice3: sessionMap.practice3,
            qualifying: sessionMap.qualifying,
          }
        }

        // Re-evaluate status based on complete dates
        race.status = determineRaceStatusFromDates(race)
        return race
      })

    return races
  } catch (error) {
    console.warn('Error loading F1 calendar from OpenF1 API, falling back to Jolpi/Ergast API:', error)
    
    try {
      const fallbackRes = await fetch('https://api.jolpi.ca/ergast/f1/current.json')
      if (!fallbackRes.ok) throw new Error('Jolpi fallback failed')
      
      const fallbackData = await fallbackRes.json()
      const races = fallbackData.MRData.RaceTable.Races
      
      const parsedRaces: Race[] = races.map((r: any) => {
        const raceDateStart = `${r.date}T${r.time || '15:00:00Z'}`
        const race: Race = {
          id: generateRaceId(r.raceName, parseInt(r.round)),
          name: r.raceName,
          circuit: r.Circuit.circuitName,
          country: r.Circuit.Location.country,
          city: r.Circuit.Location.locality,
          date: r.date,
          time: r.time ? r.time.replace('Z', '') : '15:00:00',
          round: parseInt(r.round),
          status: 'upcoming', 
          url: createRaceUrl(r.raceName),
          circuitUrl: createCircuitUrl(r.Circuit.circuitName),
          sessions: {
            race: raceDateStart,
            practice1: r.FirstPractice ? `${r.FirstPractice.date}T${r.FirstPractice.time}` : undefined,
            practice2: r.SecondPractice ? `${r.SecondPractice.date}T${r.SecondPractice.time}` : undefined,
            practice3: r.ThirdPractice ? `${r.ThirdPractice.date}T${r.ThirdPractice.time}` : undefined,
            qualifying: r.Qualifying ? `${r.Qualifying.date}T${r.Qualifying.time}` : undefined,
            sprint: r.Sprint ? `${r.Sprint.date}T${r.Sprint.time}` : undefined,
            sprintQualifying: r.SprintQualifying ? `${r.SprintQualifying.date}T${r.SprintQualifying.time}` : undefined,
          }
        }
        race.status = determineRaceStatusFromDates(race)
        return race
      })
      
      return parsedRaces
    } catch (fallbackError) {
      console.warn('Fallback to Jolpi failed, using hardcoded JSON:', fallbackError)
      const jsonData = await import('./f1-2025-calendar.json')
      return transformRaceData(jsonData.default)
    }
  }
}

function determineRaceStatusFromDates(race: Race): RaceStatus {
  const now = new Date()
  const raceDateTime = new Date(race.sessions.race)
  // Assume a race takes roughly 2 hours
  const raceEndTime = new Date(raceDateTime.getTime() + 2 * 60 * 60 * 1000)
  
  if (now >= raceDateTime && now <= raceEndTime) return "live"
  if (now > raceEndTime) return "completed"
  return "upcoming"
}

/**
 * Get races by status
 */
export function getRacesByStatus(races: Race[], status: RaceStatus): Race[] {
  return races.filter(race => race.status === status)
}

/**
 * Get next upcoming race
 */
export function getNextRace(races: Race[]): Race | null {
  const upcomingRaces = getRacesByStatus(races, 'upcoming')
  if (upcomingRaces.length === 0) return null
  
  return upcomingRaces.reduce((earliest, current) => {
    const earliestDate = new Date(`${earliest.date}T${earliest.time}:00`)
    const currentDate = new Date(`${current.date}T${current.time}:00`)
    return currentDate < earliestDate ? current : earliest
  })
}

/**
 * Get current live race if any
 */
export function getCurrentLiveRace(races: Race[]): Race | null {
  const liveRaces = getRacesByStatus(races, 'live')
  return liveRaces.length > 0 ? liveRaces[0] : null
}

export function getCurrentOrNextSession(races: Race[]): Session | null {
  const now = new Date();
  let nextSession: Session | null = null;

  for (const race of races) {
    const sessions = [
      { type: "Practice 1", time: race.sessions.practice1, duration: 90 },
      { type: "Practice 2", time: race.sessions.practice2, duration: 90 },
      { type: "Practice 3", time: race.sessions.practice3, duration: 60 },
      { type: "Qualifying", time: race.sessions.qualifying, duration: 60 },
      { type: "Race", time: race.sessions.race, duration: 120 },
    ].filter(s => s.time);

    for (const session of sessions) {
      const sessionStart = new Date(session.time!);
      const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);

      if (now >= sessionStart && now <= sessionEnd) {
        return {
          ...session,
          time: session.time!,
          race: race,
          status: 'live',
          timeRemaining: Math.floor((sessionEnd.getTime() - now.getTime()) / 1000)
        };
      }

      if (sessionStart > now) {
        const candidateSession: Session = {
          ...session,
          time: session.time!,
          race: race,
          status: 'upcoming',
          timeUntil: Math.floor((sessionStart.getTime() - now.getTime()) / 1000)
        };
        if (!nextSession || new Date(candidateSession.time) < new Date(nextSession.time)) {
          nextSession = candidateSession;
        }
      }
    }
  }

  return nextSession;
}

export function getCountdownString(session: Session | null): string {
  if (!session) return '';

  if (session.status === 'live') {
    const remaining = session.timeRemaining!;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`;
  }

  if (session.status === 'upcoming') {
    const until = session.timeUntil!;
    const days = Math.floor(until / 86400);
    const hours = Math.floor((until % 86400) / 3600);
    const minutes = Math.floor((until % 3600) / 60);
    const seconds = until % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  return '';
}