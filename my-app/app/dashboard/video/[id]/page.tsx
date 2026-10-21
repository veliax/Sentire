"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getToken } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Clock, AlertCircle, CheckCircle2, FileText, Loader2, Play, Pause } from "lucide-react"

type Severity = "low" | "medium" | "high"

type KeyMoment = {
  timestamp: string
  description: string
  severity: Severity
  offsetSec: number
}

type Video = {
  id: number
  title: string
  location: string
  timestamp: string
  status: string
  url: string
  duration: number
  moments: KeyMoment[]
}

const severityBorder: Record<Severity, string> = {
  low:    "border-l-green-500",
  medium: "border-l-yellow-500",
  high:   "border-l-red-500",
}

const severityBadge: Record<Severity, string> = {
  low:    "bg-green-900 text-green-300",
  medium: "bg-yellow-900 text-yellow-300",
  high:   "bg-red-900 text-red-300",
}

const severityLabel: Record<Severity, string> = {
  low:    "Low Threat",
  medium: "Medium Threat",
  high:   "High Threat",
}

const severityFill: Record<Severity, { vivid: string; faded: string }> = {
  low:    { vivid: "bg-green-500",  faded: "bg-green-500/25"  },
  medium: { vivid: "bg-yellow-500", faded: "bg-yellow-500/25" },
  high:   { vivid: "bg-red-500",    faded: "bg-red-500/25"    },
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-900 text-yellow-300 flex items-center gap-1"><Clock className="size-3" /> Pending</Badge>
    case "processing":
      return <Badge className="bg-blue-900 text-blue-300 flex items-center gap-1"><Clock className="size-3 animate-spin" /> Processing</Badge>
    case "done":
      return <Badge className="bg-green-900 text-green-300 flex items-center gap-1"><CheckCircle2 className="size-3" /> Done</Badge>
    case "error":
      return <Badge className="bg-red-900 text-red-300 flex items-center gap-1"><AlertCircle className="size-3" /> Error</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function VideoPage() {
  const router = useRouter()
  const { id } = useParams()
  const token = getToken()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
    const wasPlayingBeforeDragRef = useRef(false)

  // --- Fetch video + events ------------------------------------------------
  useEffect(() => {
    if (!token) {
      router.push("/auth/login")
      return
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/video/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Video not found")
        return res.json()
      })
      .then((data) => {
        const videoStartMs = data.Time_start ? new Date(data.Time_start).getTime() : 0
        const moments: KeyMoment[] = (data.events ?? []).map((ev: any) => {
          const eventMs = ev.Event_start ? new Date(ev.Event_start).getTime() : videoStartMs
          const offsetSec = Math.max(0, Math.round((eventMs - videoStartMs) / 1000))
          const mm = String(Math.floor(offsetSec / 60)).padStart(2, "0")
          const ss = String(offsetSec % 60).padStart(2, "0")
          return {
            timestamp: `${mm}:${ss}`,
            description: ev.Description ?? "",
            severity: (ev.Severity ?? "low") as Severity,
            offsetSec,
          }
        })

        setVideo({
          id: data.Id,
          title: data.Name,
          location: data.Location ?? "Unknown",
          timestamp: data.Time_start,
          status: data.Status ?? "pending",
          duration: data.Duration ?? 0,
          url: data.Processed_path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${data.Processed_path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/${data.File_path}`,
          moments,
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // --- Track playhead & play state -----------------------------------------
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onTime = () => setCurrentTime(el.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    el.addEventListener("timeupdate", onTime)
    el.addEventListener("seeked", onTime)
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    return () => {
      el.removeEventListener("timeupdate", onTime)
      el.removeEventListener("seeked", onTime)
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
    }
  }, [video?.url])

  function seekTo(offsetSec: number) {
    const el = videoRef.current
    if (!el) return
    el.currentTime = offsetSec
    el.play().catch(() => {})
  }

  // Convert a clientX coordinate into a time offset within the video.
  function clientXToTime(clientX: number): number {
    const bar = timelineRef.current
    if (!bar || !video) return 0
    const rect = bar.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return pct * (video.duration || 1)
  }

  // --- Drag-to-scrub on the timeline bar -----------------------------------
  // We attach window-level listeners during the drag so it keeps tracking the
  // cursor even when it leaves the timeline bar's bounds.
  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const t = clientXToTime(e.clientX)
      const el = videoRef.current
      if (el) el.currentTime = t   // updates state via the "seeked" listener
    }
    const onUp = () => {
      setIsDragging(false)
      // Resume playback if the user was playing before grabbing the scrubber.
      if (wasPlayingBeforeDragRef.current) {
        videoRef.current?.play().catch(() => {})
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [isDragging])

  function handleTimelineMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = videoRef.current
    if (!el) return
    wasPlayingBeforeDragRef.current = !el.paused
    el.pause() // freeze video during scrub for a smoother feel
    el.currentTime = clientXToTime(e.clientX)
    setIsDragging(true)
  }

  // --- Toggle play/pause when clicking the video area ----------------------
  function handleVideoToggle() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  // Trigger report generation, then route to the viewer page.
  async function handleGenerateReport() {
    if (!video) return
    setReportLoading(true)
    setReportError("")
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/video/${video.id}/report`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to generate report")
      }
      router.push(`/dashboard/reports/${video.id}`)
    } catch (err: any) {
      setReportError(err.message ?? "Something went wrong")
    } finally {
      setReportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="w-full bg-muted animate-pulse rounded-lg" style={{ height: "60vh" }} />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Video Not Found</h1>
        </div>
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary underline text-sm w-fit"
        >
          <ArrowLeft className="size-4" /> Go back
        </button>
      </div>
    )
  }

  const duration = video.duration || 1
  const sortedMoments = [...video.moments].sort((a, b) => a.offsetSec - b.offsetSec)
  const segments = sortedMoments.map((m, i) => {
    const start = i === 0 ? 0 : m.offsetSec
    const end = i + 1 < sortedMoments.length ? sortedMoments[i + 1].offsetSec : duration
    return { start, end, severity: m.severity }
  })

  const playheadPct = Math.min(100, Math.max(0, (currentTime / duration) * 100))
  const isDone = video.status === "done"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <p className="text-sm text-muted-foreground">
            {video.location} · {video.timestamp ? new Date(video.timestamp).toLocaleString() : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={video.status} />
          <Button
            onClick={handleGenerateReport}
            disabled={!isDone || reportLoading}
            className="flex items-center gap-2"
          >
            {reportLoading ? (
              <><Loader2 className="size-4 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="size-4" /> Generate Report</>
            )}
          </Button>
        </div>
      </div>

      {reportError && (
        <p className="text-sm text-red-500 bg-red-950 border border-red-800 rounded px-3 py-2">
          {reportError}
        </p>
      )}

      {/* Video Player — native controls hidden; click area toggles play/pause */}
      <div
        className="relative w-full rounded-lg overflow-hidden bg-black cursor-pointer group"
        style={{ height: "60vh" }}
        onClick={handleVideoToggle}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain pointer-events-none"
          autoPlay
          playsInline
        >
          <source src={video.url} type="video/mp4" />
        </video>
        {/* Center play/pause indicator — shows while paused, fades on hover when playing */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
            isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="bg-black/60 rounded-full p-4 backdrop-blur-sm">
            {isPlaying
              ? <Pause className="size-8 text-white" />
              : <Play className="size-8 text-white ml-1" />}
          </div>
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="flex flex-col gap-2">
        {!isDone && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-red-500 animate-pulse inline-block" />
            <span className="text-xs text-muted-foreground">Recording and analyzing...</span>
          </div>
        )}
        <div
          ref={timelineRef}
          className={`relative w-full bg-muted rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-150 ${
            isDragging ? "h-10 ring-2 ring-white/30 shadow-lg" : "h-8"
          }`}
          onMouseDown={handleTimelineMouseDown}
        >
          {segments.map((seg, i) => {
            const startPct = (seg.start / duration) * 100
            const endPct   = Math.min(100, (seg.end / duration) * 100)
            const widthPct = Math.max(0, endPct - startPct)
            if (widthPct <= 0) return null

            const fill = severityFill[seg.severity]
            const playheadInSeg = Math.min(widthPct, Math.max(0, playheadPct - startPct))
            const fadedOffset = playheadInSeg
            const fadedWidth = widthPct - playheadInSeg

            return (
              <div key={i}>
                {playheadInSeg > 0 && (
                  <div
                    className={`absolute top-0 bottom-0 ${fill.vivid}`}
                    style={{ left: `${startPct}%`, width: `${playheadInSeg}%` }}
                  />
                )}
                {fadedWidth > 0 && (
                  <div
                    className={`absolute top-0 bottom-0 ${fill.faded}`}
                    style={{ left: `${startPct + fadedOffset}%`, width: `${fadedWidth}%` }}
                  />
                )}
              </div>
            )
          })}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)] pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          />
        </div>
      </div>

      {/* Key Moments */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Key Moments</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="size-4" /> Low Threat
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertCircle className="size-4" /> Medium Threat
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <AlertCircle className="size-4" /> High Threat
            </span>
          </div>
        </div>

        {video.moments.length === 0 ? (
          <div className="flex flex-col gap-3">
            {["00:00", "00:03", "00:07"].map((ts, i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-card border border-border border-l-4 border-l-muted flex flex-col gap-1"
              >
                <span className="text-xs font-mono text-muted-foreground">{ts}</span>
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Key moments will appear here once the video has been analyzed by the AI
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {video.moments.map((moment, i) => (
              <button
                key={i}
                onClick={() => seekTo(moment.offsetSec)}
                className={`p-4 rounded-lg bg-card border border-border border-l-4 ${severityBorder[moment.severity]} flex flex-col gap-1 text-left cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold">{moment.timestamp}</span>
                  <Badge className={`text-xs ${severityBadge[moment.severity]}`}>
                    {severityLabel[moment.severity]}
                  </Badge>
                </div>
                <p className="text-sm">{moment.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
