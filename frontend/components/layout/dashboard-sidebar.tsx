"use client"

import { useEffect, useCallback, memo } from "react"
import { NavigationMenu } from "@/components/navigation/navigation-menu"
import { SessionActivity } from "@/components/navigation/session-activity"
import type { DashboardSection } from "@/lib/utils/navigation"

interface DashboardSidebarProps {
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
  isCollapsed: boolean
  openedBy: 'cursor' | 'button' | null
  onClose?: () => void
}

export const DashboardSidebar = memo(function DashboardSidebar({ 
  activeSection, 
  onSectionChange, 
  isCollapsed,
  openedBy,
  onClose
}: DashboardSidebarProps) {
  // Handle escape key to close sidebar on mobile
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isCollapsed && onClose) {
      onClose()
    }
  }, [isCollapsed, onClose])

  useEffect(() => {
    if (!isCollapsed) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when sidebar is open on mobile
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isCollapsed, handleKeyDown])

  // Enhanced section change handler with analytics
  const handleSectionChange = useCallback((section: DashboardSection) => {
    onSectionChange(section)
    
    // Auto-close on mobile after selection
    if (window.innerWidth < 768 && onClose) {
      // Small delay for better UX
      setTimeout(onClose, 150)
    }
  }, [onSectionChange, onClose])

  return (
    <>
      {/* Desktop Sidebar - Content spacer (pushes content when in button mode only) */}
      <div
        className={`hidden md:block bg-transparent border-r-0 transition-all duration-700 ease-out flex-shrink-0 overflow-hidden ${
          isCollapsed ? 'w-0' : openedBy === 'button' ? 'w-48' : 'w-0'
        }`}
        aria-hidden="true"
      >
        {/* Empty spacer - no content, just for layout spacing */}
      </div>

      {/* Main Sidebar - Slides in from left */}
      <aside
        className={`fixed z-50 w-48 bg-neutral-900 border-r border-neutral-700 overflow-hidden transition-all duration-500 ease-out ${
          isCollapsed ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        } md:transition-transform md:duration-700`}
        style={{ 
          height: 'calc(100vh - 3rem)',
          top: '3rem'
        }}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={isCollapsed}
      >
        <div className="p-4 h-full flex flex-col w-48">
          {/* Close button for mobile */}
          <div className="flex justify-end mb-2 md:hidden">
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
              aria-label="Close navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <NavigationMenu 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
          <SessionActivity />
        </div>
      </aside>

      {/* Mobile overlay when sidebar is open */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          style={{ top: '3rem' }}
          onClick={onClose}
          role="button"
          aria-label="Close navigation menu"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClose?.()
            }
          }}
        />
      )}
    </>
  )
})
