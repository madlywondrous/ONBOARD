"use client"

import { DashboardProvider, useDashboard } from "@/lib/context/dashboard-context"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { TopBar } from "@/components/layout/top-bar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { useSidebarCursor } from "@/hooks/use-sidebar-cursor"

function DashboardLayoutInner() {
  const { 
    state: { activeSection, isHydrated, sidebarCollapsed, sidebarOpenedBy },
    setActiveSection,
    setSidebarCollapsed,
    setSidebarOpenedBy
  } = useDashboard()

  const { toggleSidebar } = useSidebarCursor({
    isCollapsed: sidebarCollapsed,
    setIsCollapsed: setSidebarCollapsed,
    openedBy: sidebarOpenedBy,
    setOpenedBy: setSidebarOpenedBy,
  })

  const handleSectionChange = (newSection: typeof activeSection) => {
    if (newSection) {
      setActiveSection(newSection)
      // On mobile, close sidebar after selection
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
        setSidebarOpenedBy(null)
      }
    }
  }

  const handleSidebarClose = () => {
    setSidebarCollapsed(true)
    setSidebarOpenedBy(null)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Top Bar - Full Width */}
      <TopBar onToggleSidebar={toggleSidebar} />
      
      {/* Content Area Below Top Bar */}
      <div className="flex flex-1 min-h-0">
        {isHydrated && activeSection && (
          <DashboardSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isCollapsed={sidebarCollapsed}
            openedBy={sidebarOpenedBy}
            onClose={handleSidebarClose}
          />
        )}

        {/* Main Content */}
        {isHydrated && activeSection ? (
          <DashboardContent activeSection={activeSection} />
        ) : (
          <div className="flex-1 min-w-0 min-h-0 overflow-auto bg-black p-6 flex items-center justify-center">
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
