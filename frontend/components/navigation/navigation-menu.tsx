"use client"

import { useCallback, memo } from "react"
import { navigationItems, type DashboardSection } from "@/lib/utils/navigation"

interface NavigationMenuProps {
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
}

export const NavigationMenu = memo(function NavigationMenu({ activeSection, onSectionChange }: NavigationMenuProps) {
  const handleKeyDown = useCallback((event: React.KeyboardEvent, sectionId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSectionChange(sectionId as DashboardSection)
    }
  }, [onSectionChange])

  return (
    <nav className="space-y-1 flex-1" role="navigation" aria-label="Dashboard sections">
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-2">
          Navigation
        </h2>
      </div>
  {navigationItems.map((item) => {
        const isActive = activeSection === item.id
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id as DashboardSection)}
            onKeyDown={(e) => handleKeyDown(e, item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
              isActive
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800 hover:shadow-md"
            }`}
            aria-current={isActive ? "page" : undefined}
            aria-label={`Navigate to ${item.label} section`}
            tabIndex={0}
          >
            <item.icon 
              className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-neutral-400'}`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium tracking-wide">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
})
