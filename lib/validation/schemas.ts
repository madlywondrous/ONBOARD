import { z } from "zod"

// Validation schemas for F1 data
export const F1SessionDataSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  duration: z.number().min(1, "Duration must be positive"),
})

export const F1RaceDataSchema = z.object({
  round: z.number().min(1).max(24, "Round must be between 1 and 24"),
  raceName: z.string().min(1, "Race name is required"),
  circuit: z.object({
    name: z.string().min(1, "Circuit name is required"),
    location: z.object({
      city: z.string().min(1, "City is required"),
      country: z.string().min(1, "Country is required"),
      countryCode: z.string().length(2, "Country code must be 2 characters"),
    }),
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  sessions: z.object({
    practice1: F1SessionDataSchema.optional(),
    practice2: F1SessionDataSchema.optional(),
    practice3: F1SessionDataSchema.optional(),
    qualifying: F1SessionDataSchema.optional(),
    race: F1SessionDataSchema,
  }),
})

export const F1CalendarDataSchema = z.object({
  season: z.number().min(2020).max(2030, "Season must be between 2020 and 2030"),
  races: z.array(F1RaceDataSchema).min(1, "At least one race is required"),
})

// Validation schemas for processed data
export const RaceSchema = z.object({
  id: z.string().min(1, "Race ID is required"),
  name: z.string().min(1, "Race name is required"),
  circuit: z.string().min(1, "Circuit name is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  date: z.string(),
  time: z.string(),
  round: z.number().min(1),
  status: z.enum(["upcoming", "live", "completed"]),
  url: z.string().url("Invalid URL"),
  circuitUrl: z.string().url("Invalid circuit URL"),
  sessions: z.object({
    practice1: z.string().optional(),
    practice2: z.string().optional(),
    practice3: z.string().optional(),
    qualifying: z.string().optional(),
    race: z.string(),
  }),
})

export const SessionSchema = z.object({
  type: z.string().min(1, "Session type is required"),
  time: z.string(),
  duration: z.number().min(1),
  race: RaceSchema,
  status: z.enum(["upcoming", "live"]),
  timeUntil: z.number().optional(),
  timeRemaining: z.number().optional(),
})

// Validation functions
export function validateF1CalendarData(data: unknown): z.infer<typeof F1CalendarDataSchema> {
  try {
    return F1CalendarDataSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`F1 Calendar data validation failed: ${errorMessage}`)
    }
    throw new Error('F1 Calendar data validation failed: Unknown error')
  }
}

export function validateRace(data: unknown): z.infer<typeof RaceSchema> {
  try {
    return RaceSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Race data validation failed: ${errorMessage}`)
    }
    throw new Error('Race data validation failed: Unknown error')
  }
}

export function validateSession(data: unknown): z.infer<typeof SessionSchema> {
  try {
    return SessionSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Session data validation failed: ${errorMessage}`)
    }
    throw new Error('Session data validation failed: Unknown error')
  }
}
