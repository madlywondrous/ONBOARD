import { Calendar, Users, Trophy, BarChart3, Flag, Radio } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavigationItem {
  id: string
  icon: LucideIcon
  label: string
  href?: string
}

export const navigationItems: NavigationItem[] = [
  { id: "live", icon: Radio, label: "LIVE" },
  { id: "calendar", icon: Calendar, label: "SCHEDULE" },
  { id: "drivers", icon: Users, label: "DRIVERS" },
  { id: "teams", icon: Flag, label: "TEAMS" },
  { id: "standings", icon: Trophy, label: "STANDINGS" },
  { id: "statistics", icon: BarChart3, label: "STATISTICS" },
]

export type DashboardSection = "live" | "calendar" | "drivers" | "teams" | "standings" | "statistics"
