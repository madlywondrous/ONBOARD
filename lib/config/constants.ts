// Application constants and configuration
export const APP_CONFIG = {
  name: 'ONBOARD',
  description: 'Formula 1 2025 Season Dashboard',
  version: '1.0.0',
  author: 'Ayush',
} as const

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

// UI configuration
export const UI_CONFIG = {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  },
  colors: {
    primary: '#ef4444', // red-500
    secondary: '#f97316', // orange-500
    background: '#000000', // black
    surface: '#171717', // neutral-900
  },
} as const

// API endpoints (if needed for future external data)
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000, // ms
} as const

// Development configuration
export const DEV_CONFIG = {
  enableDebugLogs: process.env.NODE_ENV === 'development',
  enablePerformanceMetrics: process.env.NODE_ENV === 'development',
} as const
