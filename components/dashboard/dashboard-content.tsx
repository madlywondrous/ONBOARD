import React, { Suspense, memo } from "react"
import type { DashboardSection } from "@/lib/utils/navigation"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/error-boundary"

// Dynamic imports with loading components
const CalendarSection = dynamic(() => import("@/components/dashboard/calendar-section").then(mod => ({ default: mod.CalendarSection })), { 
  ssr: false,
  loading: () => <SectionSkeleton />
})
const DriversSection = dynamic(() => import("@/components/dashboard/drivers-section").then(mod => ({ default: mod.DriversSection })), { 
  ssr: false,
  loading: () => <SectionSkeleton />
})
const TeamsSection = dynamic(() => import("@/components/dashboard/teams-section").then(mod => ({ default: mod.TeamsSection })), { 
  ssr: false,
  loading: () => <SectionSkeleton />
})
const StandingsSection = dynamic(() => import("@/components/dashboard/standings-section").then(mod => ({ default: mod.StandingsSection })), { 
  ssr: false,
  loading: () => <SectionSkeleton />
})
const StatisticsSection = dynamic(() => import("@/components/dashboard/statistics-section").then(mod => ({ default: mod.StatisticsSection })), { 
  ssr: false,
  loading: () => <SectionSkeleton />
})

// Skeleton loading component
function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-neutral-800 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-neutral-800 rounded"></div>
        ))}
      </div>
    </div>
  )
}

// Error fallback components
const CalendarErrorFallback = ({ error }: { error: Error }) => <SectionErrorFallback error={error} section="Calendar" />
const DriversErrorFallback = ({ error }: { error: Error }) => <SectionErrorFallback error={error} section="Drivers" />
const TeamsErrorFallback = ({ error }: { error: Error }) => <SectionErrorFallback error={error} section="Teams" />
const StandingsErrorFallback = ({ error }: { error: Error }) => <SectionErrorFallback error={error} section="Standings" />
const StatisticsErrorFallback = ({ error }: { error: Error }) => <SectionErrorFallback error={error} section="Statistics" />

// Error fallback component
function SectionErrorFallback({ error, section }: { error: Error; section: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-red-400 text-lg font-semibold mb-2">Failed to load {section}</h2>
        <p className="text-neutral-500 text-sm mb-4">{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

interface DashboardContentProps {
  activeSection: DashboardSection
}

export const DashboardContent = memo(function DashboardContent({ activeSection }: DashboardContentProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "calendar":
        return (
          <ErrorBoundary fallback={CalendarErrorFallback}>
            <Suspense fallback={<SectionSkeleton />}>
              <CalendarSection />
            </Suspense>
          </ErrorBoundary>
        )
      case "drivers":
        return (
          <ErrorBoundary fallback={DriversErrorFallback}>
            <Suspense fallback={<SectionSkeleton />}>
              <DriversSection />
            </Suspense>
          </ErrorBoundary>
        )
      case "teams":
        return (
          <ErrorBoundary fallback={TeamsErrorFallback}>
            <Suspense fallback={<SectionSkeleton />}>
              <TeamsSection />
            </Suspense>
          </ErrorBoundary>
        )
      case "standings":
        return (
          <ErrorBoundary fallback={StandingsErrorFallback}>
            <Suspense fallback={<SectionSkeleton />}>
              <StandingsSection />
            </Suspense>
          </ErrorBoundary>
        )
      case "statistics":
        return (
          <ErrorBoundary fallback={StatisticsErrorFallback}>
            <Suspense fallback={<SectionSkeleton />}>
              <StatisticsSection />
            </Suspense>
          </ErrorBoundary>
        )
      default:
        return <SectionErrorFallback error={new Error("Unknown section")} section="Unknown" />
    }
  }

  return (
    <div id="main-content" className="flex-1 min-w-0 min-h-0 overflow-auto bg-black p-3 sm:p-6" style={{ overscrollBehavior: 'none' }}>
      {renderSection()}
    </div>
  )
})
