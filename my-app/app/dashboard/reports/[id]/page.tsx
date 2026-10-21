"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getToken } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Download, RefreshCw, Loader2 } from "lucide-react"

type Severity = "low" | "medium" | "high"

type Stats = {
  total_frames_analyzed: number
  priority_frames: number
  object_class_counts: Record<string, number>
  events_total: number
  severity_counts: { low: number; medium: number; high: number }
  highest_severity: "high" | "medium" | "low" | "none"
}

type EventRow = {
  Sequence_number: number
  Severity: Severity
  Description: string
  Event_start: string
  Event_end: string
  Duration: number
}

type ReportData = {
  Id: number
  Video_id: number
  Narrative: string
  Generated_at: string
  Stats: Stats
  Video: {
    Id: number
    Name: string
    Location: string | null
    Duration: number
    Time_start: string
    Time_end: string
  }
  Events: EventRow[]
}

const severityBadge: Record<Severity, string> = {
  low:    "bg-green-900 text-green-300",
  medium: "bg-yellow-900 text-yellow-300",
  high:   "bg-red-900 text-red-300",
}

const severityLabel: Record<Severity, string> = {
  low:    "Low",
  medium: "Medium",
  high:   "High",
}

export default function ReportViewerPage() {
  const router = useRouter()
  const { id } = useParams()
  const token = getToken()

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [regenerating, setRegenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  function load() {
    if (!token) {
      router.push("/auth/login")
      return
    }
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/video/${id}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 404) throw new Error("No report has been generated for this video yet")
        if (!res.ok) throw new Error("Failed to load report")
        return res.json()
      })
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  async function handleRegenerate() {
    setRegenerating(true)
    setError("")
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/video/${id}/report`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to regenerate report")
      }
      load()
    } catch (err: any) {
      setError(err.message ?? "Something went wrong")
    } finally {
      setRegenerating(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/video/${id}/report/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error("Failed to download PDF")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${report?.Video.Name ?? `report_${id}`}_report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message ?? "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Report Unavailable</h1>
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

  const { Video: video, Stats: stats, Events: events, Narrative, Generated_at } = report

  const formatDate = (iso?: string | null) => iso ? new Date(iso).toLocaleString() : "—"
  const formatTime = (iso: string) => {
    const startMs = new Date(video.Time_start).getTime()
    const offsetSec = Math.max(0, Math.round((new Date(iso).getTime() - startMs) / 1000))
    const mm = String(Math.floor(offsetSec / 60)).padStart(2, "0")
    const ss = String(offsetSec % 60).padStart(2, "0")
    return `${mm}:${ss}`
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Sentire Incident Report
          </p>
          <h1 className="text-2xl font-bold">{video.Name}</h1>
          <p className="text-sm text-muted-foreground">
            Generated {formatDate(Generated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2"
          >
            {regenerating
              ? <><Loader2 className="size-4 animate-spin" /> Regenerating...</>
              : <><RefreshCw className="size-4" /> Regenerate</>}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2"
          >
            {downloading
              ? <><Loader2 className="size-4 animate-spin" /> Downloading...</>
              : <><Download className="size-4" /> Download PDF</>}
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Location</p>
          <p className="font-medium">{video.Location ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Duration</p>
          <p className="font-medium">{video.Duration}s</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Recorded</p>
          <p className="font-medium text-sm">{formatDate(video.Time_start)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Highest severity</p>
          <p className="font-medium capitalize">{stats.highest_severity}</p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-lg font-bold mb-3">Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Frames analyzed</p>
            <p className="text-2xl font-bold">{stats.total_frames_analyzed}</p>
          </div>
          <div className="rounded-lg border border-border p-4 border-l-4 border-l-red-500">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">High severity</p>
            <p className="text-2xl font-bold text-red-400">{stats.severity_counts.high}</p>
          </div>
          <div className="rounded-lg border border-border p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Medium severity</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.severity_counts.medium}</p>
          </div>
          <div className="rounded-lg border border-border p-4 border-l-4 border-l-green-500">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Low severity</p>
            <p className="text-2xl font-bold text-green-400">{stats.severity_counts.low}</p>
          </div>
        </div>
      </div>

      {/* Object detections */}
      {Object.keys(stats.object_class_counts).length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Object Detections</h2>
          <div className="rounded-lg border border-border p-4 flex flex-wrap gap-3">
            {Object.entries(stats.object_class_counts).map(([cls, n]) => (
              <div key={cls} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
                <span className="font-medium capitalize">{cls}</span>
                <span className="text-muted-foreground text-sm">×{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrative */}
      <div>
        <h2 className="text-lg font-bold mb-3">Narrative Summary</h2>
        <div className="rounded-lg border border-border p-6 bg-card whitespace-pre-wrap leading-relaxed">
          {Narrative}
        </div>
      </div>

      {/* Event log */}
      <div>
        <h2 className="text-lg font-bold mb-3">Event Log</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Severity</th>
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">Duration</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    No events detected.
                  </td>
                </tr>
              ) : events.map((ev) => (
                <tr key={ev.Sequence_number} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{ev.Sequence_number}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${severityBadge[ev.Severity]}`}>
                      {severityLabel[ev.Severity]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatTime(ev.Event_start)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ev.Duration}s</td>
                  <td className="px-4 py-3">{ev.Description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
