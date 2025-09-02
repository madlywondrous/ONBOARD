"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, RefreshCw } from "lucide-react"
import { useState } from "react"
import { useF1Season } from "@/hooks/use-f1-season"

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Use F1 season hook for dynamic status
  const { seasonStatus, refresh } = useF1Season()
  
  // Get indicator color based on season status
  const getIndicatorColor = () => {
    switch (seasonStatus.indicator) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'blue': return 'bg-blue-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-green-500'
    }
  }
  
  // Get text color based on season status
  const getTextColor = () => {
    switch (seasonStatus.indicator) {
      case 'green': return 'text-green-400'
      case 'yellow': return 'text-yellow-400'
      case 'blue': return 'text-blue-400'
      case 'red': return 'text-red-400'
      default: return 'text-green-400'
    }
  }
  
  const handleRefresh = () => {
    setIsRefreshing(true)
    // Refresh F1 season data and simulate page refresh
    refresh()
    setTimeout(() => {
      setIsRefreshing(false)
      // Add your refresh logic here
      window.location.reload()
    }, 1000)
  }

  return (
    <div className="h-12 flex-shrink-0 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hover:bg-transparent p-1"
          aria-label="Toggle navigation sidebar"
        >
          <img
            src="/icons/sidebar.png"
            alt="Toggle Sidebar"
            width={28}
            height={28}
            className="transition-transform hover:scale-110"
          />
        </Button>
        <div className="text-lg sm:text-xl text-neutral-400">
          <span className="hidden sm:inline">ONBOARD / </span>
          <span className="text-red-500 font-semibold">2025 SEASON</span>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notification Button */}
        <Card className="bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50 transition-colors cursor-pointer" role="button" aria-label="View notifications" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); /* Add notification logic */ }}>
          <CardContent className="px-2 py-2 flex items-center justify-center min-w-8 sm:min-w-10 h-8">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
          </CardContent>
        </Card>
        
        {/* Refresh Button */}
        <Card 
          className={`bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50 transition-all duration-500 ease-in-out cursor-pointer overflow-hidden ${
            isRefreshing ? 'w-auto px-1' : 'w-8 sm:w-10'
          }`}
          onClick={handleRefresh}
          role="button"
          aria-label={isRefreshing ? "Refreshing data" : "Refresh data"}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRefresh(); } }}
        >
          <CardContent className="px-2 py-2 flex items-center justify-center h-8 min-w-4 sm:min-w-6">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 transition-transform duration-1000 flex-shrink-0 ${
                isRefreshing ? 'animate-spin' : ''
              }`} />
              {isRefreshing && (
                <span className={`text-sm sm:text-base text-neutral-400 font-medium transition-all duration-500 ease-in-out hidden sm:inline ${
                  isRefreshing ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                }`}>
                  REFRESHING
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Status Button - Responsive */}
        <Card 
          className="bg-neutral-700/50 border-neutral-600 hover:bg-neutral-600/50 transition-colors cursor-pointer px-1 sm:px-2"
          role="button"
          aria-label={`Season status: ${seasonStatus.message}`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); /* Add status logic */ }}
        >
          <CardContent className="px-1 py-2 flex items-center justify-center h-8 min-w-4 sm:min-w-6">
            <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse flex-shrink-0 ${getIndicatorColor()}`}></div>
              <span className={`text-sm sm:text-base font-medium ${getTextColor()} hidden sm:inline`}>
                {seasonStatus.message}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
