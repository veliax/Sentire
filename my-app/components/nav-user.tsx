"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken, clearToken } from "@/lib/auth"
import { BadgeCheck, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function NavUser() {
    const { isMobile } = useSidebar()
    const router = useRouter()
    const [user, setUser] = useState({ name: "", email: "" })

    useEffect(() => {
	const token = getToken()
	if (!token) {
	    router.push("/auth/login")
	    return
	}
	fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
	    headers: { Authorization: `Bearer ${token}` },
	})
	.then((res) => res.json())
	.then((data) => {
	    console.log("profile data:", data)
	    if (data.Name) setUser({ name: data.Name, email: data.Email })
	})
	.catch((err) => {
	    console.error("profile fetch failed:", err)
	    clearToken()
	    router.push("/auth/login")
	})
    }, [])

    function handleLogout() {
	clearToken()
	router.push("/auth/login")
    }

    return (
	<SidebarMenu>
	<SidebarMenuItem>
	<DropdownMenu>
	<DropdownMenuTrigger asChild>
	<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
	<Avatar className="size-8 rounded-lg">
	<AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
	{user.name?.charAt(0).toUpperCase() ?? "?"}
	</AvatarFallback>
	</Avatar>
	<div className="grid flex-1 text-left text-sm leading-tight">
	<span className="truncate font-semibold">{user.name}</span>
	<span className="truncate text-xs text-muted-foreground">{user.email}</span>
	</div>
	</SidebarMenuButton>
	</DropdownMenuTrigger>
	<DropdownMenuContent
	className="w-56"
	side={isMobile ? "bottom" : "right"}
	align="end"
	>
	<DropdownMenuLabel className="flex flex-col gap-0.5">
	<span className="font-semibold">{user.name}</span>
	<span className="text-xs font-normal text-muted-foreground">{user.email}</span>
	</DropdownMenuLabel>
	<DropdownMenuSeparator />
	<DropdownMenuItem>
	<BadgeCheck className="mr-2 size-4" />
	Profile
	</DropdownMenuItem>
	<DropdownMenuSeparator />
	<DropdownMenuItem onClick={handleLogout} className="text-red-500">
	<LogOut className="mr-2 size-4" />
	Log out
	</DropdownMenuItem>
	</DropdownMenuContent>
	</DropdownMenu>
	</SidebarMenuItem>
	</SidebarMenu>
    )
}
