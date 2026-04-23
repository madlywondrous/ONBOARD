"use client"

import { F1Calendar } from "@/components/f1-calendar/f1-calendar"
import { CalendarSkeleton } from "@/components/f1-calendar/calendar-skeleton"
import { useF1Calendar } from "@/hooks/use-f1-calendar"
import { Button } from "@/components/ui/button"

export function CalendarSection() {
  const { races, loading, error, retry } = useF1Calendar()

  if (loading) {
    return <CalendarSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4" role="img" aria-label="Error">⚠️</div>
          <h2 className="text-red-400 text-lg font-semibold mb-2">Failed to load F1 Calendar</h2>
          <p className="text-neutral-500 text-sm mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={retry}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-neutral-600 text-neutral-400 hover:bg-neutral-800"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <F1Calendar races={races} />
}
