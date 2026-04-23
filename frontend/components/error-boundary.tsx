"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className="min-h-screen bg-black flex items-center justify-center p-4">
    <Card className="bg-neutral-900 border-red-500/30 max-w-md w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <CardTitle className="text-white text-xl">Something went wrong</CardTitle>
        <CardDescription className="text-neutral-400">
          An unexpected error occurred in the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-black/50 p-3 rounded border border-neutral-700">
          <p className="text-sm text-red-400 font-mono break-all">
            {error.name}: {error.message}
          </p>
        </div>
        <Button 
          onClick={resetError}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-neutral-500">
            <summary className="cursor-pointer hover:text-neutral-400">
              Error Details (Development)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all bg-black/30 p-2 rounded border border-neutral-800">
              {error.stack}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  </div>
)

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
  console.error('Error caught by useErrorHandler:', error, errorInfo)
    // In a real app, you might want to send this to an error reporting service
  }
}
