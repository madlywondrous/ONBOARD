"use client"

import { LiveTimingF1 } from "./live-timing-f1"

export function LiveSection() {
  console.log("🔴 LiveSection component rendered - using LiveTimingF1 with SSE")
  return <LiveTimingF1 />
}
