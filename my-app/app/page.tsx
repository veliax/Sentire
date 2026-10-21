"use client"

import { useEffect, useRef } from "react"
import { Shield, Eye, AlertTriangle, BarChart2, ArrowRight, Play } from "lucide-react"

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    const bubbles = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 280 + 80,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      hue: Math.random() * 60 + 200,
      opacity: Math.random() * 0.12 + 0.04,
    }))

    let animFrame: number

    function draw() {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const b of bubbles) {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius)
        grad.addColorStop(0, `hsla(${b.hue}, 90%, 65%, ${b.opacity})`)
        grad.addColorStop(1, `hsla(${b.hue}, 90%, 65%, 0)`)

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        b.x += b.dx
        b.y += b.dy
        b.hue += 0.05

        if (b.x < -b.radius) b.x = canvas.width + b.radius
        if (b.x > canvas.width + b.radius) b.x = -b.radius
        if (b.y < -b.radius) b.y = canvas.height + b.radius
        if (b.y > canvas.height + b.radius) b.y = -b.radius
      }

      animFrame = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      <div className="relative z-10">

        {/* navbar */}
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Shield className="size-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Sentire</span>
          </div>

          <div className="hidden md:flex gap-8 text-sm text-white/60">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About</a>
          </div>

          <div className="flex gap-3">
            <a href="/auth/login" className="text-white/60">Sign in</a>
            <a href="/auth/register" className="bg-white text-black px-4 py-2 rounded-lg">
              Get started
            </a>
          </div>
        </nav>

        {/* hero */}
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-32 max-w-5xl mx-auto">

          <h1 className="text-6xl font-bold mb-6">
            Surveillance that{" "}
            <span className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)"
              }}
            >
              understands
            </span>
          </h1>

          <p className="text-white/50 mb-10 max-w-2xl">
            Sentire uses visual AI models to analyze footage in real time.
          </p>

          <div className="flex gap-4">
            <a className="bg-white text-black px-6 py-3 rounded-xl flex items-center gap-2">
              Start analyzing <ArrowRight className="size-4" />
            </a>
            <a className="text-white/60 flex items-center gap-2">
              <Play className="size-4" /> See how it works
            </a>
          </div>

          {/* dashboard */}
          <div className="mt-20 w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden">

            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="size-3 rounded-full bg-red-500/60" />
              <div className="size-3 rounded-full bg-yellow-500/60" />
              <div className="size-3 rounded-full bg-green-500/60" />
              <span className="text-xs text-white/30 ml-2">sentire — dashboard</span>
            </div>

            <div className="grid grid-cols-3 gap-px bg-white/5 p-px">
              {["Shoplifting detected", "Person detected", "High activity zone"].map((label, i) => (
                <div
                  key={i}
                  className="bg-[#0d0d0d] aspect-video flex flex-col items-center justify-center text-center p-3 relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background:
                        i === 0
                          ? "linear-gradient(135deg, #ef4444, transparent)"
                          : i === 1
                          ? "linear-gradient(135deg, #22c55e, transparent)"
                          : "linear-gradient(135deg, #f59e0b, transparent)",
                    }}
                  />

                  <div className={`text-xs px-2 py-0.5 rounded-full mb-2 ${
                    i === 0
                      ? "bg-red-500/20 text-red-300"
                      : i === 1
                      ? "bg-green-500/20 text-green-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}>
                    {i === 0 ? "High Threat" : i === 1 ? "Low Threat" : "Medium Threat"}
                  </div>

                  <p className="text-xs text-white/60">{label}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* features */}
        <section id="features" className="px-6 py-24 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-white/50">From raw footage to actionable intelligence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: Eye, title: "Object Detection", desc: "YOLOv8 detects objects in real time." },
              { icon: AlertTriangle, title: "Threat Classification", desc: "Classifies events by severity." },
              { icon: Shield, title: "AI Analysis", desc: "Context-aware scene interpretation." },
              { icon: BarChart2, title: "Insights", desc: "Reports and analytics over time." },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-white/10 rounded-2xl bg-white/5">
                <f.icon className="size-5 mb-3" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section id="how-it-works" className="px-6 py-24 max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How it works</h2>

          <div className="space-y-4">
            {[
              { step: "01", title: "Upload footage", desc: "Upload videos to dashboard." },
              { step: "02", title: "AI analysis", desc: "Detection + classification pipeline." },
              { step: "03", title: "Review insights", desc: "View key events and alerts." },
            ].map((s, i) => (
              <div key={i} className="flex gap-8 p-8 border border-white/10 rounded-2xl">
                <span className="text-3xl text-white/20">{s.step}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-white/50">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FIXED (no blur, no card effect) */}
        <section className="px-6 py-24 max-w-3xl mx-auto text-center">

          <div className="relative p-16 overflow-hidden">

            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, #3b82f640, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">
                start protecting what matters
              </h2>

              <p className="text-white/50 mb-8">
                upload your first video and see analysis in minutes.
              </p>

              <a
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl"
              >
                get started free <ArrowRight className="size-4" />
              </a>
            </div>

          </div>
        </section>

        {/* footer */}
        <footer className="px-8 py-8 max-w-7xl mx-auto border-t border-white/10 flex justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-white/40" />
            <span className="text-sm text-white/40">Sentire</span>
          </div>
          <p className="text-sm text-white/30">
            Built for modern surveillance operators
          </p>
        </footer>

      </div>
    </div>
  )
}
