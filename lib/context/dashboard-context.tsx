"use client"

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { DashboardSection } from '@/lib/utils/navigation'

interface DashboardState {
  activeSection: DashboardSection | null
  sidebarCollapsed: boolean
  sidebarOpenedBy: 'cursor' | 'button' | null
  isHydrated: boolean
  preferences: {
    theme: 'dark' | 'light'
    autoCollapseSidebar: boolean
    enableAnimations: boolean
  }
}

type DashboardAction =
  | { type: 'SET_ACTIVE_SECTION'; payload: DashboardSection }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_SIDEBAR_OPENED_BY'; payload: 'cursor' | 'button' | null }
  | { type: 'SET_HYDRATED'; payload: boolean }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<DashboardState['preferences']> }
  | { type: 'INITIALIZE_STATE'; payload: Partial<DashboardState> }

const initialState: DashboardState = {
  activeSection: null,
  sidebarCollapsed: false,
  sidebarOpenedBy: 'button',
  isHydrated: false,
  preferences: {
    theme: 'dark',
    autoCollapseSidebar: true,
    enableAnimations: true
  }
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.payload }
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload }
    case 'SET_SIDEBAR_OPENED_BY':
      return { ...state, sidebarOpenedBy: action.payload }
    case 'SET_HYDRATED':
      return { ...state, isHydrated: action.payload }
    case 'UPDATE_PREFERENCES':
      return { 
        ...state, 
        preferences: { ...state.preferences, ...action.payload }
      }
    case 'INITIALIZE_STATE':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

interface DashboardContextType {
  state: DashboardState
  setActiveSection: (section: DashboardSection) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarOpenedBy: (openedBy: 'cursor' | 'button' | null) => void
  updatePreferences: (preferences: Partial<DashboardState['preferences']>) => void
  toggleSidebar: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)

  // Initialize state from localStorage
  useEffect(() => {
    try {
      const savedSection = localStorage.getItem('dashboard-active-section') as DashboardSection
      const savedPreferences = localStorage.getItem('dashboard-preferences')
      
      const defaultSection = savedSection && ['calendar', 'drivers', 'teams', 'standings', 'statistics'].includes(savedSection) 
        ? savedSection 
        : 'calendar'

      const preferences = savedPreferences 
        ? { ...initialState.preferences, ...JSON.parse(savedPreferences) }
        : initialState.preferences

      const isMobile = window.innerWidth < 768
      
      dispatch({
        type: 'INITIALIZE_STATE',
        payload: {
          activeSection: defaultSection,
          sidebarCollapsed: isMobile || preferences.autoCollapseSidebar,
          sidebarOpenedBy: isMobile ? null : 'button',
          preferences,
          isHydrated: true
        }
      })
    } catch (error) {
      console.warn('Failed to load dashboard state from localStorage:', error)
      dispatch({
        type: 'INITIALIZE_STATE',
        payload: {
          activeSection: 'calendar',
          sidebarCollapsed: window.innerWidth < 768,
          sidebarOpenedBy: window.innerWidth < 768 ? null : 'button',
          isHydrated: true
        }
      })
    }
  }, [])

  const setActiveSection = useCallback((section: DashboardSection) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: section })
    try {
      localStorage.setItem('dashboard-active-section', section)
    } catch (error) {
      console.warn('Failed to save active section to localStorage:', error)
    }
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed })
  }, [])

  const setSidebarOpenedBy = useCallback((openedBy: 'cursor' | 'button' | null) => {
    dispatch({ type: 'SET_SIDEBAR_OPENED_BY', payload: openedBy })
  }, [])

  const updatePreferences = useCallback((newPreferences: Partial<DashboardState['preferences']>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: newPreferences })
    try {
      const updatedPreferences = { ...state.preferences, ...newPreferences }
      localStorage.setItem('dashboard-preferences', JSON.stringify(updatedPreferences))
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error)
    }
  }, [state.preferences])

  const toggleSidebar = useCallback(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      setSidebarCollapsed(!state.sidebarCollapsed)
      setSidebarOpenedBy(state.sidebarCollapsed ? 'button' : null)
    } else {
      setSidebarCollapsed(!state.sidebarCollapsed)
      setSidebarOpenedBy(state.sidebarCollapsed ? 'button' : null)
    }
  }, [state.sidebarCollapsed, setSidebarCollapsed, setSidebarOpenedBy])

  const contextValue: DashboardContextType = {
    state,
    setActiveSection,
    setSidebarCollapsed,
    setSidebarOpenedBy,
    updatePreferences,
    toggleSidebar
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

export type { DashboardState, DashboardAction }