import { memo } from "react"
import { F1_CONFIG } from "@/lib/config"

export const SessionActivity = memo(function SessionActivity() {
  return (
    <div className="mt-auto p-3 bg-neutral-800 border border-neutral-700 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-white font-medium">SEASON ACTIVE</span>
      </div>
      <div className="text-xs text-neutral-500 space-y-1">
        <div>CURRENT: {F1_CONFIG.currentSeason} SEASON</div>
        <div>RACES: {F1_CONFIG.maxRounds} SCHEDULED</div>
        <div>DRIVERS: 20 ACTIVE</div>
      </div>
    </div>
  )
})
