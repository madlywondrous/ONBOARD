// Mock F1 data for development - will be replaced with real API calls

export interface Race {
  id: string
  round: number
  raceName: string
  circuit: {
    circuitId: string
    circuitName: string
    location: {
      locality: string
      country: string
      flag: string
    }
  }
  date: string
  time: string
  sessions: {
    fp1?: { date: string; time: string }
    fp2?: { date: string; time: string }
    fp3?: { date: string; time: string }
    qualifying: { date: string; time: string }
    sprint?: { date: string; time: string }
    sprintQualifying?: { date: string; time: string }
    race: { date: string; time: string }
  }
  status: 'upcoming' | 'current' | 'completed'
  countdown?: {
    days: number
    hours: number
    minutes: number
  }
}

// Mock 2025 F1 Season data
export const mockRaces: Race[] = [
  {
    id: '2025-1',
    round: 1,
    raceName: 'Bahrain Grand Prix',
    circuit: {
      circuitId: 'bahrain',
      circuitName: 'Bahrain International Circuit',
      location: {
        locality: 'Sakhir',
        country: 'Bahrain',
        flag: '🇧🇭'
      }
    },
    date: '2025-03-02',
    time: '15:00:00Z',
    sessions: {
      fp1: { date: '2025-02-28', time: '11:30:00Z' },
      fp2: { date: '2025-02-28', time: '15:00:00Z' },
      fp3: { date: '2025-03-01', time: '11:30:00Z' },
      qualifying: { date: '2025-03-01', time: '15:00:00Z' },
      race: { date: '2025-03-02', time: '15:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-2',
    round: 2,
    raceName: 'Saudi Arabian Grand Prix',
    circuit: {
      circuitId: 'jeddah',
      circuitName: 'Jeddah Corniche Circuit',
      location: {
        locality: 'Jeddah',
        country: 'Saudi Arabia',
        flag: '🇸🇦'
      }
    },
    date: '2025-03-09',
    time: '17:00:00Z',
    sessions: {
      fp1: { date: '2025-03-07', time: '13:30:00Z' },
      fp2: { date: '2025-03-07', time: '17:00:00Z' },
      fp3: { date: '2025-03-08', time: '13:30:00Z' },
      qualifying: { date: '2025-03-08', time: '17:00:00Z' },
      race: { date: '2025-03-09', time: '17:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-3',
    round: 3,
    raceName: 'Australian Grand Prix',
    circuit: {
      circuitId: 'melbourne',
      circuitName: 'Albert Park Circuit',
      location: {
        locality: 'Melbourne',
        country: 'Australia',
        flag: '🇦🇺'
      }
    },
    date: '2025-03-16',
    time: '05:00:00Z',
    sessions: {
      fp1: { date: '2025-03-14', time: '01:30:00Z' },
      fp2: { date: '2025-03-14', time: '05:00:00Z' },
      fp3: { date: '2025-03-15', time: '01:30:00Z' },
      qualifying: { date: '2025-03-15', time: '05:00:00Z' },
      race: { date: '2025-03-16', time: '05:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-4',
    round: 4,
    raceName: 'Japanese Grand Prix',
    circuit: {
      circuitId: 'suzuka',
      circuitName: 'Suzuka International Racing Course',
      location: {
        locality: 'Suzuka',
        country: 'Japan',
        flag: '🇯🇵'
      }
    },
    date: '2025-04-13',
    time: '05:00:00Z',
    sessions: {
      fp1: { date: '2025-04-11', time: '01:30:00Z' },
      fp2: { date: '2025-04-11', time: '05:00:00Z' },
      fp3: { date: '2025-04-12', time: '01:30:00Z' },
      qualifying: { date: '2025-04-12', time: '05:00:00Z' },
      race: { date: '2025-04-13', time: '05:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-5',
    round: 5,
    raceName: 'Chinese Grand Prix',
    circuit: {
      circuitId: 'shanghai',
      circuitName: 'Shanghai International Circuit',
      location: {
        locality: 'Shanghai',
        country: 'China',
        flag: '🇨🇳'
      }
    },
    date: '2025-04-20',
    time: '07:00:00Z',
    sessions: {
      fp1: { date: '2025-04-18', time: '03:30:00Z' },
      sprintQualifying: { date: '2025-04-18', time: '07:30:00Z' },
      sprint: { date: '2025-04-19', time: '03:00:00Z' },
      qualifying: { date: '2025-04-19', time: '07:00:00Z' },
      race: { date: '2025-04-20', time: '07:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-6',
    round: 6,
    raceName: 'Miami Grand Prix',
    circuit: {
      circuitId: 'miami',
      circuitName: 'Miami International Autodrome',
      location: {
        locality: 'Miami',
        country: 'USA',
        flag: '🇺🇸'
      }
    },
    date: '2025-05-04',
    time: '19:30:00Z',
    sessions: {
      fp1: { date: '2025-05-02', time: '18:30:00Z' },
      fp2: { date: '2025-05-02', time: '22:00:00Z' },
      fp3: { date: '2025-05-03', time: '18:30:00Z' },
      qualifying: { date: '2025-05-03', time: '22:00:00Z' },
      race: { date: '2025-05-04', time: '19:30:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-7',
    round: 7,
    raceName: 'Emilia Romagna Grand Prix',
    circuit: {
      circuitId: 'imola',
      circuitName: 'Autodromo Enzo e Dino Ferrari',
      location: {
        locality: 'Imola',
        country: 'Italy',
        flag: '🇮🇹'
      }
    },
    date: '2025-05-18',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-05-16', time: '11:30:00Z' },
      fp2: { date: '2025-05-16', time: '15:00:00Z' },
      fp3: { date: '2025-05-17', time: '10:30:00Z' },
      qualifying: { date: '2025-05-17', time: '14:00:00Z' },
      race: { date: '2025-05-18', time: '13:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-8',
    round: 8,
    raceName: 'Monaco Grand Prix',
    circuit: {
      circuitId: 'monaco',
      circuitName: 'Circuit de Monaco',
      location: {
        locality: 'Monte Carlo',
        country: 'Monaco',
        flag: '🇲🇨'
      }
    },
    date: '2025-05-25',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-05-23', time: '11:30:00Z' },
      fp2: { date: '2025-05-23', time: '15:00:00Z' },
      fp3: { date: '2025-05-24', time: '10:30:00Z' },
      qualifying: { date: '2025-05-24', time: '14:00:00Z' },
      race: { date: '2025-05-25', time: '13:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-9',
    round: 9,
    raceName: 'Canadian Grand Prix',
    circuit: {
      circuitId: 'montreal',
      circuitName: 'Circuit Gilles-Villeneuve',
      location: {
        locality: 'Montreal',
        country: 'Canada',
        flag: '🇨🇦'
      }
    },
    date: '2025-06-08',
    time: '18:00:00Z',
    sessions: {
      fp1: { date: '2025-06-06', time: '17:30:00Z' },
      fp2: { date: '2025-06-06', time: '21:00:00Z' },
      fp3: { date: '2025-06-07', time: '16:30:00Z' },
      qualifying: { date: '2025-06-07', time: '20:00:00Z' },
      race: { date: '2025-06-08', time: '18:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-10',
    round: 10,
    raceName: 'Spanish Grand Prix',
    circuit: {
      circuitId: 'catalunya',
      circuitName: 'Circuit de Barcelona-Catalunya',
      location: {
        locality: 'Montmeló',
        country: 'Spain',
        flag: '🇪🇸'
      }
    },
    date: '2025-06-15',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-06-13', time: '11:30:00Z' },
      fp2: { date: '2025-06-13', time: '15:00:00Z' },
      fp3: { date: '2025-06-14', time: '10:30:00Z' },
      qualifying: { date: '2025-06-14', time: '14:00:00Z' },
      race: { date: '2025-06-15', time: '13:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-11',
    round: 11,
    raceName: 'Austrian Grand Prix',
    circuit: {
      circuitId: 'red-bull-ring',
      circuitName: 'Red Bull Ring',
      location: {
        locality: 'Spielberg',
        country: 'Austria',
        flag: '🇦🇹'
      }
    },
    date: '2025-06-29',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-06-27', time: '11:30:00Z' },
      sprintQualifying: { date: '2025-06-27', time: '15:30:00Z' },
      sprint: { date: '2025-06-28', time: '10:00:00Z' },
      qualifying: { date: '2025-06-28', time: '14:00:00Z' },
      race: { date: '2025-06-29', time: '13:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-12',
    round: 12,
    raceName: 'British Grand Prix',
    circuit: {
      circuitId: 'silverstone',
      circuitName: 'Silverstone Circuit',
      location: {
        locality: 'Silverstone',
        country: 'Great Britain',
        flag: '🇬🇧'
      }
    },
    date: '2025-07-06',
    time: '14:00:00Z',
    sessions: {
      fp1: { date: '2025-07-04', time: '12:30:00Z' },
      fp2: { date: '2025-07-04', time: '16:00:00Z' },
      fp3: { date: '2025-07-05', time: '11:30:00Z' },
      qualifying: { date: '2025-07-05', time: '15:00:00Z' },
      race: { date: '2025-07-06', time: '14:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-13',
    round: 13,
    raceName: 'Hungarian Grand Prix',
    circuit: {
      circuitId: 'hungaroring',
      circuitName: 'Hungaroring',
      location: {
        locality: 'Budapest',
        country: 'Hungary',
        flag: '🇭🇺'
      }
    },
    date: '2025-07-27',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-07-25', time: '11:30:00Z' },
      fp2: { date: '2025-07-25', time: '15:00:00Z' },
      fp3: { date: '2025-07-26', time: '10:30:00Z' },
      qualifying: { date: '2025-07-26', time: '14:00:00Z' },
      race: { date: '2025-07-27', time: '13:00:00Z' }
    },
    status: 'completed'
  },
  {
    id: '2025-14',
    round: 14,
    raceName: 'Belgian Grand Prix',
    circuit: {
      circuitId: 'spa',
      circuitName: 'Circuit de Spa-Francorchamps',
      location: {
        locality: 'Spa',
        country: 'Belgium',
        flag: '🇧🇪'
      }
    },
    date: '2025-08-31',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-08-29', time: '11:30:00Z' },
      fp2: { date: '2025-08-29', time: '15:00:00Z' },
      fp3: { date: '2025-08-30', time: '10:30:00Z' },
      qualifying: { date: '2025-08-30', time: '14:00:00Z' },
      race: { date: '2025-08-31', time: '13:00:00Z' }
    },
    status: 'current',
    countdown: {
      days: 27,
      hours: 8,
      minutes: 45
    }
  },
  // Future races...
  {
    id: '2025-15',
    round: 15,
    raceName: 'Dutch Grand Prix',
    circuit: {
      circuitId: 'zandvoort',
      circuitName: 'Circuit Zandvoort',
      location: {
        locality: 'Zandvoort',
        country: 'Netherlands',
        flag: '🇳🇱'
      }
    },
    date: '2025-09-07',
    time: '13:00:00Z',
    sessions: {
      fp1: { date: '2025-09-05', time: '11:30:00Z' },
      fp2: { date: '2025-09-05', time: '15:00:00Z' },
      fp3: { date: '2025-09-06', time: '10:30:00Z' },
      qualifying: { date: '2025-09-06', time: '14:00:00Z' },
      race: { date: '2025-09-07', time: '13:00:00Z' }
    },
    status: 'upcoming'
  }
]

// Helper functions
export const getCurrentRace = (): Race | null => {
  return mockRaces.find(race => race.status === 'current') || null
}

export const getNextRace = (): Race | null => {
  return mockRaces.find(race => race.status === 'upcoming') || null
}

export const getCompletedRaces = (): Race[] => {
  return mockRaces.filter(race => race.status === 'completed')
}

export const getUpcomingRaces = (): Race[] => {
  return mockRaces.filter(race => race.status === 'upcoming')
}

export const formatSessionTime = (date: string, time: string): string => {
  const dateTime = new Date(`${date}T${time}`)
  return dateTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}
