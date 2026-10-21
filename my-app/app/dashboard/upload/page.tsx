"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UploadCloud, FileVideo, X, CheckCircle2 } from "lucide-react"

type UploadResult = {
  video_id: number
  name: string
  file_path: string
  duration: number
  time_start: string
  time_end: string
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<UploadResult | null>(null)
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState(0)

  function handleFile(f: File) {
    if (!f.type.startsWith("video/mp4")) {
      setError("Only MP4 files are supported")
      return
    }
    setError("")
    setResult(null)
    setFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleUpload() {
    if (!file) return
    const token = getToken()
    if (!token) { router.push("/auth/login"); return }

    setUploading(true)
    setError("")
    setProgress(0)

    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("video", file)

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      setUploading(false)
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        setResult(data)
        setFile(null)
        setProgress(0)
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          setError(data.error || "Upload failed")
        } catch {
          setError("Upload failed")
        }
      }
    })

    xhr.addEventListener("error", () => {
      setUploading(false)
      setError("Something went wrong. Please try again.")
    })

    xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/api/video/upload`)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.send(formData)
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold">Upload</h1>
          <p className="text-sm text-muted-foreground">
            Upload video footage for processing and analysis
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
          <CardDescription>
            Upload video footage for processing and analysis. Only MP4 files are supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {result ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-950 border border-green-800">
                <CheckCircle2 className="size-5 text-green-400 shrink-0" />
                <div>
                  <p className="font-semibold text-green-400">Upload successful!</p>
                  <p className="text-xs text-green-600">
                    Your video is queued for processing
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video ID</span>
                  <span className="font-mono">{result.video_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{result.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{formatDuration(result.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded at</span>
                  <span>{new Date(result.time_start).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>
                  Upload another
                </Button>
                <Button className="flex-1" onClick={() => router.push("/dashboard/library")}>
                  View Library
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
                  ${drag ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}
                  ${uploading ? "pointer-events-none opacity-50" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                <UploadCloud className={`size-10 ${drag ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your video here, or{" "}
                    <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4 only
                  </p>
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept="video/mp4"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                />
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <FileVideo className="size-5 text-primary shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  {!uploading && (
                    <button onClick={() => setFile(null)}>
                      <X className="size-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              )}

              {uploading && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 bg-red-950 border border-red-800 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? `Uploading... ${progress}%` : "Upload Video"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
