"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <Card className="w-[380px] bg-zinc-900 text-white border border-zinc-800">
        <CardContent className="p-8 space-y-4">

          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
              
            </div>
            <h2 className="text-xl font-semibold">Welcome Back</h2>
            <p className="text-sm text-zinc-400">
              Sign in to Sentre System
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                className="bg-zinc-800 border-zinc-700"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                className="bg-zinc-800 border-zinc-700"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              Login
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
