"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Target,
  Settings2,
  FileText,
  Zap,
  Plug,
  Flame,
  Mic,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Home", href: "/", icon: LayoutDashboard },
  { title: "Viral Ideas", href: "/viral-ideas", icon: Flame },
  { title: "Scripts", href: "/scripts", icon: FileText },
  { title: "Content Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Competitors", href: "/creators", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings2 },
];

import {
  TikTokLogo,
  InstagramLogo,
  YouTubeLogo,
  LinkedInLogo,
  XLogo,
} from "@/components/platform-logos";

const platforms = [
  { id: "tiktok", Logo: TikTokLogo, href: "/dashboard/tiktok", color: "bg-[#111111] text-white border-white/10 hover:bg-[#1a1a1a]" },
  { id: "instagram", Logo: InstagramLogo, href: "/dashboard/instagram", color: "bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 text-pink-400 border-pink-500/20 hover:from-purple-500/15 hover:via-pink-500/15 hover:to-orange-500/15" },
  { id: "youtube", Logo: YouTubeLogo, href: "/dashboard/youtube", color: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15" },
  { id: "linkedin", Logo: LinkedInLogo, href: "/dashboard/linkedin", color: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/15" },
  { id: "x", Logo: XLogo, href: "/dashboard/x", color: "bg-white/5 text-white border-white/10 hover:bg-white/10" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((videos: { dateAdded: string }[]) => {
        if (videos.length > 0 && videos[0].dateAdded) {
          setLastRun(videos[0].dateAdded);
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname.startsWith("/dashboard");
    return pathname === href;
  };

  const isDashboard = pathname.startsWith("/dashboard");
  const activePlatform = pathname.split("/").pop() || "tiktok";

  return (
    <Sidebar
      variant="floating"
      className="[&_[data-slot=sidebar-container]]:p-2.5 [&_[data-slot=sidebar-inner]]:!rounded-[1.5rem] [&_[data-slot=sidebar-inner]]:!bg-transparent [&_[data-slot=sidebar-inner]]:!border-transparent [&_[data-slot=sidebar-inner]]:!shadow-none"
    >
      <div className="h-full bezel">
        <div className="bezel-inner h-full flex flex-col overflow-hidden bg-gradient-to-b from-purple-950/25 via-background/70 to-indigo-950/15">
          <SidebarHeader className="px-5 py-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 glow-sm">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight">Content Studio</h1>
                <p className="text-[11px] text-muted-foreground">One dashboard, all platforms</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 flex-1 overflow-y-auto">
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className="h-10 rounded-xl px-3 transition-all duration-300 pressable glass-hover relative"
                          style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4 transition-colors" />
                            <span className="text-[13px]">{item.title}</span>
                            {active && (
                              <div className="absolute inset-0 rounded-xl glow-sm pointer-events-none" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isDashboard && (
              <div className="mt-5 px-1 animate-fade-in">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5 font-medium">
                  Platforms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((platform) => {
                    const platformActive = activePlatform === platform.id;
                    const PLogo = platform.Logo;
                    return (
                      <Link
                        key={platform.id}
                        href={platform.href}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${platform.color} ${
                          platformActive ? "ring-1 ring-purple-500/40 scale-110" : "opacity-70 hover:opacity-100"
                        }`}
                        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                        title={platform.id}
                      >
                        <PLogo size={16} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="shrink-0 p-0">
            <div className="px-3 py-4 border-t border-white/[0.06] space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5 font-medium">
                  Workflow
                </p>
                <div className="flex flex-col gap-1.5">
                  <Link
                    href="/strategy"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200 glass-hover pressable"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                  >
                    <Target className="h-3.5 w-3.5 text-purple-400" />
                    Content Strategy
                  </Link>
                  <Link
                    href="/brand-voice"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200 glass-hover pressable"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                  >
                    <Mic className="h-3.5 w-3.5 text-indigo-400" />
                    Brand Voice
                  </Link>
                  <Link
                    href="/scripts"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200 glass-hover pressable"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Script Factory
                  </Link>
                  <Link
                    href="/briefs"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200 glass-hover pressable"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    Production Briefs
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5 font-medium">
                  Pipeline
                </p>
                <div className="flex flex-col gap-1.5">
                  <Link
                    href="/run"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200 glass-hover pressable bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 hover:border-purple-500/30 group"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                    title="Run pipeline to scrape competitors and generate viral ideas"
                  >
                    <Zap className="h-3.5 w-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col">
                      <span>Run Pipeline</span>
                      <span className="text-[9px] text-muted-foreground font-normal">Scrape + Analyze + Detect</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {lastRun && (
              <div className="px-5 py-3 border-t border-white/[0.06]">
                <p className="text-[11px] text-muted-foreground">
                  Last run:{" "}
                  <span className="text-foreground/70">{lastRun}</span>
                </p>
              </div>
            )}
          </SidebarFooter>
        </div>
      </div>
    </Sidebar>
  );
}
