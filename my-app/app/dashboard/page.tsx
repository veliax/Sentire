"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { MapPin, Clock } from "lucide-react"

const severityColor: Record<string, string> = {
  low:    "border-green-500",
  medium: "border-yellow-500",
  high:   "border-red-500",
}

type VideoFeed = {
  id: string
  title: string
  location: string
  severity: "low" | "medium" | "high"
  timestamp: string
  status: string
  url: string
}

export default function OverviewPage() {
  const router = useRouter()
  const [feeds, setFeeds] = useState<VideoFeed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push("/auth/login")
      return
    }

    function fetchFeeds() {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/video`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const arr = Array.isArray(data) ? data : []
          const normalized = arr.map((v: any) => ({
            id: v.Id,
            title: v.Name,
            location: v.Location ?? "Unknown",
            severity: v.Severity ?? "low",
            timestamp: v.Time_start,
            status: v.Status ?? "pending",
            url: v.Processed_path
              ? `${process.env.NEXT_PUBLIC_API_URL}/${v.Processed_path}`
              : `${process.env.NEXT_PUBLIC_API_URL}/${v.File_path}`,
          }))
          setFeeds(normalized)
          setLoading(false)

          const stillProcessing = normalized.some(
            (f) => f.status === "pending" || f.status === "processing"
          )
          if (stillProcessing) {
            setTimeout(fetchFeeds, 5000)
          }
        })
        .catch(() => {
          setFeeds([])
          setLoading(false)
        })
    }

    fetchFeeds()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">Live and recent camera feeds</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
          <p className="text-lg">No video feeds available</p>
          <a href="/dashboard/upload" className="text-primary underline underline-offset-4 text-sm">
            Upload a video to get started
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className={`relative rounded-lg overflow-hidden border-2 bg-black cursor-pointer hover:opacity-90 transition-opacity ${severityColor[feed.severity]}`}
              onClick={() => router.push(`/dashboard/video/${feed.id}`)}
            >
              <video
                className="w-full aspect-video object-cover opacity-90"
                autoPlay
                muted
                loop
              >
                <source src={feed.url} type="video/mp4" />
              </video>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute top-2 right-2">
                {feed.status === "done" ? (
                  <Badge className="bg-green-900 text-green-300 text-xs">Processed</Badge>
                ) : feed.status === "processing" ? (
                  <Badge className="bg-blue-900 text-blue-300 text-xs">Processing</Badge>
                ) : (
                  <Badge className="bg-yellow-900 text-yellow-300 text-xs">Pending</Badge>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
                <span className="text-white font-semibold text-sm">{feed.title}</span>
                <div className="flex items-center gap-1 text-white/70 text-xs">
                  <MapPin className="size-3" />
                  <span>{feed.location}</span>
                </div>
                <div className="flex items-center gap-1 text-white/70 text-xs">
                  <Clock className="size-3" />
                  <span>{feed.timestamp ? new Date(feed.timestamp).toLocaleString() : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
