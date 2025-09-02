"use client"import {
 useState, useEffect, useMemo 
} from "react"import {
 useF1Calendar 
} from "@/hooks/use-f1-calendar"import type {
 Race, Session 
} from "@/lib/types"import {
 formatDate, formatTime, getStatusColor 
} from "@/lib/utils"import {
 Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"import {
 Badge 
} from "@/components/ui/badge"import {
 Button 
} from "@/components/ui/button"import {
 Calendar, MapPin, Clock, Flag, Trophy, Loader2, Radio, Timer 
} from "lucide-react"import {
 getCurrentOrNextSession, getCountdownString 
} from "@/lib/data"import {
 CalendarFilters, type FilterType, type SortType 
} from "./calendar-filters"import {
 CountryFlag, CountryFlagSmall, CountryFlagMedium, CountryFlagLarge, CountryFlagXLarge 
} from "@/components/ui/country-flag"interface F1CalendarProps {
  races: Race[]  className?: string
}export function F1Calendar({
 races, className = "" 
}: F1CalendarProps) {
  const [selectedRace, setSelectedRace] = useState<Race | null>
(null)  const [currentSession, setCurrentSession] = useState<Session | null>
(null)  const [countdown, setCountdown] = useState("")  const [activeFilter, setActiveFilter] = useState<FilterType>
('upcoming')  const [activeSort, setActiveSort] = useState<SortType>
('date')  const {
 loading, error, completedRaces, upcomingRaces, totalCountries 
} =    useF1Calendar(races)  // Filter and sort races  const filteredAndSortedRaces = useMemo(() =>
 {
    let filtered = races    // Apply filter    switch (activeFilter) {
      case 'upcoming':        filtered = races.filter(race =>
 race.status === 'upcoming')        break      case 'completed':        filtered = races.filter(race =>
 race.status === 'completed')        break      case 'all':      default:        filtered = races        break    
}    // Apply sort    switch (activeSort) {
      case 'round':        return filtered.sort((a, b) =>
 a.round - b.round)      case 'country':        return filtered.sort((a, b) =>
 a.country.localeCompare(b.country))      case 'date':      default:        return filtered.sort((a, b) =>
 new Date(a.date).getTime() - new Date(b.date).getTime())    
}  
}, [races, activeFilter, activeSort])  // Race counts for filters  const raceCounts = useMemo(() =>
 ({
    total: races.length,    upcoming: upcomingRaces,    completed: completedRaces  
}), [races.length, upcomingRaces, completedRaces])  useEffect(() =>
 {
    if (races.length === 0) {
      return;    
}    const initialSession = getCurrentOrNextSession(races);    setCurrentSession(initialSession);    setCountdown(getCountdownString(initialSession));    const interval = setInterval(() =>
 {
      const newSession = getCurrentOrNextSession(races);            setCurrentSession(current =>
 {
        if (newSession?.race.id !== current?.race.id || newSession?.type !== current?.type) {
          return newSession;        
}        return current;      
});      setCountdown(getCountdownString(newSession));    
}, 1000);    return () =>
 clearInterval(interval);  
}, [races]);  if (loading) {
    return (      <div className={
`space-y-4 bg-black min-h-full ${
className
}`
}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="ml-2 text-neutral-400">
Loading race calendar...</span>
        </div>
      </div>
    )  
}  return (    <div className={
`space-y-4 min-h-0 bg-black min-h-full ${
className
}`
}>
      {
/* Error Banner */
}      {
error && (        <div className="bg-orange-500/20 border border-orange-500/30 rounded p-3 text-orange-400 text-sm">
          ⚠️ {
error
}        </div>
      )
}      {
/* Current/Next Session Card */
}      {
currentSession && (        <Card className="bg-black bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {
currentSession.status === "live" ? (                  <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 animate-pulse" />
                ) : (                  <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                )
}                <CardTitle className="text-base sm:text-lg font-bold text-white tracking-wider">
                  {
currentSession.status === "live" ? "LIVE NOW" : "NEXT SESSION"
}                </CardTitle>
                <Badge                  className={
                    currentSession.status === "live"                      ? "bg-red-500 text-white animate-pulse text-xs"                      : "bg-orange-500/20 text-orange-500 text-xs"                  
}                >
                  {
currentSession.status.toUpperCase()
}                </Badge>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs sm:text-sm text-neutral-400">
                  {
currentSession.status === "live" ? "TIME REMAINING" : "STARTS IN"
}                </div>
                <div className="text-lg sm:text-xl font-bold text-red-500 font-mono">
{
countdown
}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CountryFlag                    country={
currentSession.race.country
}                    width={
40
}                    height={
27
}                    className="shadow-lg"                  />
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider">
SESSION DETAILS</h3>
                    <p className="text-xs text-neutral-500">
{
currentSession.race.country
}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Session:</span>
                    <span className="text-white font-bold">
{
currentSession.type
}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Race:</span>
                    <span className="text-white">
{
currentSession.race.name
}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Circuit:</span>
                    <span className="text-white">
{
currentSession.race.circuit
}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Location:</span>
                    <span className="text-white">
                      {
currentSession.race.city
}                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">
TIMING</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Start Time:</span>
                    <span className="text-white font-mono">
{
formatTime(currentSession.time)
}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Duration:</span>
                    <span className="text-white font-mono">
{
currentSession.duration || 90
} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Date:</span>
                    <span className="text-white font-mono">
{
formatDate(currentSession.time)
}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Round:</span>
                    <span className="text-white font-mono">
#{
currentSession.race.round
}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-neutral-700">
              <Button className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 w-full sm:w-auto">
                <Radio className="w-4 h-4 mr-2" />
                {
currentSession.status === "live" ? "Watch Live" : "Set Reminder"
}              </Button>
              <Button                variant="outline"                className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent text-sm px-3 py-2 w-full sm:w-auto"                onClick={
() =>
 setSelectedRace(currentSession.race)
}              >
                Race Details              </Button>
            </div>
          </CardContent>
        </Card>
      )
}      {
/* Header */
}      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wider">
2025 FIA FORMULA ONE WORLD CHAMPIONSHIP™</h1>
          <p className="text-sm text-neutral-400">
