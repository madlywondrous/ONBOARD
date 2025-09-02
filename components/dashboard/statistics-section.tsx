import { BarChart3 } from "lucide-react"

export function StatisticsSection() {
  return (
    <div className="space-y-4 bg-black min-h-full">
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Statistics</h2>
        <p className="text-neutral-400">Race statistics and analytics coming soon...</p>
      </div>
    </div>
  )
}
