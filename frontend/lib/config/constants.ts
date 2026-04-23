// Dashboard configuration
export const DASHBOARD_CONFIG = {
  defaultSection: 'calendar',
  sidebarWidth: 208, // w-52 = 13rem = 208px
  topBarHeight: 48,  // h-12 = 3rem = 48px
  animations: {
    sidebarTransition: 700, // ms
    cursorDebounce: 100,    // ms
  },
} as const

// F1 Season configuration
export const F1_CONFIG = {
  currentSeason: 2025,
  maxRounds: 24,
  sessionTypes: ['practice1', 'practice2', 'practice3', 'qualifying', 'race'] as const,
  raceStatuses: ['upcoming', 'live', 'completed'] as const,
} as const
