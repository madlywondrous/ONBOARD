export interface DriverStandingDriverInfo {
  code?: string | null
  fullName: string
  givenName?: string | null
  familyName?: string | null
  number?: string | null
  nationality?: string | null
}

export interface DriverStandingConstructorInfo {
  name?: string | null
  constructorId?: string | null
  nationality?: string | null
}

export interface DriverStanding {
  position: number
  points: number
  wins: number
  pointsGapToLeader: number
  pointsGapToPrevious: number
  driver: DriverStandingDriverInfo
  constructor: DriverStandingConstructorInfo
}

export interface ConstructorStandingConstructorInfo {
  name?: string | null
  constructorId?: string | null
  nationality?: string | null
}

export interface ConstructorStanding {
  position: number
  points: number
  wins: number
  pointsGapToLeader: number
  pointsGapToPrevious: number
  constructor: ConstructorStandingConstructorInfo
}

export interface DriverStandingsResponse {
  season: string
  round: number
  lastUpdated: string
  source: string
  standings: DriverStanding[]
}

export interface ConstructorStandingsResponse {
  season: string
  round: number
  lastUpdated: string
  source: string
  standings: ConstructorStanding[]
}