Race Schedule</p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 mr-2" />
          Export Calendar        </Button>
      </div>
      {
/* Season Overview */
}      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
TOTAL RACES</p>
                <p className="text-lg sm:text-xl font-bold text-white font-mono">
{
races.length
}</p>
              </div>
              <Flag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
COMPLETED</p>
                <p className="text-lg sm:text-xl font-bold text-green-500 font-mono">
{
completedRaces
}</p>
              </div>
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
UPCOMING</p>
                <p className="text-lg sm:text-xl font-bold text-red-500 font-mono">
{
upcomingRaces
}</p>
              </div>
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
COUNTRIES</p>
                <p className="text-lg sm:text-xl font-bold text-white font-mono">
{
totalCountries
}</p>
              </div>
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>
      {
/* Filters - Positioned after stats */
}      <CalendarFilters        activeFilter={
activeFilter
}        activeSort={
activeSort
}        onFilterChange={
setActiveFilter
}        onSortChange={
setActiveSort
}        raceCounts={
raceCounts
}      />
      {
/* Race Calendar Grid */
}      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {
filteredAndSortedRaces.length === 0 ? (          <div className="col-span-full text-center py-12">
            <div className="text-neutral-400 text-lg mb-2">
No races found</div>
            <div className="text-neutral-500 text-sm">
              Try adjusting your filters to see more races            </div>
            <Button              onClick={
() =>
 {
                setActiveFilter('upcoming')                setActiveSort('date')              
}
}              variant="outline"              className="mt-4 border-neutral-600 text-neutral-400 hover:bg-neutral-800"            >
              Reset Filters            </Button>
          </div>
        ) : (          filteredAndSortedRaces.map((race) =>
 (          <Card            key={
race.id
}            className="bg-neutral-900 border-neutral-700 hover:border-red-500/50 transition-colors cursor-pointer"            onClick={
() =>
 setSelectedRace(race)
}          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-neutral-400 font-mono">
ROUND {
race.round
}</span>
                    <Badge className={
getStatusColor(race.status)
}>
{
race.status.toUpperCase()
}</Badge>
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-white tracking-wider">
{
race.name
}</CardTitle>
                  <p className="text-xs sm:text-sm text-neutral-400">
{
race.circuit
}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <CountryFlagLarge                    country={
race.country
}                    className="shadow-md hover:shadow-lg transition-shadow duration-200"                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <MapPin className="w-3 h-3 text-neutral-400" />
                  <div className="flex items-center gap-2">
                    <CountryFlagSmall country={
race.country
} />
                    <span>
                      {
race.city
}, {
race.country
}                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  <span>
{
formatDate(race.date)
}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span>
{
formatTime(race.sessions.race)
}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-700">
                <div className="text-xs text-neutral-400 mb-1">
WEEKEND SCHEDULE</div>
                <div className="space-y-1 text-xs">
                  {
race.sessions.qualifying && (                    <div className="flex justify-between">
                      <span className="text-neutral-400">
Qualifying:</span>
                      <span className="text-white font-mono">
{
formatTime(race.sessions.qualifying)
}</span>
                    </div>
                  )
}                  <div className="flex justify-between">
                    <span className="text-neutral-400">
Race:</span>
                    <span className="text-red-500 font-mono">
{
formatTime(race.sessions.race)
}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))        )
}      </div>
      {
/* Race Detail Modal */
}      {
selectedRace && (        <div           className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"          onClick={
(e) =>
 {
            if (e.target === e.currentTarget) {
              setSelectedRace(null)            
}          
}
}          onKeyDown={
(e) =>
 {
            if (e.key === 'Escape') {
              setSelectedRace(null)            
}          
}
}          tabIndex={
-1
}        >
          <div className="relative">
            <Card className="bg-neutral-900 border-neutral-700 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              {
/* Close Button - Outside panel, next to right wall at top */
}              <button                onClick={
() =>
 setSelectedRace(null)
}                onKeyDown={
(e) =>
 {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()                    setSelectedRace(null)                  
}                
}
}                className="absolute -top-3 -right-3 z-10 w-10 h-10 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"                aria-label="Close race details"              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={
2
} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <CardHeader className="pb-4">
                <div className="flex items-start gap-6">
                  <CountryFlag                    country={
selectedRace.country
}                    width={
48
}                    height={
64
}                    className="shadow-lg flex-shrink-0"                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-neutral-400 font-mono">
ROUND {
selectedRace.round
}</span>
                      <Badge className={
getStatusColor(selectedRace.status)
}>
{
selectedRace.status.toUpperCase()
}</Badge>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-white tracking-wider mb-1">
{
selectedRace.name
}</CardTitle>
                    <p className="text-base text-neutral-400">
{
selectedRace.circuit
}</p>
                  </div>
                </div>
              </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {
/* Left Column - Race Information */
}                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-3 uppercase">
Race Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-neutral-800/50 rounded">
                        <span className="text-neutral-400">
