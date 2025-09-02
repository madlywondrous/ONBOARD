"use client"

import { memo, useState } from "react"
import Image from "next/image"
import { getCountryFlagPath, hasCountryFlag } from "@/lib/utils/country-flags"
import { Flag } from "lucide-react"

interface CountryFlagProps {
  country: string
  width?: number
  height?: number
  className?: string
  showFallback?: boolean
}

export const CountryFlag = memo(function CountryFlag({
  country,
  width = 24,
  height = 16,
  className = "",
  showFallback = true
}: CountryFlagProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if flag exists for this country
  if (!hasCountryFlag(country) || imageError) {
    if (!showFallback) return null
    
    return (
      <div 
        className={`flex items-center justify-center bg-neutral-700 border border-neutral-600 rounded-sm ${className}`}
        style={{ width, height }}
        title={`${country} flag`}
      >
        <Flag className="w-3 h-3 text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-neutral-800 animate-pulse rounded-sm ${className}`}
          style={{ width, height }}
        />
      )}
      <Image
        src={getCountryFlagPath(country)}
        alt={`${country} flag`}
        width={width}
        height={height}
        className={`rounded-sm border border-neutral-600/30 shadow-sm hover:shadow-md hover:border-neutral-500/50 transition-all duration-200 object-cover ${className} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true)
          setIsLoading(false)
        }}
        priority={false}
      />
    </div>
  )
})

// Preset sizes for common use cases
export const CountryFlagSmall = memo(function CountryFlagSmall({ country, className }: { country: string; className?: string }) {
  return <CountryFlag country={country} width={16} height={11} className={className} />
})

export const CountryFlagMedium = memo(function CountryFlagMedium({ country, className }: { country: string; className?: string }) {
  return <CountryFlag country={country} width={24} height={16} className={className} />
})

export const CountryFlagLarge = memo(function CountryFlagLarge({ country, className }: { country: string; className?: string }) {
  return <CountryFlag country={country} width={32} height={22} className={className} />
})

export const CountryFlagXLarge = memo(function CountryFlagXLarge({ country, className }: { country: string; className?: string }) {
  return <CountryFlag country={country} width={48} height={32} className={className} />
})