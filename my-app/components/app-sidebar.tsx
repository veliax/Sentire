"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getToken } from "@/lib/auth"
import {
  LayoutDashboard,
  Upload,
  Library,
  BarChart2,
  FileText,
  Shield,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"

const mainNav = [
  { title: "Overview",   url: "/dashboard",            icon: LayoutDashboard },
  { title: "Upload",     url: "/dashboard/upload",     icon: Upload },
  { title: "Library",    url: "/dashboard/library",    icon: Library },
  { title: "Reports",    url: "/dashboard/reports",    icon: FileText },
  { title: "Statistics", url: "/dashboard/statistics", icon: BarChart2 },
]

const adminNav = [
  { title: "Admin", url: "/dashboard/admin", icon: Shield },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.role === "admin" || data.role === "rootAdmin") {
          setIsAdmin(true)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                  <Shield className="size-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-base">Sentire</span>
                  <span className="text-xs text-muted-foreground">Surveillance Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                  >
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNav.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <a href={item.url}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
