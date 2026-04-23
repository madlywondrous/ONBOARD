"use client"

import { useEffect, useRef } from "react"
import { DASHBOARD_CONFIG } from "@/lib/config"

interface UseSidebarCursorProps {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  openedBy: 'cursor' | 'button' | null
  setOpenedBy: (openedBy: 'cursor' | 'button' | null) => void
  sidebarWidth?: number
}

export function useSidebarCursor({
  isCollapsed,
  setIsCollapsed,
  openedBy,
  setOpenedBy,
  sidebarWidth = DASHBOARD_CONFIG.sidebarWidth,
}: UseSidebarCursorProps) {
  const isTransitioning = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Disable cursor behavior on mobile devices
    const isMobile = window.innerWidth < 768
    if (isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      // Only trigger below the top bar
      const topBarHeight = DASHBOARD_CONFIG.topBarHeight
      
      // Prevent rapid toggling during transitions
      if (isTransitioning.current) return
      
      // Open sidebar when cursor touches left wall below top bar
      if (isCollapsed && e.clientX <= 8 && e.clientY > topBarHeight) {
        isTransitioning.current = true
        setIsCollapsed(false)
        setOpenedBy('cursor')
        
        // Reset transition flag after animation completes
        setTimeout(() => {
          isTransitioning.current = false
        }, DASHBOARD_CONFIG.animations.sidebarTransition + 50) // Slightly longer than animation duration
      }
      // Close sidebar with debounce when cursor moves away
      else if (!isCollapsed && openedBy === 'cursor' && e.clientX > sidebarWidth + 30) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          if (!isTransitioning.current) {
            isTransitioning.current = true
            setIsCollapsed(true)
            setOpenedBy(null)
            
            setTimeout(() => {
              isTransitioning.current = false
            }, DASHBOARD_CONFIG.animations.sidebarTransition + 50)
          }
        }, DASHBOARD_CONFIG.animations.cursorDebounce)
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Close sidebar when cursor leaves the browser window if opened by cursor
      if (!isCollapsed && openedBy === 'cursor' && 
          (e.clientX <= 0 || e.clientX >= window.innerWidth || 
           e.clientY <= 0 || e.clientY >= window.innerHeight)) {
        if (!isTransitioning.current) {
          isTransitioning.current = true
          setIsCollapsed(true)
          setOpenedBy(null)
          
          setTimeout(() => {
            isTransitioning.current = false
          }, DASHBOARD_CONFIG.animations.sidebarTransition + 50)
        }
      }
    }

    const handleVisibilityChange = () => {
      // Close sidebar when tab becomes hidden if opened by cursor
      if (!isCollapsed && openedBy === 'cursor' && document.hidden) {
        if (!isTransitioning.current) {
          isTransitioning.current = true
          setIsCollapsed(true)
          setOpenedBy(null)
          
          setTimeout(() => {
            isTransitioning.current = false
          }, DASHBOARD_CONFIG.animations.sidebarTransition + 50)
        }
      }
    }

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseout', handleMouseLeave)
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    
    return () => {
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseout', handleMouseLeave)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isCollapsed, openedBy, setIsCollapsed, setOpenedBy, sidebarWidth])

  const toggleSidebar = () => {
    // If sidebar is open via cursor, pin it (change to button mode)
    if (!isCollapsed && openedBy === 'cursor') {
      setOpenedBy('button') // Pin it by changing to button mode
    } else {
      // Normal toggle behavior
      const newCollapsedState = !isCollapsed
      setIsCollapsed(newCollapsedState)
      setOpenedBy(newCollapsedState ? null : 'button') // Mark as opened by button
    }
  }

  return {
    toggleSidebar,
  }
}
