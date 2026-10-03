"use client"

import { DashboardProvider, useDashboard } from "@/lib/context/dashboard-context"
import { TopBar } from "@/components/layout/top-bar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

function DashboardLayoutInner() {
  const { 
    state: { activeSection, isHydrated }
  } = useDashboard()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Top Bar - Full Width */}
      <TopBar />
      
      {/* Content Area Below Top Bar */}
      <div className="flex flex-1 min-h-0">

        {/* Main Content */}
        {isHydrated && activeSection ? (
          <DashboardContent activeSection={activeSection} />
        ) : (
          <div id="main-content" className="flex-1 min-w-0 min-h-0 overflow-auto bg-black p-6 flex items-center justify-center">
            <div className="animate-pulse">
              <div className="text-neutral-400 text-lg">Loading dashboard...</div>
              <div className="text-neutral-600 text-sm mt-2">Initializing F1 experience</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardLayout() {
  return (
    <DashboardProvider>
      <DashboardLayoutInner />
    </DashboardProvider>
  )
}
