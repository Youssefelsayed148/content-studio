"use client";

import { useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  Send,
  Eye,
  Heart,
  BarChart3,
  Target,
  Calendar,
  TrendingUp,
  Award,
} from "lucide-react";
import type { Script } from "@/lib/types";

interface PlatformAnalyticsProps {
  scripts: Script[];
  platform: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function getMonthKey(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="h-24 w-24 rounded-full border-2 border-dashed border-white/[0.08] flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">No data</span>
      </div>
    );
  }

  let currentDeg = 0;
  const segments = data.map((d) => {
    const deg = (d.value / total) * 360;
    const start = currentDeg;
    currentDeg += deg;
    return { ...d, start, end: currentDeg };
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(", ");

  return (
    <div className="relative h-24 w-24 shrink-0">
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(${gradient})`,
        }}
      />
      <div className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <span className="text-[10px] font-bold">{total}</span>
      </div>
    </div>
  );
}

export function PlatformAnalytics({ scripts, platform }: PlatformAnalyticsProps) {
  const analytics = useMemo(() => {
    const platformScripts = scripts.filter((s) => s.platform === platform);

    const totalGenerated = platformScripts.length;
    const approved = platformScripts.filter(
      (s) => s.status === "hana_approved" || s.status === "brief_generated" || s.status === "scheduled" || s.status === "filmed" || s.status === "posted"
    ).length;
    const posted = platformScripts.filter((s) => s.status === "posted").length;

    const postedScripts = platformScripts.filter((s) => s.status === "posted");
    const totalViews = postedScripts.reduce((sum, s) => sum + (s.performanceViews || 0), 0);
    const totalLikes = postedScripts.reduce((sum, s) => sum + (s.performanceLikes || 0), 0);
    const avgViews = postedScripts.length > 0 ? Math.round(totalViews / postedScripts.length) : 0;
    const avgLikes = postedScripts.length > 0 ? Math.round(totalLikes / postedScripts.length) : 0;

    // Content pillar breakdown
    const pillarCounts = new Map<string, number>();
    platformScripts.forEach((s) => {
      const pillar = s.contentPillar || "Uncategorized";
      pillarCounts.set(pillar, (pillarCounts.get(pillar) || 0) + 1);
    });
    const pillarData = Array.from(pillarCounts.entries())
      .map(([label, value], i) => ({
        label,
        value,
        color: [
          "oklch(0.62 0.2 265)",
          "oklch(0.55 0.18 180)",
          "oklch(0.6 0.18 330)",
          "oklch(0.65 0.16 85)",
          "oklch(0.55 0.2 30)",
          "oklch(0.5 0.15 220)",
        ][i % 6],
      }))
      .sort((a, b) => b.value - a.value);

    const bestPillar = pillarData[0]?.label || "—";

    // Posting consistency score
    const monthCounts = new Map<string, number>();
    postedScripts.forEach((s) => {
      const key = getMonthKey(s.postedAt);
      if (key) monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    });

    let consistencyScore = 0;
    if (monthCounts.size > 0) {
      const counts = Array.from(monthCounts.values());
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance);
      // Lower stdDev relative to avg = higher consistency
      const cv = avg > 0 ? stdDev / avg : 0;
      consistencyScore = Math.min(10, Math.round((1 - Math.min(cv, 1)) * 10));
    }

    // Monthly audit summary (last 3 months with data)
    const auditMonths = Array.from(monthCounts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 3);

    return {
      totalGenerated,
      approved,
      posted,
      avgViews,
      avgLikes,
      pillarData,
      bestPillar,
      consistencyScore,
      auditMonths,
      totalViews,
      totalLikes,
    };
  }, [scripts, platform]);

  const statCards = [
    {
      label: "Total Generated",
      value: analytics.totalGenerated,
      icon: FileText,
      color: "text-blue-400",
      bg: "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
    },
    {
      label: "Approved",
      value: analytics.approved,
      icon: CheckCircle2,
      color: "text-purple-400",
      bg: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
    },
    {
      label: "Posted",
      value: analytics.posted,
      icon: Send,
      color: "text-emerald-400",
      bg: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
    },
    {
      label: "Avg Views",
      value: analytics.avgViews > 0 ? formatNumber(analytics.avgViews) : "—",
      icon: Eye,
      color: "text-cyan-400",
      bg: "from-cyan-500/10 to-blue-500/10 border-cyan-500/20",
    },
    {
      label: "Avg Likes",
      value: analytics.avgLikes > 0 ? formatNumber(analytics.avgLikes) : "—",
      icon: Heart,
      color: "text-rose-400",
      bg: "from-rose-500/10 to-orange-500/10 border-rose-500/20",
    },
    {
      label: "Consistency",
      value: analytics.consistencyScore > 0 ? `${analytics.consistencyScore}/10` : "—",
      icon: Calendar,
      color: "text-amber-400",
      bg: "from-amber-500/10 to-yellow-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bezel pressable transition-all duration-200"
            style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            <div className="bezel-inner p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${stat.bg}`}
                >
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Pillar Breakdown */}
      <div className="bezel">
        <div className="bezel-inner p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold">Content Pillar Breakdown</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <PieChart data={analytics.pillarData} />

            <div className="flex-1 min-w-0 space-y-2">
              {analytics.pillarData.slice(0, 6).map((pillar) => (
                <div key={pillar.label} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: pillar.color }}
                  />
                  <span className="text-[11px] text-muted-foreground truncate flex-1">
                    {pillar.label}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">{pillar.value}</span>
                </div>
              ))}
              {analytics.pillarData.length === 0 && (
                <p className="text-xs text-muted-foreground">No content pillars yet.</p>
              )}
            </div>
          </div>

          {analytics.bestPillar !== "—" && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
              <Target className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-muted-foreground">
                Best performing pillar:{" "}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400">
                {analytics.bestPillar}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Audit Summary */}
      <div className="bezel">
        <div className="bezel-inner p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold">Monthly Content Audit</span>
          </div>

          {analytics.auditMonths.length > 0 ? (
            <div className="space-y-3">
              {analytics.auditMonths.map(([month, count]) => {
                const [year, mon] = month.split("-");
                const monthName = new Date(`${year}-${mon}-01`).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                });
                return (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-[11px] font-medium w-20 shrink-0">{monthName}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        style={{
                          width: `${Math.min(100, (count / Math.max(...analytics.auditMonths.map((m) => m[1]))) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <Award className="mx-auto h-8 w-8 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">
                No posted content yet. Start posting to build your audit history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
