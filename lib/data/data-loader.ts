import type { Race } from "@/lib/types"
import { transformRaceData } from "./f1-calendar-data"
import { validateF1CalendarData } from "@/lib/validation"
import { DEV_CONFIG } from "@/lib/config"

// Cache for the loaded data
let cachedData: Race[] | null = null

/**
 * Get F1 calendar data with caching and validation
 * This function should be used in components where the JSON data is available
 */
export function getF1CalendarData(jsonData: unknown): Race[] {
  if (cachedData) {
    if (DEV_CONFIG.enableDebugLogs) {
      console.log('🏎️ F1 Calendar: Using cached data')
    }
    return cachedData
  }

  try {
    // Validate the input data
    const validatedData = validateF1CalendarData(jsonData)
    
    if (DEV_CONFIG.enableDebugLogs) {
      console.log('🏎️ F1 Calendar: Data validation successful', validatedData)
    }

    // Transform and cache the data
    cachedData = transformRaceData(validatedData)
    
    if (DEV_CONFIG.enableDebugLogs) {
      console.log('🏎️ F1 Calendar: Data transformation complete', cachedData)
    }
    
    return cachedData
  } catch (error) {
    console.error('🚨 F1 Calendar: Data loading failed', error)
    throw new Error(`Failed to load F1 calendar data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Clear the cached data (useful for testing or data updates)
 */
export function clearCache(): void {
  cachedData = null
  if (DEV_CONFIG.enableDebugLogs) {
    console.log('🏎️ F1 Calendar: Cache cleared')
  }
}