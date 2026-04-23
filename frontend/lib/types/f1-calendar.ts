// Input data structure from the existing JSON file
export interface F1CalendarData {
  season: number
  races: F1RaceData[]
}

export interface F1RaceData {
  round: number
  raceName: string
  circuit: {
    name: string
    location: {
      city: string
      country: string
      countryCode: string
    }
  }
  date: string
  sessions: {
    practice1?: F1SessionData
    practice2?: F1SessionData
    practice3?: F1SessionData
    qualifying?: F1SessionData
    race: F1SessionData
  }
}

export interface F1SessionData {
  date: string
  time: string
  duration: number
}

// Output data structure (compatible with Schedule folder's Race interface)
export interface Race {
  id: string
  name: string
  circuit: string
  country: string
  city: string
  date: string
  time: string
  round: number
  status: "upcoming" | "live" | "completed"
  url: string
  circuitUrl: string
  sessions: {
    practice1?: string
    practice2?: string
    practice3?: string
    qualifying?: string
    race: string
  }
}

export interface Session {
  type: string
  time: string
  duration: number
  race: Race
  status: "upcoming" | "live"
  timeUntil?: number
  timeRemaining?: number
}

export type RaceStatus = "upcoming" | "live" | "completed"