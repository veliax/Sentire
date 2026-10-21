"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

type Video = {
  Id: number
  Name: string
  Location: string
  Duration: number
  Status: string
  Time_start: string
  File_path: string
  Processed_path: string | null
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-900 text-yellow-300 flex items-center gap-1 w-fit">
          <Clock className="size-3" /> Pending
        </Badge>
      )
    case "processing":
      return (
        <Badge className="bg-blue-900 text-blue-300 flex items-center gap-1 w-fit">
          <Loader2 className="size-3 animate-spin" /> Processing
        </Badge>
      )
    case "done":
      return (
        <Badge className="bg-green-900 text-green-300 flex items-center gap-1 w-fit">
          <CheckCircle2 className="size-3" /> Done
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-900 text-red-300 flex items-center gap-1 w-fit">
          <AlertCircle className="size-3" /> Error
        </Badge>
      )
    default:
      return <Badge>{status}</Badge>
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function LibraryPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [filtered, setFiltered] = useState<Video[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push("/auth/login"); return }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/video`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : []
        setVideos(arr)
        setFiltered(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      videos.filter(
        (v) =>
          v.Name?.toLowerCase().includes(q) ||
          v.Location?.toLowerCase().includes(q) ||
          v.Status?.toLowerCase().includes(q)
      )
    )
  }, [search, videos])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-sm text-muted-foreground">
            All uploaded video projects
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, location, status..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No videos found.{" "}
                  <a href="/dashboard/upload" className="text-primary underline underline-offset-4">
                    Upload one to get started
                  </a>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((video) => (
                <TableRow
                  key={video.Id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/dashboard/video/${video.Id}`)}
                >
                  <TableCell className="font-medium">{video.Name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {video.Location ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {video.Duration ? formatDuration(video.Duration) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={video.Status ?? "pending"} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {video.Time_start
                      ? new Date(video.Time_start).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
