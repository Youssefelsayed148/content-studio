"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, MessageCircle, Film, Sparkles, Search, Star, Play, ArrowUpDown, X, ExternalLink, RefreshCw, ImageIcon } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { generateGradient, getInitials } from "@/lib/gradients";
import { sanitizeForDivido } from "@/lib/sanitize-script";
import type { Video, Config } from "@/lib/types";

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function isThumbnailFresh(url: string): boolean {
  try {
    const match = url.match(/oe=([0-9A-Fa-f]+)/);
    if (!match) return false;
    const expiryTimestamp = parseInt(match[1], 16);
    // Must be valid hex and expire at least 1 hour in the future
    return !isNaN(expiryTimestamp) && expiryTimestamp * 1000 > Date.now() + 3600000;
  } catch {
    return false;
  }
}

type SortOption = "views" | "date-posted" | "date-added" | "starred";

export default function VideosPage() {
  return (
    <Suspense>
      <VideosContent />
    </Suspense>
  );
}

function VideosContent() {
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [filterConfig, setFilterConfig] = useState<string>("all");
  const [filterCreator, setFilterCreator] = useState<string>(searchParams.get("creator") || "all");
  const [sortBy, setSortBy] = useState<SortOption>("views");
  const [modalVideo, setModalVideo] = useState<Video | null>(null);
  const [modalSection, setModalSection] = useState<"analysis" | "concepts">("analysis");
  const [refreshingThumbnails, setRefreshingThumbnails] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos").then((r) => r.json()).then(setVideos);
    fetch("/api/configs").then((r) => r.json()).then(setConfigs);
  }, []);

  const uniqueCreators = [...new Set(videos.map((v) => v.creator))].sort();

  const filtered = videos
    .filter((v) => {
      if (filterConfig !== "all" && v.configName !== filterConfig) return false;
      if (filterCreator !== "all" && v.creator !== filterCreator) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "starred") {
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return b.views - a.views;
      }
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "date-posted") return (b.datePosted || "").localeCompare(a.datePosted || "");
      if (sortBy === "date-added") return (b.dateAdded || "").localeCompare(a.dateAdded || "");
      return 0;
    });

  const openModal = (video: Video, section: "analysis" | "concepts") => {
    setModalVideo(video);
    setModalSection(section);
  };

  const refreshThumbnails = async () => {
    setRefreshingThumbnails(true);
    setRefreshResult(null);
    try {
      const response = await fetch("/api/thumbnails/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await response.json();
      if (data.success) {
        setRefreshResult(`${data.refreshed} refreshed, ${data.failed} failed`);
        // Reload page after a delay to show new thumbnails
        if (data.refreshed > 0) {
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        setRefreshResult(data.message || "Refresh failed");
      }
    } catch (err) {
      setRefreshResult(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshingThumbnails(false);
    }
  };

  const toggleStar = async (id: string, currentStarred: boolean) => {
    const newStarred = !currentStarred;
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, starred: newStarred } : v))
    );
    await fetch("/api/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, starred: newStarred }),
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Video Ideas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All the viral video ideas AI made for you. Click any video to see why it works and get your own version.
        </p>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterConfig} onValueChange={setFilterConfig}>
          <SelectTrigger className="w-[220px] rounded-xl glass border-white/[0.08] h-10">
            <SelectValue placeholder="Filter by config" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Configs</SelectItem>
            {configs.map((c) => (
              <SelectItem key={c.id} value={c.configName}>{c.configName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCreator} onValueChange={setFilterCreator}>
          <SelectTrigger className="w-[200px] rounded-xl glass border-white/[0.08] h-10">
            <SelectValue placeholder="Filter by creator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Creators</SelectItem>
            {uniqueCreators.map((c) => (
              <SelectItem key={c} value={c}>@{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px] rounded-xl glass border-white/[0.08] h-10">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="date-posted">Date Posted</SelectItem>
            <SelectItem value="date-added">Date Added</SelectItem>
            <SelectItem value="starred">Starred First</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
          {filtered.length} videos
        </Badge>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-1.5 h-10 ml-auto"
          onClick={refreshThumbnails}
          disabled={refreshingThumbnails}
        >
          {refreshingThumbnails ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          Refresh Thumbnails
        </Button>

        {refreshResult && (
          <span className="text-xs text-muted-foreground">{refreshResult}</span>
        )}
      </div>

      {/* Video Grid — Instagram-style */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((video) => {
          const id = video.id || video.link;

          return (
            <div key={id} className="group">
              <div className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/[0.12]">
                {/* Thumbnail — clickable, 9:16 ratio */}
                <a
                  href={video.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[9/16] w-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40 overflow-hidden"
                >
                  {/* Always-visible placeholder with creator info */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center z-0 bg-gradient-to-br ${generateGradient(video.creator)}`}>
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-3 backdrop-blur-sm">
                      <span className="text-lg font-bold text-white/80">{getInitials(video.creator)}</span>
                    </div>
                    <span className="text-xs font-medium text-white/70">@{video.creator}</span>
                    <span className="text-[10px] text-white/40 mt-1">Tap to watch on Instagram</span>
                  </div>
                  {/* Try local cached thumbnail first, then fresh CDN URL */}
                  <img
                    src={`/thumbnails/${video.id}.jpg`}
                    alt={`@${video.creator}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 z-10"
                    onError={(e) => {
                      // Fallback to proxy if local not found and URL is fresh
                      if (video.thumbnail && isThumbnailFresh(video.thumbnail)) {
                        (e.currentTarget as HTMLImageElement).src = `/api/proxy-image?url=${encodeURIComponent(video.thumbnail)}`;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                  {/* Views overlay — Instagram style */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <Play className="h-4 w-4 text-white fill-white" />
                      <span className="text-[15px] font-bold text-white">
                        {formatViews(video.views)}
                      </span>
                    </div>
                  </div>
                </a>

                {/* Info bar */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">@{video.creator}</p>
                    <button
                      onClick={() => toggleStar(id, video.starred)}
                      className="shrink-0 ml-1.5 transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${video.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400/60"}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatViews(video.likes)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatViews(video.comments)}
                    </span>
                    <span className="ml-auto text-[10px]">{video.datePosted}</span>
                  </div>

                  <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06] text-muted-foreground">
                    {video.configName}
                  </Badge>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(video, "analysis")}
                      className="flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] text-muted-foreground hover:text-foreground"
                    >
                      <Search className="h-3 w-3" />
                      See Why It Works
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal(video, "concepts")}
                      className="flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] text-muted-foreground hover:text-foreground"
                    >
                      <Sparkles className="h-3 w-3" />
                      Get My Version
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Film className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 font-semibold">No videos yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to "Find Ideas" and run a search to get viral video ideas made for you.
          </p>
        </div>
      )}

      {/* Analysis / Concepts Modal */}
      <Dialog open={!!modalVideo} onOpenChange={(open) => { if (!open) setModalVideo(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden glass-strong rounded-2xl border-white/[0.08] p-0 gap-0">
          <DialogTitle className="sr-only">
            {modalSection === "analysis" ? "Video Analysis" : "New Concepts"}
          </DialogTitle>
          {modalVideo && (
            <>
              {/* Modal header */}
              <div className="flex items-center gap-4 p-5 border-b border-white/[0.06]">
                {/* Mini thumbnail */}
                <div className="relative h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                  {modalVideo.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/proxy-image?url=${encodeURIComponent(modalVideo.thumbnail)}`}
                      alt={`@${modalVideo.creator}`}
                      className="absolute inset-0 h-full w-full object-cover z-10"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">@{modalVideo.creator}</p>
                    <a
                      href={modalVideo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-purple-400 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Play className="h-3 w-3 fill-current" />
                      {formatViews(modalVideo.views)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatViews(modalVideo.likes)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatViews(modalVideo.comments)}
                    </span>
                  </div>
                </div>
                {/* Section toggle */}
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalSection("analysis")}
                    className={`rounded-xl text-xs h-8 gap-1.5 transition-all duration-200 ${
                      modalSection === "analysis"
                        ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Search className="h-3 w-3" />
                    Why It Works
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalSection("concepts")}
                    className={`rounded-xl text-xs h-8 gap-1.5 transition-all duration-200 ${
                      modalSection === "concepts"
                        ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    My Version
                  </Button>
                </div>
              </div>

              {/* Modal body — scrollable */}
              <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
                <MarkdownContent
                  content={modalSection === "analysis" ? modalVideo.analysis : sanitizeForDivido(modalVideo.newConcepts)}
                  variant={modalSection === "analysis" ? "analysis" : "concepts"}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
