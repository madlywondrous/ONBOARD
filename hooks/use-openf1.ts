"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"

// Open F1 API types
interface OpenF1Circuit {
  circuit_key: number
  circuit_short_name: string
  country_code: string
  country_name: string
  location: string
  meeting_key: number
}

interface OpenF1Session {
  circuit_key: number
  circuit_short_name: string
  country_code: string
  country_name: string
  date_start: string
  meeting_key: number
  session_key: number
  session_name: string
  session_type: string
  year: number
}

interface OpenF1Weather {
  air_temperature: number
  humidity: number
  pressure: number
  rainfall: number
  track_temperature: number
  wind_direction: number
  wind_speed: number
  date: string
  session_key: number
}

// Custom hook for Open F1 API data
export function useOpenF1Data(sessionKey?: number) {
  // Fetch circuit data
  const { data: circuits, error: circuitsError } = useSWR<OpenF1Circuit[]>(
    'https://api.openf1.org/v1/circuits?year=2025',
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Fetch sessions data
  const { data: sessions, error: sessionsError } = useSWR<OpenF1Session[]>(
    'https://api.openf1.org/v1/sessions?year=2025',
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Fetch weather data for current session
  const { data: weather, error: weatherError } = useSWR<OpenF1Weather[]>(
    sessionKey ? `https://api.openf1.org/v1/weather?session_key=${sessionKey}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  )

  return {
    circuits: circuits || [],
    sessions: sessions || [],
    weather: weather || [],
    loading: !circuits || !sessions,
    error: circuitsError || sessionsError || weatherError
  }
}

// Helper function to get circuit image URL
export function getCircuitImageUrl(circuitName: string): string {
  const circuitMap: Record<string, string> = {
    'Bahrain International Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Bahrain_Circuit',
    'Jeddah Corniche Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Saudi_Arabia_Circuit',
    'Albert Park Grand Prix Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Australia_Circuit',
    'Baku City Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Azerbaijan_Circuit',
    'Miami International Autodrome': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Miami_Circuit',
    'Autodromo Enzo e Dino Ferrari': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Emilia_Romagna_Circuit',
    'Circuit de Monaco': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit',
    'Circuit de Barcelona-Catalunya': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Spain_Circuit',
    'Red Bull Ring': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Austria_Circuit',
    'Silverstone Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Great_Britain_Circuit',
    'Hungaroring': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Hungary_Circuit',
    'Circuit de Spa-Francorchamps': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Belgium_Circuit',
    'Circuit Zandvoort': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Netherlands_Circuit',
    'Autodromo Nazionale di Monza': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Italy_Circuit',
    'Marina Bay Street Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Singapore_Circuit',
    'Suzuka Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Japan_Circuit',
    'Losail International Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Qatar_Circuit',
    'Circuit of the Americas': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%20116x9/United_States_Circuit',
    'Autódromo Hermanos Rodríguez': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Mexico_Circuit',
    'Autódromo José Carlos Pace': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Brazil_Circuit',
    'Las Vegas Strip Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Las_Vegas_Circuit',
    'Yas Marina Circuit': 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Abu_Dhabi_Circuit',
  }

  return circuitMap[circuitName] || 'https://media.formula1.com/image/upload/f_auto,c_limit,w_1440,q_auto/f_auto/q_auto/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Generic_Circuit'
}

// Helper function to get circuit information
export function getCircuitInfo(circuitName: string, circuits: OpenF1Circuit[]) {
  const circuit = circuits.find(c =>
    c.circuit_short_name.toLowerCase().includes(circuitName.toLowerCase().split(' ')[0]) ||
    circuitName.toLowerCase().includes(c.circuit_short_name.toLowerCase())
  )

  return circuit || null
}
