"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BrandSwitcher } from "@/components/brand-switcher";
import { Bell, ChevronRight } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/videos": "Your Video Ideas",
  "/run": "Find Viral Ideas",
  "/creators": "Your Competitors",
  "/configs": "Your Brand Settings",
  "/connections": "Social Connections",
};

const eyebrowMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/tiktok": "Dashboard",
  "/dashboard/instagram": "Dashboard",
  "/dashboard/youtube": "Dashboard",
  "/dashboard/linkedin": "Dashboard",
  "/dashboard/x": "Dashboard",
  "/calendar": "Planning",
  "/strategy": "Planning",
  "/videos": "Library",
  "/creators": "Research",
  "/configs": "Settings",
  "/connections": "Integrations",
  "/run": "Pipeline",
};

const breadcrumbMap: Record<string, { label: string; href?: string }[]> = {
  "/dashboard/tiktok": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "TikTok" },
  ],
  "/dashboard/instagram": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Instagram" },
  ],
  "/dashboard/youtube": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "YouTube" },
  ],
  "/dashboard/linkedin": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "LinkedIn" },
  ],
  "/dashboard/x": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "X" },
  ],
};

export function TopBar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Virality System";
  const eyebrow = eyebrowMap[pathname] || "Workspace";
  const breadcrumbs = breadcrumbMap[pathname];
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((videos: { dateAdded: string }[]) => {
        if (videos.length > 0 && videos[0].dateAdded) {
          setLastUpdated(videos[0].dateAdded);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="sticky top-4 z-10 mx-4 mb-4">
      <div className="glass-strong rounded-2xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />

          <div className="h-4 w-px bg-white/10" />

          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300 w-fit">
              {eyebrow}
            </span>

            <div className="flex items-center gap-2">
              {breadcrumbs ? (
                <div className="flex items-center gap-1.5">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={crumb.label} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          i === breadcrumbs.length - 1
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {crumb.label}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium">{title}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BrandSwitcher />

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {lastUpdated && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Updated {lastUpdated}
            </div>
          )}

          <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors glass-hover pressable">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-purple-500 ring-2 ring-background" />
          </button>
        </div>
      </div>
    </div>
  );
}
