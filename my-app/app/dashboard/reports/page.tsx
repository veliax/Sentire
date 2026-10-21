"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, FileText } from "lucide-react"

type ReportRow = {
  Id: number
  Video_id: number
  Generated_at: string
  Name: string
  Location: string | null
  Duration: number | null
  Time_start: string | null
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [filtered, setFiltered] = useState<ReportRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push("/auth/login"); return }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : []
        setReports(arr)
        setFiltered(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      reports.filter(
        (r) =>
          r.Name?.toLowerCase().includes(q) ||
          r.Location?.toLowerCase().includes(q)
      )
    )
  }, [search, reports])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generated incident reports across all your videos
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by video name or location..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Video</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Recorded</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead></TableHead>
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
                  No reports yet.{" "}
                  <a href="/dashboard" className="text-primary underline underline-offset-4">
                    Open a processed video to generate one
                  </a>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.Id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/dashboard/reports/${r.Video_id}`)}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    {r.Name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.Location ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.Time_start ? new Date(r.Time_start).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.Generated_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-primary underline underline-offset-4">
                      View →
                    </span>
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
