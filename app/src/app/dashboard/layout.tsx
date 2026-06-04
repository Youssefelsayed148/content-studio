"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const platforms = [
  { id: "tiktok", label: "TikTok", color: "text-white" },
  { id: "instagram", label: "Instagram", color: "text-pink-400" },
  { id: "youtube", label: "YouTube", color: "text-red-400" },
  { id: "linkedin", label: "LinkedIn", color: "text-blue-400" },
  { id: "x", label: "X / Twitter", color: "text-white" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activePlatform = pathname.split("/").pop() || "tiktok";

  return (
    <div className="space-y-6">
      {/* Platform Switcher */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch between platforms. Each has its own content format, script style, and workflow.
        </p>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {platforms.map((platform) => {
          const isActive = activePlatform === platform.id;
          return (
            <Link
              key={platform.id}
              href={`/dashboard/${platform.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              {platform.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
