"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ShieldIcon } from "lucide-react"

export default function RegisterPage() {
    const router = useRouter()
    const [form, setForm] = useState({
	name: "",
	email: "",
	age: "",
	occupation: "",
	password: "",
	confirmPassword: "",
    })
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
	setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e: React.FormEvent) {
	e.preventDefault()
	setError("")

	if (form.password !== form.confirmPassword) {
	    setError("Passwords do not match")
	    return
	}

	setLoading(true)
	try {
	    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
		    name: form.name,
		    email: form.email,
		    age: form.age,
		    occupation: form.occupation,
		    password: form.password,
		}),
	    })

	    if (!res.ok) {
		const data = await res.json()
		setError(data.message || "Registration failed")
		return
	    }	    router.push("/auth/login")
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
	<h1 className="text-xl font-bold">Create a Sentire account</h1>
	<FieldDescription>
	Already have an account?{" "}
	<a href="/auth/login" className="underline underline-offset-4">
	Sign in
	</a>
	</FieldDescription>
	</div>

	{error && (
	    <p className="text-sm text-red-500 bg-red-950 border border-red-800 rounded px-3 py-2 text-center">
	    {error}
	    </p>
	)}

	<Field>
	<FieldLabel htmlFor="name">Full Name</FieldLabel>
	<Input
	id="name"
	name="name"
	type="text"
	placeholder="John Doe"
	value={form.name}
	onChange={handleChange}
	required
	/>
	</Field>

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
	<FieldLabel htmlFor="age">Age</FieldLabel>
	<Input
	id="age"
	name="age"
	type="number"
	placeholder="21"
	value={form.age}
	onChange={handleChange}
	required
	/>
	</Field>

	<Field>
	<FieldLabel htmlFor="occupation">Occupation</FieldLabel>
	<Input
	id="occupation"
	name="occupation"
	type="text"
	placeholder="Security Operator"
	value={form.occupation}
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
	<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
	<Input
	id="confirmPassword"
	name="confirmPassword"
	type="password"
	placeholder="••••••••"
	value={form.confirmPassword}
	onChange={handleChange}
	required
	/>
	</Field>

	<Field>
	<Button type="submit" className="w-full" disabled={loading}>
	{loading ? "Creating account..." : "Register"}
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
