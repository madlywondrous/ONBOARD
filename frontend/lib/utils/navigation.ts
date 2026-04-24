import { Calendar, Trophy, Radio } from "lucide-react"
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
]

export type DashboardSection = "live" | "calendar"
