import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { useDashboard } from "@/lib/context/dashboard-context"
import { Radio, Calendar, Trophy, ChevronRight } from "lucide-react"

export function HomeSection() {
  const { setActiveSection } = useDashboard()

  return (
    <div className="flex flex-col w-full h-full overflow-hidden p-4 sm:p-6 gap-6 bg-black">
      
      {/* Hero Banner */}
      <div className="relative w-full rounded-xl overflow-hidden border border-neutral-800 bg-[#0a0a0a] flex-1 flex flex-col justify-center shadow-2xl">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#e10600]/10 via-transparent to-transparent pointer-events-none z-0" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-100 z-0" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(225,6,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(225,6,0,0.08) 1px, transparent 1px)', 
               backgroundSize: '60px 60px' 
             }} />
        
        {/* Background Logo */}
        <div className="absolute -right-12 sm:-right-24 md:-right-48 top-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none z-0 select-none">
          <img src="/Onboard.svg" alt="" className="w-[400px] sm:w-[600px] md:w-[800px] h-auto object-contain" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 p-6 lg:p-8 w-full max-w-4xl">
          <h1 className="font-formula1 text-[70px] lg:text-[120px] font-normal uppercase tracking-tighter leading-[0.8] mb-8">
            <span className="text-white block drop-shadow-lg">WELCOME TO</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-300 to-neutral-600 block drop-shadow-xl pb-2">ONBOARD.</span>
          </h1>
          
          <p className="text-neutral-400 text-lg lg:text-xl mb-10 max-w-2xl font-medium leading-relaxed">
            Your ultimate command center for Formula 1. Real-time telemetry, live timings, weekend schedules, and championship standings all in one unified, sleek dashboard.
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => setActiveSection('live')}
              className="flex items-center gap-3 bg-[#e10600] hover:bg-red-700 text-white px-7 py-3.5 rounded font-bold tracking-widest text-sm uppercase transition-all shadow-[0_0_15px_rgba(225,6,0,0.2)] hover:shadow-[0_0_25px_rgba(225,6,0,0.4)] active:scale-95"
            >
              <Radio className="w-5 h-5" />
              LIVE DASHBOARD
            </button>
            <button 
              onClick={() => setActiveSection('calendar')}
              className="flex items-center gap-3 bg-transparent hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-500 text-white px-7 py-3.5 rounded font-bold tracking-widest text-sm uppercase transition-all active:scale-95"
            >
              <Calendar className="w-5 h-5 text-neutral-400" />
              VIEW SCHEDULE
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-shrink-0 h-[280px]">
        {/* Live Card */}
        <Card 
          className="bg-[#111111] border-neutral-800 hover:border-[#e10600]/50 hover:bg-[#151515] transition-all duration-300 cursor-pointer group shadow-lg" 
          onClick={() => setActiveSection('live')}
        >
          <CardContent className="p-6 lg:p-8 flex flex-col items-start gap-4 h-full">
            <div>
              <h3 className="font-formula1 text-xl lg:text-3xl font-normal text-white uppercase tracking-wider mb-2">LIVE TIMING</h3>
              <p className="text-neutral-400 text-xs lg:text-sm font-medium leading-relaxed">Access real-time sector times, speed traps, race control messages, and live driver telemetry directly from the pit wall.</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-[#e10600] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              LAUNCH <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card 
          className="bg-[#111111] border-neutral-800 hover:border-neutral-500 hover:bg-[#151515] transition-all duration-300 cursor-pointer group shadow-lg" 
          onClick={() => setActiveSection('calendar')}
        >
          <CardContent className="p-6 lg:p-8 flex flex-col items-start gap-4 h-full">
            <div>
              <h3 className="font-formula1 text-xl lg:text-3xl font-normal text-white uppercase tracking-wider mb-2">RACE CALENDAR</h3>
              <p className="text-neutral-400 text-xs lg:text-sm font-medium leading-relaxed">Track every practice, qualifying, and race session. View circuit details and local weather for the entire 2026 calendar.</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-white uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              VIEW <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Standings Card */}
        <Card 
          className="bg-[#111111] border-neutral-800 hover:border-[#f5d500]/50 hover:bg-[#151515] transition-all duration-300 cursor-pointer group shadow-lg" 
          onClick={() => setActiveSection('standings')}
        >
          <CardContent className="p-6 lg:p-8 flex flex-col items-start gap-4 h-full">
            <div>
              <h3 className="font-formula1 text-xl lg:text-3xl font-normal text-white uppercase tracking-wider mb-2">CHAMPIONSHIP</h3>
              <p className="text-neutral-400 text-xs lg:text-sm font-medium leading-relaxed">Follow the thrilling battle for the World Championship. Keep up to date with the latest Drivers' and Constructors' standings.</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-[#f5d500] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              EXPLORE <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
