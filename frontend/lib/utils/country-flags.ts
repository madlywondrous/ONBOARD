// Country name to flag code mapping for F1 races
const COUNTRY_FLAG_MAP: Record<string, string> = {
  // F1 2025 Calendar Countries
  'Australia': 'aus',
  'Austria': 'aut',
  'Azerbaijan': 'aze',
  'Belgium': 'bel',
  'Brazil': 'bra',
  'Bahrain': 'brn',
  'Canada': 'can',
  'China': 'chn',
  'Spain': 'esp',
  'France': 'fra',
  'United Kingdom': 'gbr',
  'Great Britain': 'gbr',
  'UK': 'gbr',
  'Germany': 'ger',
  'Hungary': 'hun',
  'Italy': 'ita',
  'Japan': 'jpn',
  'Saudi Arabia': 'ksa',
  'Mexico': 'mex',
  'Monaco': 'mon',
  'Netherlands': 'ned',
  'Portugal': 'por',
  'Qatar': 'qat',
  'Russia': 'rus',
  'Singapore': 'sgp',
  'UAE': 'uae',
  'United Arab Emirates': 'uae',
  'USA': 'usa',
  'United States': 'usa'
}

/**
 * Get the flag image path for a country
 * @param country - Country name (e.g., "Australia", "United Kingdom")
 * @returns Path to the flag SVG file
 */
export function getCountryFlagPath(country: string): string {
  const flagCode = COUNTRY_FLAG_MAP[country]
  
  if (!flagCode) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`No flag found for country: ${country}`)
    }
    // Return a default flag or placeholder
    return '/image Resource/Country Flags/aus.svg' // Default to Australia
  }
  
  return `/image Resource/Country Flags/${flagCode}.svg`
}

/**
 * Get flag code for a country (useful for debugging)
 * @param country - Country name
 * @returns Flag code (e.g., "aus", "gbr")
 */
export function getCountryFlagCode(country: string): string {
  const code = COUNTRY_FLAG_MAP[country]
  if (!code) {
    return 'xx' // Return unknown flag code for missing countries
  }
  return code
}

/**
 * Check if a flag exists for a country
 * @param country - Country name
 * @returns Boolean indicating if flag exists
 */
export function hasCountryFlag(country: string): boolean {
  return country in COUNTRY_FLAG_MAP
}

/**
 * Get all available countries with flags
 * @returns Array of country names that have flags
 */
export function getAvailableCountries(): string[] {
  return Object.keys(COUNTRY_FLAG_MAP)
}