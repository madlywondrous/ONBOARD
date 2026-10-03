"use client"

import React, { useEffect, useState } from "react"
import { Trophy, Car, AlertTriangle } from "lucide-react"

interface DriverStanding {
  position: string
  points: string
  wins: string
  Driver: {
    driverId: string
    givenName: string
    familyName: string
    code: string
    permanentNumber: string
    nationality: string
    dateOfBirth: string
  }
  Constructors: {
    name: string
    constructorId: string
    nationality: string
  }[]
}

interface ConstructorStanding {
  position: string
  points: string
  wins: string
  Constructor: {
    name: string
    constructorId: string
    nationality: string
  }
}

const TEAM_COLORS: Record<string, string> = {
  mercedes: "#27F4D2",
  red_bull: "#3671C6",
  ferrari: "#E8002D",
  mclaren: "#FF8000",
  aston_martin: "#229971",
  alpine: "#0093CC",
  williams: "#005AFF",
  rb: "#6692FF",
  sauber: "#00E701",
  haas: "#B6BABD",
}

export function StandingsSection() {
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors'>('drivers')
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([])
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([])
  
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [selectedConstructorId, setSelectedConstructorId] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStandings() {
      try {
        setLoading(true)
        const [driversRes, constructorsRes] = await Promise.all([
          fetch('https://api.jolpi.ca/ergast/f1/current/driverStandings.json'),
          fetch('https://api.jolpi.ca/ergast/f1/current/constructorStandings.json')
        ])
        
        if (!driversRes.ok || !constructorsRes.ok) throw new Error("Failed to fetch standings data")
        
        const driversData = await driversRes.json()
        const constructorsData = await constructorsRes.json()

        const dStandings = driversData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || []
        const cStandings = constructorsData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || []
        
        setDriverStandings(dStandings)
        setConstructorStandings(cStandings)
        
        if (dStandings.length > 0) setSelectedDriverId(dStandings[0].Driver.driverId)
        if (cStandings.length > 0) setSelectedConstructorId(cStandings[0].Constructor.constructorId)
        
      } catch (err) {
        console.error(err)
        setError("Failed to load championship standings")
      } finally {
        setLoading(false)
      }
    }

    fetchStandings()
  }, [])

  const selectedDriver = driverStandings.find(d => d.Driver.driverId === selectedDriverId)
  const selectedConstructor = constructorStandings.find(c => c.Constructor.constructorId === selectedConstructorId)

  return (
    <div className="flex flex-col w-full h-full p-4 sm:p-6 overflow-hidden">
      
      {/* Header and Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 flex-shrink-0">
        <div>
          <h2 className="font-formula1 text-3xl font-normal text-white uppercase tracking-tighter">
            Season Standings <span className="text-[#e10600] mx-2">/</span> 2026
          </h2>
        </div>

        <div className="flex bg-[#111111] border border-neutral-800 p-1 rounded-md">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-8 py-2.5 rounded text-lg font-formula1 font-normal tracking-widest uppercase transition-colors ${
              activeTab === 'drivers' 
                ? 'bg-[#e10600] text-white shadow-lg' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            Drivers
          </button>
          <button
            onClick={() => setActiveTab('constructors')}
            className={`flex items-center gap-2 px-8 py-2.5 rounded text-lg font-formula1 font-normal tracking-widest uppercase transition-colors ${
              activeTab === 'constructors' 
                ? 'bg-[#e10600] text-white shadow-lg' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            Constructors
          </button>
        </div>
      </div>

      {/* Split Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Main Table Area (60%) */}
        <div className="flex-[6] bg-[#111111] border border-neutral-800 rounded-lg flex flex-col overflow-hidden min-h-0">
          
          {loading ? (
            <div className="p-8 flex flex-col gap-4 w-full">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-neutral-800/50 animate-pulse rounded-md w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
              <AlertTriangle className="w-10 h-10 mb-4 text-[#e10600]" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="flex flex-col w-full h-full min-w-[500px] overflow-auto timing-scroll">
              
              {/* Table Header */}
              <div className="flex items-center w-full pr-4 pl-[20px] py-3 bg-[#151515] border-b border-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-widest sticky top-0 z-10"
                   style={{ 
                     display: 'grid', 
                     gridTemplateColumns: activeTab === 'drivers' 
                      ? 'minmax(40px, 0.6fr) minmax(50px, 0.6fr) minmax(220px, 4.5fr) minmax(140px, 2.5fr) minmax(60px, 1fr) minmax(60px, 1.2fr)'
                      : 'minmax(40px, 0.6fr) minmax(250px, 6fr) minmax(80px, 1.5fr) minmax(80px, 1.5fr)', 
                     gap: '16px' 
                   }}>
                <div className="text-center">POS</div>
                {activeTab === 'drivers' ? (
                  <>
                    <div className="text-center">DNO.</div>
                    <div>DRIVER</div>
                    <div>TEAM</div>
                  </>
                ) : (
                  <div>CONSTRUCTOR</div>
                )}
                <div className="text-right">WINS</div>
                <div className="text-right">PTS</div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col pb-4">
                {activeTab === 'drivers' && driverStandings.map((driver) => {
                  const teamId = driver.Constructors[0]?.constructorId || 'unknown'
                  const teamColor = TEAM_COLORS[teamId] || '#525252'
                  const isSelected = selectedDriverId === driver.Driver.driverId
                  
                  return (
                    <div key={driver.Driver.driverId} 
                         onClick={() => setSelectedDriverId(driver.Driver.driverId)}
                         className={`group flex items-center w-full px-4 py-3 border-b border-neutral-900 cursor-pointer transition-colors ${
                           isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#151515]'
                         }`}
                         style={{ 
                           display: 'grid', 
                           gridTemplateColumns: 'minmax(40px, 0.6fr) minmax(50px, 0.6fr) minmax(220px, 4.5fr) minmax(140px, 2.5fr) minmax(60px, 1fr) minmax(60px, 1.2fr)', 
                           gap: '16px',
                           borderLeft: `4px solid ${teamColor}`
                         }}>
                      <div className="font-formula1 text-xl text-neutral-400 text-center">{driver.position}</div>
                      
                      <div className="font-formula1 text-sm text-neutral-500 text-center">
                        {driver.Driver.permanentNumber || '-'}
                      </div>
                      
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex flex-col truncate">
                          <span className={`font-bold text-sm tracking-wide truncate transition-colors ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                            <span className="text-neutral-500 mr-1">{driver.Driver.code} -</span> {driver.Driver.givenName} <span className="uppercase">{driver.Driver.familyName}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-neutral-400 text-xs font-semibold uppercase tracking-wider truncate">
                        {driver.Constructors[0]?.name || 'N/A'}
                      </div>
                      
                      <div className="text-right text-neutral-400 text-sm font-formula1">
                        {driver.wins}
                      </div>
                      
                      <div className="text-right">
                        <span className={`${isSelected ? 'bg-[#e10600]' : 'bg-neutral-800'} text-white px-3 py-1 rounded text-sm font-bold tabular-nums transition-colors`}>
                          {driver.points}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {activeTab === 'constructors' && constructorStandings.map((constructor) => {
                  const teamId = constructor.Constructor.constructorId
                  const teamColor = TEAM_COLORS[teamId] || '#525252'
                  const isSelected = selectedConstructorId === teamId
                  
                  return (
                    <div key={teamId} 
                         onClick={() => setSelectedConstructorId(teamId)}
                         className={`group flex items-center w-full px-4 py-4 border-b border-neutral-900 cursor-pointer transition-colors ${
                           isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#151515]'
                         }`}
                         style={{ 
                           display: 'grid', 
                           gridTemplateColumns: 'minmax(40px, 0.6fr) minmax(250px, 6fr) minmax(80px, 1.5fr) minmax(80px, 1.5fr)', 
                           gap: '16px',
                           borderLeft: `4px solid ${teamColor}`
                         }}>
                      <div className="font-formula1 text-xl text-neutral-400 text-center">{constructor.position}</div>
                      
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`font-bold text-base tracking-wider uppercase truncate transition-colors ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                          {constructor.Constructor.name}
                        </span>
                      </div>
                      
                      <div className="text-right text-neutral-400 text-sm font-formula1">
                        {constructor.wins}
                      </div>
                      
                      <div className="text-right">
                        <span className={`${isSelected ? 'bg-[#e10600]' : 'bg-neutral-800'} text-white px-4 py-1.5 rounded text-sm font-bold tabular-nums transition-colors`}>
                          {constructor.points}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel Area (40%) */}
        <div className="flex-[4] bg-[#111111] border border-neutral-800 rounded-lg flex flex-col overflow-hidden min-h-0 relative shadow-2xl">
          {activeTab === 'drivers' && selectedDriver ? (
            <div className="flex flex-col h-full relative">
              {/* Background gradient based on team color */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none z-0" 
                style={{ 
                  background: `linear-gradient(135deg, ${TEAM_COLORS[selectedDriver.Constructors[0]?.constructorId] || '#525252'}, transparent 60%)` 
                }} 
              />
              
              {/* Huge Background Number Watermark */}
              <div className="absolute top-0 right-4 z-0 pointer-events-none overflow-hidden">
                <span className="font-formula1 text-[200px] leading-none text-white opacity-[0.03] select-none tracking-tighter">
                  {selectedDriver.Driver.permanentNumber}
                </span>
              </div>
              
              <div className="p-8 z-10 flex flex-col gap-6 h-full">
                <div className="flex flex-col items-start gap-4 flex-1 mt-4">
                  <div>
                    <h3 className="font-formula1 text-4xl text-white uppercase leading-none tracking-tighter mb-2">
                      {selectedDriver.Driver.givenName} <br/>
                      <span className="text-6xl">{selectedDriver.Driver.familyName}</span>
                    </h3>
                    <div className="font-formula1 text-3xl text-[#e10600] mt-4">
                      P{selectedDriver.position}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-[#151515] p-5 rounded-md border border-neutral-800">
                    <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Total Points</p>
                    <p className="text-white text-4xl font-formula1">{selectedDriver.points}</p>
                  </div>
                  <div className="bg-[#151515] p-5 rounded-md border border-neutral-800">
                    <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Wins</p>
                    <p className="text-white text-4xl font-formula1">{selectedDriver.wins}</p>
                  </div>
                  <div className="bg-[#151515] p-5 rounded-md border border-neutral-800">
                    <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Team</p>
                    <p className="text-white text-lg font-bold uppercase truncate">{selectedDriver.Constructors[0]?.name || 'Unknown'}</p>
                  </div>
                  <div className="bg-[#151515] p-5 rounded-md border border-neutral-800">
                    <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Nationality</p>
                    <p className="text-white text-lg font-bold uppercase truncate">{selectedDriver.Driver.nationality}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'constructors' && selectedConstructor ? (
            <div className="flex flex-col h-full relative">
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none z-0" 
                style={{ 
                  background: `linear-gradient(135deg, ${TEAM_COLORS[selectedConstructor.Constructor.constructorId] || '#525252'}, transparent 60%)` 
                }} 
              />
              
              {/* Empty background watermark space to respect copyright */}
              
              <div className="p-8 z-10 flex flex-col gap-6 h-full">
                <div className="flex flex-col items-start gap-4 flex-1 mt-4">
                  <div>
                    <h3 className="font-formula1 text-5xl lg:text-6xl text-white uppercase leading-none tracking-tighter mb-4">
                      {selectedConstructor.Constructor.name}
                    </h3>
                    <div className="font-formula1 text-3xl text-[#e10600]">
                      P{selectedConstructor.position}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-[#151515] p-5 rounded-md border border-neutral-800">
                    <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Total Points</p>
                    <p className="text-white text-4xl font-formula1">{selectedConstructor.points}</p>
                  </div>
                  <div className="bg-[#151515] p-5 rounded-md border border-neutral-800">
                    <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Wins</p>
                    <p className="text-white text-4xl font-formula1">{selectedConstructor.wins}</p>
                  </div>
                  <div className="col-span-2 bg-[#151515] p-5 rounded-md border border-neutral-800 flex items-center justify-between">
                    <div>
                      <p className="text-neutral-500 text-xs font-bold tracking-widest uppercase mb-2">Nationality</p>
                      <p className="text-white text-lg font-bold uppercase truncate">{selectedConstructor.Constructor.nationality}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-600 font-formula1 uppercase tracking-widest">
              Select a row to view details
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
