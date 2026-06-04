"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Eye, Film, UserCheck, RefreshCw, Loader2, ExternalLink, TrendingUp, Activity, Trophy, Hash } from "lucide-react";
import Link from "next/link";
import type { Creator } from "@/lib/types";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function generateSparkline(seed: string, count = 12): number[] {
  const bars: number[] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  for (let i = 0; i < count; i++) {
    const h = Math.abs(Math.sin(hash + i * 1.3) * 100);
    bars.push(15 + (h % 85));
  }
  return bars;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Creator | null>(null);
  const [form, setForm] = useState({ username: "", category: "" });
  const [filterCategory, setFilterCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadCreators = () => {
    fetch("/api/creators").then((r) => r.json()).then(setCreators);
  };

  useEffect(() => { loadCreators(); }, []);

  const uniqueCategories = useMemo(() => [...new Set(creators.map((c) => c.category))].sort(), [creators]);

  const filtered = filterCategory === "all"
    ? creators
    : creators.filter((c) => c.category === filterCategory);

  const intelligence = useMemo(() => {
    if (creators.length === 0) return null;
    const totalCompetitors = creators.length;
    const totalVideos = creators.reduce((acc, c) => acc + (c.reelsCount30d || 0), 0);
    const mostActive = creators.reduce((max, c) => (c.reelsCount30d > max.reelsCount30d ? c : max), creators[0]);
    const totalFollowers = creators.reduce((acc, c) => acc + (c.followers || 0), 0);
    return { totalCompetitors, totalVideos, mostActive, totalFollowers };
  }, [creators]);

  const openNew = () => {
    setEditing(null);
    setForm({ username: "", category: "" });
    setDialogOpen(true);
  };

  const openEdit = (creator: Creator) => {
    setEditing(creator);
    setForm({ username: creator.username, category: creator.category });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await fetch("/api/creators", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
      } else {
        await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      loadCreators();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this creator?")) return;
    await fetch(`/api/creators?id=${id}`, { method: "DELETE" });
    loadCreators();
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/creators/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress" && data.status === "scraping") {
                const c = creators.find((cr) => cr.username === data.username);
                if (c) setRefreshingId(c.id);
              } else if (data.type === "progress" && data.status === "done") {
                loadCreators();
              } else if (data.type === "complete") {
                setRefreshingId(null);
              }
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      setRefreshing(false);
      setRefreshingId(null);
      loadCreators();
    }
  };

  const handleRefreshOne = async (id: string) => {
    setRefreshingId(id);
    try {
      const response = await fetch("/api/creators/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      loadCreators();
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight">Your Competitors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add Instagram accounts you want to learn from. We will watch what they post and find their best stuff.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="rounded-xl glass border-white/[0.08] gap-1.5 text-xs pressable"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Update All Stats
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
                <Plus className="h-4 w-4" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong rounded-2xl border-white/[0.08]">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Competitor" : "Add Competitor"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Instagram Username</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. marcel.remus"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Group Name</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. dubai-real-estate"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Put competitors in groups so you can search them together.</p>
                </div>
                {!editing && (
                  <p className="text-[11px] text-muted-foreground">
                    We will automatically grab their profile picture, follower count, and recent activity.
                  </p>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.username || !form.category}
                  className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 pressable"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editing ? "Saving..." : "Adding..."}
                    </>
                  ) : (
                    editing ? "Save Changes" : "Add Competitor"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Competitor Intelligence Summary */}
      {intelligence && (
        <div className="bezel">
          <div className="bezel-inner p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">Competitor Intelligence</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 text-center">
                <Users className="mx-auto h-3.5 w-3.5 text-purple-400 mb-1" />
                <p className="text-lg font-bold">{intelligence.totalCompetitors}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Competitors</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 text-center">
                <Film className="mx-auto h-3.5 w-3.5 text-indigo-400 mb-1" />
                <p className="text-lg font-bold">{intelligence.totalVideos}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Videos Analyzed</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 text-center">
                <Trophy className="mx-auto h-3.5 w-3.5 text-yellow-400 mb-1" />
                <p className="text-sm font-bold truncate px-1">@{intelligence.mostActive.username}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Most Active</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 text-center">
                <TrendingUp className="mx-auto h-3.5 w-3.5 text-emerald-400 mb-1" />
                <p className="text-lg font-bold">{formatNumber(intelligence.totalFollowers)}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Reach</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] pressable ${
            filterCategory === "all"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06]"
          }`}
        >
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            All
          </span>
        </button>
        {uniqueCategories.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] pressable ${
              filterCategory === c
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06]"
            }`}
          >
            {c}
          </button>
        ))}
        <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08] ml-auto">
          {filtered.length} creators
        </Badge>
      </div>

      {/* Creator Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {filtered.map((creator) => {
          const isRefreshing = refreshingId === creator.id;
          const sparkline = generateSparkline(creator.username);
          return (
            <div
              key={creator.id}
              className={`bezel glass-hover group transition-all duration-300 ${isRefreshing ? "animate-pulse" : ""}`}
            >
              <div className="bezel-inner p-5">
                {/* Header: avatar + name + actions */}
                <div className="flex items-start justify-between">
                  <a
                    href={`https://www.instagram.com/${creator.username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    {/* Profile pic */}
                    <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/[0.1]">
                      <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-muted-foreground/50">
                        {creator.username.charAt(0).toUpperCase()}
                      </div>
                      {creator.profilePicUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(creator.profilePicUrl)}`}
                          alt={`@${creator.username}`}
                          className="absolute inset-0 h-full w-full object-cover z-10"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold hover:text-purple-400 transition-colors">@{creator.username}</p>
                      <Badge variant="secondary" className="mt-0.5 rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
                        {creator.category}
                      </Badge>
                    </div>
                  </a>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefreshOne(creator.id)}
                      disabled={isRefreshing}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable"
                    >
                      {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(creator)}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(creator.id)}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-red-400 pressable"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                {(creator.followers > 0 || creator.lastScrapedAt) ? (
                  <>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 text-center">
                        <UserCheck className="mx-auto h-3.5 w-3.5 text-blue-400 mb-1" />
                        <p className="text-sm font-bold">{formatNumber(creator.followers)}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Followers</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 text-center">
                        <Film className="mx-auto h-3.5 w-3.5 text-purple-400 mb-1" />
                        <p className="text-sm font-bold">{creator.reelsCount30d}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Reels/30d</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 text-center">
                        <Eye className="mx-auto h-3.5 w-3.5 text-emerald-400 mb-1" />
                        <p className="text-sm font-bold">{formatNumber(creator.avgViews30d)}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Avg Views</p>
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="mt-3">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Activity Trend</p>
                      <div className="flex items-end gap-[3px] h-10">
                        {sparkline.map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-purple-500/30 hover:bg-purple-400/50 transition-colors"
                            style={{ height: `${h}%` }}
                            title={`Activity ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 text-center">
                    <p className="text-[11px] text-muted-foreground">
                      No stats yet <RefreshCw className="inline h-3 w-3" /> to scrape
                    </p>
                  </div>
                )}

                {/* Footer: last scraped + view videos */}
                <div className="mt-3 flex items-center justify-between">
                  {creator.lastScrapedAt ? (
                    <p className="text-[10px] text-muted-foreground/60">
                      Scraped {new Date(creator.lastScrapedAt).toLocaleDateString()}
                    </p>
                  ) : <span />}
                  <Link
                    href={`/videos?creator=${creator.username}`}
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    See Their Videos <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full bezel">
            <div className="bezel-inner p-12 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-400/60" />
              </div>
              <h3 className="text-sm font-semibold">No competitors yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Add Instagram accounts you want to learn from. We will analyze their best content and generate ideas for your brand.
              </p>
              <Button onClick={openNew} className="mt-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
                <Plus className="h-4 w-4" />
                Add Competitor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
