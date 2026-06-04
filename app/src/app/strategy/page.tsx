"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Target, Megaphone, Calendar, Users, Sparkles, Smartphone, Camera, Play, Briefcase, MessageSquare, TrendingUp, Activity, Zap, Gauge } from "lucide-react";
import type { Strategy, Config } from "@/lib/types";

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { value: "instagram", label: "Instagram Reels", icon: <Camera className="h-3.5 w-3.5" /> },
  { value: "youtube", label: "YouTube", icon: <Play className="h-3.5 w-3.5" /> },
  { value: "linkedin", label: "LinkedIn", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { value: "x", label: "X / Twitter", icon: <MessageSquare className="h-3.5 w-3.5" /> },
];

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  instagram: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  youtube: "text-red-400 bg-red-500/10 border-red-500/20",
  linkedin: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  x: "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CircularProgress({ value, max, color, size = 44 }: { value: number; max: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashoffset = circumference * (1 - progress);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className={color}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.23, 1, 0.32, 1)" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold">{value}</span>
    </div>
  );
}

function PillarWheel({ pillars }: { pillars: string[] }) {
  if (!pillars.length) return (
    <div className="h-24 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
      <p className="text-[10px] text-muted-foreground">No pillars defined</p>
    </div>
  );
  const colors = ["oklch(0.55 0.19 265)", "oklch(0.55 0.18 180)", "oklch(0.6 0.18 330)", "oklch(0.65 0.16 85)", "oklch(0.55 0.2 30)", "oklch(0.5 0.15 200)"];
  const sliceSize = 360 / pillars.length;
  const gradient = pillars.map((_, i) => {
    const start = i * sliceSize;
    const end = (i + 1) * sliceSize;
    return `${colors[i % colors.length]} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        className="shrink-0 w-20 h-20 rounded-full border-2 border-white/10"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="flex flex-wrap gap-1.5">
        {pillars.map((pillar, i) => (
          <div key={pillar} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{pillar}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function computeHealthScore(strategy: Strategy): number {
  let score = 0;
  if (strategy.strategyName) score += 10;
  if (strategy.configName) score += 10;
  if ((strategy.platforms || []).length > 0) score += 15;
  if ((strategy.contentPillars || []).length > 0) score += 15;
  if (strategy.brandVoice) score += 15;
  if (strategy.monthlyTheme) score += 10;
  if (strategy.targetAudience) score += 10;
  if (strategy.postingTimes && Object.keys(strategy.postingTimes).length > 0) score += 10;
  if (strategy.optimalDays && Object.keys(strategy.optimalDays).length > 0) score += 5;
  return score;
}

export default function StrategyPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);

  const emptyForm = {
    strategyName: "",
    configName: "",
    platforms: [] as string[],
    contentPillars: "" as string,
    cadenceReels: 7,
    cadenceCarousels: 2,
    cadenceLinkedIn: 2,
    cadenceYouTube: 1,
    cadenceX: 5,
    brandVoice: "",
    monthlyTheme: "",
    targetAudience: "",
    reelTimes: "09:00, 13:00, 19:00",
    linkedinTimes: "08:00, 17:00",
    youtubeTimes: "18:00",
    xTimes: "08:00, 12:00, 18:00",
    reelDays: "Mon, Wed, Fri, Sat, Sun",
    linkedinDays: "Tue, Thu",
    youtubeDays: "Sat",
    xDays: "Mon, Tue, Wed, Thu, Fri",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/strategies").then((r) => r.json()).then(setStrategies);
    fetch("/api/configs").then((r) => r.json()).then(setConfigs);
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (strategy: Strategy) => {
    setEditing(strategy);
    setForm({
      strategyName: strategy.strategyName,
      configName: strategy.configName,
      platforms: strategy.platforms || [],
      contentPillars: (strategy.contentPillars || []).join(", "),
      cadenceReels: strategy.cadenceReels || 7,
      cadenceCarousels: strategy.cadenceCarousels || 2,
      cadenceLinkedIn: strategy.cadenceLinkedIn || 2,
      cadenceYouTube: strategy.cadenceYouTube || 1,
      cadenceX: strategy.cadenceX || 5,
      brandVoice: strategy.brandVoice || "",
      monthlyTheme: strategy.monthlyTheme || "",
      targetAudience: strategy.targetAudience || "",
      reelTimes: (strategy.postingTimes?.reels || []).join(", "),
      linkedinTimes: (strategy.postingTimes?.linkedin || []).join(", "),
      youtubeTimes: (strategy.postingTimes?.youtube || []).join(", "),
      xTimes: (strategy.postingTimes?.x || []).join(", "),
      reelDays: (strategy.optimalDays?.reels || []).join(", "),
      linkedinDays: (strategy.optimalDays?.linkedin || []).join(", "),
      youtubeDays: (strategy.optimalDays?.youtube || []).join(", "),
      xDays: (strategy.optimalDays?.x || []).join(", "),
    });
    setDialogOpen(true);
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const parseList = (str: string) =>
    str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    const payload = {
      strategyName: form.strategyName,
      configName: form.configName,
      platforms: form.platforms,
      contentPillars: parseList(form.contentPillars),
      cadenceReels: form.cadenceReels,
      cadenceCarousels: form.cadenceCarousels,
      cadenceLinkedIn: form.cadenceLinkedIn,
      cadenceYouTube: form.cadenceYouTube,
      brandVoice: form.brandVoice,
      monthlyTheme: form.monthlyTheme,
      targetAudience: form.targetAudience,
      postingTimes: {
        reels: parseList(form.reelTimes),
        linkedin: parseList(form.linkedinTimes),
        youtube: parseList(form.youtubeTimes),
        x: parseList(form.xTimes),
      },
      optimalDays: {
        reels: parseList(form.reelDays),
        linkedin: parseList(form.linkedinDays),
        youtube: parseList(form.youtubeDays),
        x: parseList(form.xDays),
      },
    };

    if (editing) {
      await fetch("/api/strategies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      });
    } else {
      await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setDialogOpen(false);
    fetch("/api/strategies").then((r) => r.json()).then(setStrategies);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this strategy?")) return;
    await fetch(`/api/strategies?id=${id}`, { method: "DELETE" });
    fetch("/api/strategies").then((r) => r.json()).then(setStrategies);
  };

  const healthLevel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-emerald-400", bar: "bg-emerald-400" };
    if (score >= 60) return { label: "Good", color: "text-yellow-400", bar: "bg-yellow-400" };
    if (score >= 40) return { label: "Fair", color: "text-orange-400", bar: "bg-orange-400" };
    return { label: "Needs Work", color: "text-red-400", bar: "bg-red-400" };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">Strategy</p>
          <h1 className="text-3xl font-bold tracking-tight">Content Strategy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define your brand voice, content pillars, and posting cadence. AI uses this to generate and schedule content.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
              <Plus className="h-4 w-4" />
              New Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Strategy" : "New Content Strategy"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Strategy Name</Label>
                <Input value={form.strategyName} onChange={(e) => setForm({ ...form, strategyName: e.target.value })} placeholder="e.g. Divido 90-Day GTM" className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Linked Brand Profile</Label>
                <Select value={form.configName} onValueChange={(v) => setForm({ ...form, configName: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                    <SelectValue placeholder="Select a brand profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((c) => (
                      <SelectItem key={c.id} value={c.configName}>{c.configName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Platforms</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] pressable ${
                        form.platforms.includes(p.value)
                          ? `${PLATFORM_COLORS[p.value]} shadow-sm`
                          : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06]"
                      }`}
                    >
                      {p.icon}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Content Pillars (comma separated)</Label>
                <Textarea value={form.contentPillars} onChange={(e) => setForm({ ...form, contentPillars: e.target.value })} placeholder="e.g. Bank Certificate Trap, Exit Mechanics, First Investor Journey" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Reels / Week</Label>
                  <Input type="number" value={form.cadenceReels} onChange={(e) => setForm({ ...form, cadenceReels: Number(e.target.value) })} className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Carousels / Week</Label>
                  <Input type="number" value={form.cadenceCarousels} onChange={(e) => setForm({ ...form, cadenceCarousels: Number(e.target.value) })} className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">LinkedIn / Week</Label>
                  <Input type="number" value={form.cadenceLinkedIn} onChange={(e) => setForm({ ...form, cadenceLinkedIn: Number(e.target.value) })} className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">YouTube / Week</Label>
                  <Input type="number" value={form.cadenceYouTube} onChange={(e) => setForm({ ...form, cadenceYouTube: Number(e.target.value) })} className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">X / Week</Label>
                  <Input type="number" value={form.cadenceX} onChange={(e) => setForm({ ...form, cadenceX: Number(e.target.value) })} className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Brand Voice</Label>
                <Textarea value={form.brandVoice} onChange={(e) => setForm({ ...form, brandVoice: e.target.value })} placeholder="e.g. Egyptian Arabic, transparent founder-led, no hype, data-driven, calm authority" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Monthly Theme</Label>
                  <Input value={form.monthlyTheme} onChange={(e) => setForm({ ...form, monthlyTheme: e.target.value })} placeholder="e.g. Category Creation" className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Target Audience</Label>
                  <Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="e.g. Young Egyptians 25-38" className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Posting Times</p>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Reel Times (comma separated)</Label>
                    <Input value={form.reelTimes} onChange={(e) => setForm({ ...form, reelTimes: e.target.value })} placeholder="09:00, 13:00, 19:00" className="mt-1 rounded-xl glass border-white/[0.08] h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">LinkedIn Times</Label>
                    <Input value={form.linkedinTimes} onChange={(e) => setForm({ ...form, linkedinTimes: e.target.value })} placeholder="08:00, 17:00" className="mt-1 rounded-xl glass border-white/[0.08] h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">YouTube Times</Label>
                    <Input value={form.youtubeTimes} onChange={(e) => setForm({ ...form, youtubeTimes: e.target.value })} placeholder="18:00" className="mt-1 rounded-xl glass border-white/[0.08] h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">X Times</Label>
                    <Input value={form.xTimes} onChange={(e) => setForm({ ...form, xTimes: e.target.value })} placeholder="08:00, 12:00, 18:00" className="mt-1 rounded-xl glass border-white/[0.08] h-9 text-xs" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={!form.strategyName || !form.configName} className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 pressable">
                {editing ? "Save Strategy" : "Create Strategy"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Strategy Cards - Bento Grid */}
      <div className="space-y-4 stagger-children">
        {strategies.map((strategy) => {
          const score = computeHealthScore(strategy);
          const health = healthLevel(score);
          return (
            <div key={strategy.id} className="bezel glass-hover">
              <div className="bezel-inner p-5">
                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Top Left: Main Info */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
                          <Target className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{strategy.strategyName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{strategy.configName}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(strategy.platforms || []).map((p) => {
                              const platformDef = PLATFORM_OPTIONS.find((po) => po.value === p);
                              return (
                                <Badge key={p} variant="secondary" className={`rounded-md text-[10px] capitalize gap-1 ${PLATFORM_COLORS[p] || "bg-white/[0.05] border-white/[0.06]"}`}>
                                  {platformDef?.icon}
                                  {p}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(strategy)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(strategy.id)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-400 pressable">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Content Pillar Wheel */}
                    <div>
                      <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Content Pillars
                      </p>
                      <PillarWheel pillars={strategy.contentPillars || []} />
                    </div>
                  </div>

                  {/* Top Right: Health Score */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Gauge className="h-3.5 w-3.5 text-purple-400" />
                      <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">Health Score</p>
                    </div>
                    <div className="text-3xl font-bold gradient-text">{score}</div>
                    <p className={`text-[11px] font-medium mt-1 ${health.color}`}>{health.label}</p>
                    <div className="w-full h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden">
                      <div className={`h-full rounded-full ${health.bar} transition-all duration-700`} style={{ width: `${score}%` }} />
                    </div>
                  </div>

                  {/* Bottom: Cadence Metrics with Circular Progress */}
                  <div className="md:col-span-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Weekly Cadence</p>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: "Reels", value: strategy.cadenceReels, max: 14, icon: <Megaphone className="h-3 w-3" />, color: "text-purple-400" },
                        { label: "Carousels", value: strategy.cadenceCarousels, max: 7, icon: <Calendar className="h-3 w-3" />, color: "text-indigo-400" },
                        { label: "LinkedIn", value: strategy.cadenceLinkedIn, max: 7, icon: <Users className="h-3 w-3" />, color: "text-emerald-400" },
                        { label: "YouTube", value: strategy.cadenceYouTube, max: 7, icon: <Sparkles className="h-3 w-3" />, color: "text-yellow-400" },
                        { label: "X", value: strategy.cadenceX, max: 14, icon: <TrendingUp className="h-3 w-3" />, color: "text-blue-400" },
                      ].map((metric) => (
                        <div key={metric.label} className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 flex flex-col items-center gap-2">
                          <CircularProgress value={metric.value} max={metric.max} color={metric.color} />
                          <div className="flex items-center gap-1">
                            <span className={metric.color}>{metric.icon}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{metric.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {strategy.brandVoice && (
                  <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                    <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">Brand Voice</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{strategy.brandVoice}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {strategies.length === 0 && (
          <div className="bezel">
            <div className="bezel-inner p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-purple-400/60" />
              </div>
              <h3 className="text-sm font-semibold">No strategy yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Create one so AI knows how to plan content for you. Define pillars, cadence, and brand voice.
              </p>
              <Button onClick={openNew} className="mt-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
                <Plus className="h-4 w-4" />
                Create Strategy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
