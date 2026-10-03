"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Radio } from "lucide-react"
import { useDashboard } from "@/lib/context/dashboard-context"

export function TopBar() {
  const { state: { activeSection }, setActiveSection } = useDashboard()

  const isLiveActive = activeSection === 'live'
  const isCalendarActive = activeSection === 'calendar'

  return (
    <div className="h-12 flex-shrink-0 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-1 sm:px-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="p-1 px-1 sm:px-2 flex items-center">
          <Image
            src="/Onboard.svg"
            alt="ONBOARD Logo"
            width={28}
            height={28}
            priority
          />
        </div>
        <div className="text-base sm:text-xl text-neutral-400 whitespace-nowrap hidden min-[360px]:block">
          <span className="hidden sm:inline">ONBOARD / </span>
          <span className="text-red-500 font-semibold">2026 SEASON</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Live Button */}
        <Card 
          className={`transition-all duration-300 ease-in-out cursor-pointer border ${
            isLiveActive 
              ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/25' 
              : 'bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50'
          }`}
          onClick={() => setActiveSection('live')}
          role="button"
          aria-label="Open Live Timing"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSection('live'); } }}
        >
          <CardContent className="px-2 py-0 flex items-center justify-center h-8">
            <Radio className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-colors ${
              isLiveActive ? 'text-white' : 'text-neutral-400'
            }`} />
            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
              isLiveActive ? 'max-w-[120px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
            }`}>
              <span className="text-xs sm:text-sm font-bold tracking-wider text-white whitespace-nowrap">
                DASHBOARD
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Calendar Button */}
        <Card 
          className={`transition-all duration-300 ease-in-out cursor-pointer border ${
            isCalendarActive 
              ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/25' 
              : 'bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50'
          }`}
          onClick={() => setActiveSection('calendar')}
          role="button"
          aria-label="Open Calendar"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveSection('calendar'); } }}
        >
          <CardContent className="px-2 py-0 flex items-center justify-center h-8">
            <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-colors ${
              isCalendarActive ? 'text-white' : 'text-neutral-400'
            }`} />
            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
              isCalendarActive ? 'max-w-[120px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
            }`}>
              <span className="text-xs sm:text-sm font-bold tracking-wider text-white whitespace-nowrap">
                SCHEDULE
              </span>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  )
}
