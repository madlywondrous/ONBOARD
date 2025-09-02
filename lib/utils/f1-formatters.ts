export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export const formatTime = (dateString?: string) => {
  if (!dateString) return "TBA"
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-500/20 text-green-500"
    case "upcoming":
      return "bg-red-500/20 text-red-500"
    case "live":
      return "bg-red-500 text-white animate-pulse"
    default:
      return "bg-neutral-500/20 text-neutral-300"
  }
}
