"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    <Card className="bg-neutral-900 border-neutral-700 overflow-hidden relative group">
      {/* Background ambient glow if live */}
      {isLive && (
        <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 pointer-events-none" />
      )}
      
      {/* Circuit Image Background/Right Side */}
      {currentSession.race.circuitImage && (
        <div className="absolute right-4 top-4 bottom-4 w-[38%] opacity-90 pointer-events-none transition-opacity group-hover:opacity-100 brightness-110 hidden md:block z-0"
             style={{
               backgroundImage: `url('${currentSession.race.circuitImage}')`,
               backgroundSize: 'contain',
               backgroundPosition: 'right center',
               backgroundRepeat: 'no-repeat',
             }}
        />
      )}

      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row w-full relative z-10">
          
          {/* Left/Top Section: Status and Countdown */}
          <div className={`p-4 md:p-6 md:w-[30%] flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-800 ${isLive ? 'bg-red-500/10' : 'bg-neutral-950/50'}`}>
            <div className="flex items-center gap-2 mb-8 md:mb-0">
              {isLive ? (
                <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              ) : (
                <Timer className="w-5 h-5 text-neutral-400" />
              )}
              <h3 className="text-sm font-bold text-neutral-300 tracking-widest uppercase">
                {isLive ? "Live Now" : "Next Session"}
              </h3>
            </div>
            
            <div className="space-y-1 mt-auto md:mt-12">
              <div className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-1">
                {isLive ? "Time Remaining" : "Starts In"}
              </div>
              <div className={`text-4xl lg:text-5xl font-bold font-mono tracking-tighter ${isLive ? 'text-red-500' : 'text-white'}`}>
                {countdown}
              </div>
            </div>

            {/* Mobile Circuit Image */}
            {currentSession.race.circuitImage && (
              <div className="mt-6 w-full h-32 opacity-80 brightness-110 md:hidden"
                   style={{
                     backgroundImage: `url('${currentSession.race.circuitImage}')`,
                     backgroundSize: 'contain',
                     backgroundPosition: 'center',
                     backgroundRepeat: 'no-repeat',
                   }}
              />
            )}
          </div>

          {/* Right/Bottom Section: Race Details */}
          <div className="p-4 md:p-6 md:w-[70%] flex flex-col justify-center">
            <div className="flex justify-between items-start mb-6 md:mr-[35%] lg:mr-[38%]">
              <div className="flex gap-4 items-start">
                <CountryFlag
                  country={currentSession.race.country}
                  width={84}
                  height={56}
                  className="shadow-lg rounded border border-neutral-800 mt-1 flex-shrink-0"
                />
                <div className="flex flex-col justify-center -mt-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-neutral-500">
                      ROUND {currentSession.race.round}
                    </span>
                    <Badge variant="secondary" className={`${isLive ? "bg-red-500 text-white" : "bg-neutral-700 text-neutral-300"} px-1.5 py-0 uppercase text-[10px] tracking-wider rounded-sm`}>
                      {currentSession.type}
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide leading-none mb-1.5">
                    {currentSession.race.name}
                  </h2>
                  <p className="text-sm text-neutral-400 leading-none">
                    {currentSession.race.circuit} <span className="text-neutral-600 mx-1">•</span> {currentSession.race.city}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 xl:gap-4 pt-4 border-t border-neutral-800 md:mr-[35%] lg:mr-[38%]">
              <div>
                <div className="text-xs text-neutral-500 tracking-wider mb-1">DATE</div>
                <div className="text-sm font-medium text-white">{formatDate(currentSession.time)}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 tracking-wider mb-1">TIME</div>
                <div className="text-sm font-medium text-white font-mono break-words leading-tight">{formatTime(currentSession.time)}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 tracking-wider mb-1">DURATION</div>
                <div className="text-sm font-medium text-white">{currentSession.duration || 90} MIN</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 tracking-wider mb-1">STATUS</div>
                <div className={`text-sm font-medium ${isLive ? 'text-red-500' : 'text-neutral-300'}`}>
                  {isLive ? 'In Progress' : 'Scheduled'}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </CardContent>
    </Card>
  )
}
