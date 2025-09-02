"use client"

import { memo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trophy, Clock, Flag, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react"

export type FilterType = 'all' | 'upcoming' | 'completed'
export type SortType = 'date' | 'round' | 'country'

interface CalendarFiltersProps {
  activeFilter: FilterType
  activeSort: SortType
  onFilterChange: (filter: FilterType) => void
  onSortChange: (sort: SortType) => void
  raceCounts: {
    total: number
    upcoming: number
    completed: number
  }
}

export const CalendarFilters = memo(function CalendarFilters({
  activeFilter,
  activeSort,
  onFilterChange,
  onSortChange,
  raceCounts
}: CalendarFiltersProps) {
  const [isSortOpen, setIsSortOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false)
      }
    }

    if (isSortOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSortOpen])

  const filters = [
    {
      id: 'upcoming' as FilterType,
      label: 'Upcoming',
      count: raceCounts.upcoming,
      icon: Clock,
      color: 'bg-blue-600/20 text-blue-400 border-blue-600/30'
    },
    {
      id: 'completed' as FilterType,
      label: 'Completed',
      count: raceCounts.completed,
      icon: Trophy,
      color: 'bg-green-600/20 text-green-400 border-green-600/30'
    },
    {
      id: 'all' as FilterType,
      label: 'All',
      count: raceCounts.total,
      icon: Flag,
      color: 'bg-neutral-600/20 text-neutral-300 border-neutral-600/30'
    }
  ]

  const sortOptions = [
    { id: 'date' as SortType, label: 'Date' },
    { id: 'round' as SortType, label: 'Round' },
    { id: 'country' as SortType, label: 'Country' }
  ]

  const getSortLabel = () => {
    const option = sortOptions.find(opt => opt.id === activeSort)
    return option ? option.label : 'Date'
  }

  return (
    <div className="mb-6">
      {/* Single Line: Filter Buttons + Sort Options */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Buttons */}
        {filters.map((filter) => {
          const Icon = filter.icon
          const isActive = activeFilter === filter.id
          
          return (
            <Button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              variant="outline"
              size="sm"
              className={`
                flex items-center gap-2 transition-all duration-200 hover:scale-105
                ${isActive 
                  ? filter.color + ' shadow-lg' 
                  : 'bg-neutral-800/50 text-neutral-400 border-neutral-700/50 hover:bg-neutral-700/50 hover:text-neutral-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{filter.label}</span>
              <Badge 
                variant="secondary" 
                className="bg-black/30 text-xs font-bold px-1.5 py-0.5"
              >
                {filter.count}
              </Badge>
            </Button>
          )
        })}

        {/* Separator */}
        <div className="h-6 w-px bg-neutral-600 mx-2" />

        {/* Sort Options */}
        <span className="text-sm text-neutral-400 font-medium">Sort by:</span>
        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setIsSortOpen(!isSortOpen)}
            variant="outline"
            size="sm"
            className="bg-neutral-800/50 text-neutral-300 border-neutral-700/50 hover:bg-neutral-700/50 hover:text-white flex items-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="font-medium">{getSortLabel()}</span>
            {isSortOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {/* Dropdown Menu */}
          {isSortOpen && (
            <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 min-w-[120px] backdrop-blur-sm">
              {sortOptions.map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => {
                    onSortChange(sort.id)
                    setIsSortOpen(false)
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-sm transition-all duration-200 first:rounded-t-lg last:rounded-b-lg
                    ${activeSort === sort.id
                      ? 'bg-red-600/20 text-red-400 font-medium'
                      : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    }
                  `}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})