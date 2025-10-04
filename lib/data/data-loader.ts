import type { Race } from "@/lib/types"
import { transformRaceData } from "./f1-calendar-data"
import { validateF1CalendarData } from "@/lib/validation"

// Cache for the loaded data
let cachedData: Race[] | null = null

/**
 * Get F1 calendar data with caching and validation
 * This function should be used in components where the JSON data is available
 */
export function getF1CalendarData(jsonData: unknown): Race[] {
  if (cachedData) {
    return cachedData
  }

  try {
    // Validate the input data
    const validatedData = validateF1CalendarData(jsonData)
    
    // Transform and cache the data
    cachedData = transformRaceData(validatedData)
    
    return cachedData
  } catch (error) {
    throw new Error(`Failed to load F1 calendar data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Clear the cached data (useful for testing or data updates)
 */
export function clearCache(): void {
  cachedData = null
}