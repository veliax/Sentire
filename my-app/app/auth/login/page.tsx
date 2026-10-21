"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ShieldIcon } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: "", password: "" })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
	const token = document.cookie.includes("token=")
	if (token) router.push("/dashboard")
    }, [])

function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
}

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
	    method: "POST",
	    headers: { "Content-Type": "application/json" },
	    body: JSON.stringify(form),
	})

	if (!res.ok) {
	    const data = await res.json()
	    setError(data.message || "Invalid email or password")
	    return
	}

	const data = await res.json()
	document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}` // 7 days
	router.push("/dashboard")
    } catch {
	setError("Something went wrong. Please try again.")
    } finally {
	setLoading(false)
    }
}

return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className={cn("flex flex-col gap-6 w-full max-w-sm")}>
    <form onSubmit={handleSubmit}>
    <FieldGroup>
    <div className="flex flex-col items-center gap-2 text-center">
    <a href="#" className="flex flex-col items-center gap-2 font-medium">
    <div className="flex size-8 items-center justify-center rounded-md">
    <ShieldIcon className="size-6" />
    </div>
    <span className="sr-only">Sentire</span>
    </a>
    <h1 className="text-xl font-bold">Welcome back to Sentire</h1>
    <FieldDescription>
    Don&apos;t have an account?{" "}
    <a href="/auth/register" className="underline underline-offset-4">
    Sign up
    </a>
    </FieldDescription>
    </div>

    {error && (
	<p className="text-sm text-red-500 bg-red-950 border border-red-800 rounded px-3 py-2 text-center">
	{error}
	</p>
    )}

    <Field>
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input
    id="email"
    name="email"
    type="email"
    placeholder="you@example.com"
    value={form.email}
    onChange={handleChange}
    required
    />
    </Field>

    <Field>
    <FieldLabel htmlFor="password">Password</FieldLabel>
    <Input
    id="password"
    name="password"
    type="password"
    placeholder="••••••••"
    value={form.password}
    onChange={handleChange}
    required
    />
    </Field>

    <Field>
    <Button type="submit" className="w-full" disabled={loading}>
    {loading ? "Signing in..." : "Sign in"}
    </Button>
    </Field>
    </FieldGroup>
    </form>

    <FieldDescription className="px-6 text-center">
    By clicking continue, you agree to our{" "}
    <a href="#" className="underline underline-offset-4">Terms of Service</a>{" "}
    and{" "}
    <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
	</FieldDescription>
    </div>
    </div>
)
}
