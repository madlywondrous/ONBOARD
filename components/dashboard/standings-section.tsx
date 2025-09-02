import { Trophy } from "lucide-react"

export function StandingsSection() {
  return (
    <div className="space-y-4 bg-black min-h-full">
      <div className="text-center py-20">
        <Trophy className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Standings</h2>
        <p className="text-neutral-400">Championship standings coming soon...</p>
      </div>
    </div>
  )
}
