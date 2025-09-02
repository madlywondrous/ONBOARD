import { Users } from "lucide-react"

export function DriversSection() {
  return (
    <div className="space-y-4 bg-black min-h-full">
      <div className="text-center py-20">
        <Users className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Drivers</h2>
        <p className="text-neutral-400">Driver standings and profiles coming soon...</p>
      </div>
    </div>
  )
}
