"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Radio, Timer } from "lucide-react"
import { CountryFlag } from "@/components/ui/country-flag"
import type { Session } from "@/lib/types"
import { formatDate, formatTime } from "@/lib/utils"

interface RedesignedSessionCardProps {
  currentSession: Session | null
}

export function RedesignedSessionCard({
  currentSession
}: RedesignedSessionCardProps) {
  const [countdown, setCountdown] = useState("")

  useEffect(() => {
    if (!currentSession) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const sessionTime = new Date(currentSession.time).getTime()
      const difference = sessionTime - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setCountdown(`${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setCountdown("00:00:00:00")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [currentSession])

  if (!currentSession) {
    return (
      <Card className="bg-neutral-900 border-neutral-700">
        <CardContent className="p-4 text-center">
          <div className="text-neutral-400 text-sm">No upcoming sessions</div>
        </CardContent>
      </Card>
    )
  }

  const isLive = currentSession.status === "live"

  return (
    <Card className="bg-black bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isLive ? (
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 animate-pulse" />
            ) : (
              <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            )}
            <CardTitle className="text-base sm:text-lg font-bold text-white tracking-wider">
              {isLive ? "LIVE NOW" : "NEXT SESSION"}
            </CardTitle>
            <Badge
              className={
                isLive
                  ? "bg-red-500 text-white animate-pulse text-xs"
                  : "bg-orange-500/20 text-orange-500 text-xs"
              }
            >
              {currentSession.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs sm:text-sm text-neutral-400">
              {isLive ? "TIME REMAINING" : "STARTS IN"}
            </div>
            <div className="text-lg sm:text-xl font-bold text-red-500 font-mono">{countdown}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CountryFlag
                country={currentSession.race.country}
                width={40}
                height={27}
                className="shadow-lg"
              />
              <div>
                <h3 className="text-sm font-medium text-neutral-300 tracking-wider">SESSION DETAILS</h3>
                <p className="text-xs text-neutral-500">{currentSession.race.country}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Session:</span>
                <span className="text-white font-bold">{currentSession.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Race:</span>
                <span className="text-white">{currentSession.race.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Circuit:</span>
                <span className="text-white">{currentSession.race.circuit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Location:</span>
                <span className="text-white">
                  {currentSession.race.city}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">TIMING</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Start Time:</span>
                <span className="text-white font-mono">{formatTime(currentSession.time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Duration:</span>
                <span className="text-white font-mono">{currentSession.duration || 90} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Date:</span>
                <span className="text-white font-mono">{formatDate(currentSession.time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Round:</span>
                <span className="text-white font-mono">#{currentSession.race.round}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-neutral-700">
          <Button className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 w-full sm:w-auto">
            <Radio className="w-4 h-4 mr-2" />
            {isLive ? "Watch Live" : "Set Reminder"}
          </Button>
          <Button
            variant="outline"
            className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent text-sm px-3 py-2 w-full sm:w-auto"
          >
            Race Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
