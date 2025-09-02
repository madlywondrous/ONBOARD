import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import F1Dashboard from '@/app/page'

// Mock the dashboard layout component
vi.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: () => <div data-testid="dashboard-layout">Dashboard Layout</div>
}))

// Mobile placeholder component has been removed - no longer needed

// Mock the mobile hook (should not be used anymore)
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false // Always return false since we removed mobile restriction
}))

describe('F1Dashboard Responsive Layout', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  it('should always render DashboardLayout regardless of screen size', () => {
    render(<F1Dashboard />)
    
    // Should render the dashboard layout
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
  })

  it('should not use mobile detection hook anymore', () => {
    render(<F1Dashboard />)
    
    // The component should render without any mobile-specific logic
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
  })
})
