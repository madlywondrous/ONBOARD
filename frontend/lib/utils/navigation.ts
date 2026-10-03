import { Calendar, Trophy, Radio, Home } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavigationItem {
  id: string
  icon: LucideIcon
  label: string
  href?: string
}

export const navigationItems: NavigationItem[] = [
  { id: "home", icon: Home, label: "HOME" },
  { id: "live", icon: Radio, label: "LIVE" },
  { id: "calendar", icon: Calendar, label: "SCHEDULE" },
  { id: "standings", icon: Trophy, label: "STANDINGS" },
]

export type DashboardSection = "home" | "live" | "calendar" | "standings"
