"use client"

import { useState, useEffect } from 'react'
import { getCurrentSeasonStatus, getNextEvent } from '@/lib/data/f1-season'
import { getCurrentOrNextSession } from '@/lib/data/f1-calendar-data'
import { useF1Calendar } from './use-f1-calendar'

export function useF1Season() {
  const { races } = useF1Calendar()
  const [seasonStatus, setSeasonStatus] = useState(() => getCurrentSeasonStatus())
  const [nextEvent, setNextEvent] = useState(() => getNextEvent())
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Update status every minute to catch date changes and race weekend info
  useEffect(() => {
    const updateStatus = () => {
      // Get current race weekend info from calendar data
      let currentRaceWeekend = null
      
      if (races.length > 0) {
        const currentSession = getCurrentOrNextSession(races)
        if (currentSession) {
          const race = currentSession.race
          const now = new Date()
          const raceDate = new Date(race.date)
          const weekendStart = new Date(raceDate)
          weekendStart.setDate(raceDate.getDate() - 3) // Thursday before race
          const weekendEnd = new Date(raceDate)
          weekendEnd.setDate(raceDate.getDate() + 1) // Day after race
          
          // Check if we're in a race weekend
          if (now >= weekendStart && now <= weekendEnd) {
            currentRaceWeekend = {
              name: race.name,
              country: race.country,
              isLive: currentSession.status === 'live'
            }
          }
        }
      }
      
      const newStatus = getCurrentSeasonStatus(currentRaceWeekend || undefined)
      const newNextEvent = getNextEvent()
      
      // Only update if something changed
      if (JSON.stringify(newStatus) !== JSON.stringify(seasonStatus) ||
          JSON.stringify(newNextEvent) !== JSON.stringify(nextEvent)) {
        setSeasonStatus(newStatus)
        setNextEvent(newNextEvent)
        setLastUpdated(new Date())
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [seasonStatus, nextEvent, races])

  // Manual refresh function
  const refresh = () => {
    let currentRaceWeekend = null
    
    if (races.length > 0) {
      const currentSession = getCurrentOrNextSession(races)
      if (currentSession) {
        const race = currentSession.race
        const now = new Date()
        const raceDate = new Date(race.date)
        const weekendStart = new Date(raceDate)
        weekendStart.setDate(raceDate.getDate() - 3)
        const weekendEnd = new Date(raceDate)
        weekendEnd.setDate(raceDate.getDate() + 1)
        
        if (now >= weekendStart && now <= weekendEnd) {
          currentRaceWeekend = {
            name: race.name,
            country: race.country,
            isLive: currentSession.status === 'live'
          }
        }
      }
    }
    
    setSeasonStatus(getCurrentSeasonStatus(currentRaceWeekend || undefined))
    setNextEvent(getNextEvent())
    setLastUpdated(new Date())
  }

  return {
    seasonStatus,
    nextEvent,
    lastUpdated,
    refresh
  }
}
