import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function LoadingSpinner({ 
  size = "md", 
  text, 
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-2">
        <Loader2 className={cn("animate-spin text-red-500", sizeClasses[size])} />
        {text && (
          <span className="text-sm text-neutral-400">{text}</span>
        )}
      </div>
    </div>
  )
}

interface LoadingSkeletonProps {
  className?: string
  children?: React.ReactNode
}

export function LoadingSkeleton({ className, children }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {children || <div className="bg-neutral-800 rounded"></div>}
    </div>
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
}

export function LoadingCard({ title = "Loading...", description }: LoadingCardProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6">
      <div className="flex items-center justify-center h-32">
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" />
          <div>
            <h3 className="text-white font-medium">{title}</h3>
            {description && (
              <p className="text-sm text-neutral-400 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