Location:</span>
                        <div className="flex items-center gap-2">
                          <CountryFlagMedium country={
selectedRace.country
} />
                          <span className="text-white font-medium">
                            {
selectedRace.city
}, {
selectedRace.country
}                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between p-2 bg-neutral-800/50 rounded">
                        <span className="text-neutral-400">
Circuit:</span>
                        <span className="text-white font-medium">
{
selectedRace.circuit
}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-neutral-800/50 rounded">
                        <span className="text-neutral-400">
Race Date:</span>
                        <span className="text-white font-mono font-medium">
{
formatDate(selectedRace.date)
}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {
/* Right Column - Weekend Schedule */
}                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-3 uppercase">
Weekend Schedule</h3>
                    <div className="space-y-2">
                      {
selectedRace.sessions.practice1 && (                        <div className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg">
                          <span className="text-sm text-neutral-300 font-medium">
Practice 1</span>
                          <span className="text-sm text-white font-mono font-bold">
                            {
formatTime(selectedRace.sessions.practice1)
}                          </span>
                        </div>
                      )
}                      {
selectedRace.sessions.practice2 && (                        <div className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg">
                          <span className="text-sm text-neutral-300 font-medium">
Practice 2</span>
                          <span className="text-sm text-white font-mono font-bold">
                            {
formatTime(selectedRace.sessions.practice2)
}                          </span>
                        </div>
                      )
}                      {
selectedRace.sessions.practice3 && (                        <div className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg">
                          <span className="text-sm text-neutral-300 font-medium">
Practice 3</span>
                          <span className="text-sm text-white font-mono font-bold">
                            {
formatTime(selectedRace.sessions.practice3)
}                          </span>
                        </div>
                      )
}                      {
selectedRace.sessions.qualifying && (                        <div className="flex justify-between items-center p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                          <span className="text-sm text-red-400 font-medium">
Qualifying</span>
                          <span className="text-sm text-red-400 font-mono font-bold">
                            {
formatTime(selectedRace.sessions.qualifying)
}                          </span>
                        </div>
                      )
}                      <div className="flex justify-between items-center p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <span className="text-sm text-red-400 font-bold">
Race</span>
                        <span className="text-sm text-red-400 font-mono font-bold">
                          {
formatTime(selectedRace.sessions.race)
}                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              </div>
              {
/* Action Buttons */
}              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-700">
                <Button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 w-full sm:w-auto">
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Calendar                </Button>
                <Button                  variant="outline"                  className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent px-4 py-2 w-full sm:w-auto"                  onClick={
() =>
 window.open(selectedRace.circuitUrl, "_blank")
}                >
                  Circuit Info                </Button>
                <Button                  variant="outline"                  className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent px-4 py-2 w-full sm:w-auto"                  onClick={
() =>
 window.open(selectedRace.url, "_blank")
}                >
                  Race Details                </Button>
              </div>
            </CardContent>
            </Card>
          </div>
        </div>
      )
}    </div>
  )
}