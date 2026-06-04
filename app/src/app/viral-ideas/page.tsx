"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Film,
  Heart,
  MessageCircle,
  TrendingUp,
  Search,
  Filter,
  Sparkles,
  ArrowUpRight,
  Zap,
  Flame,
  BarChart3,
  Copy,
  Check,
  ExternalLink,
  X,
  MonitorPlay,
  RefreshCw,
  ImageIcon,
  FileText,
} from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { generateGradient, getInitials } from "@/lib/gradients";
import { sanitizeForDivido } from "@/lib/sanitize-script";
import type { ViralIdea, Creator } from "@/lib/types";

export default function ViralIdeasPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<ViralIdea | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("viral");
  const [filterCreator, setFilterCreator] = useState("all");
  const [filterTab, setFilterTab] = useState<"all" | "main" | "other">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<any>(null);
  const [scanningMain, setScanningMain] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [refreshingThumbnails, setRefreshingThumbnails] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [creatingScriptId, setCreatingScriptId] = useState<string | null>(null);

  useEffect(() => {
    loadIdeas();
    fetch("/api/creators").then((r) => r.json()).then(setCreators);
  }, []);

  const loadIdeas = () => {
    setLoading(true);
    fetch("/api/viral-ideas")
      .then((res) => res.json())
      .then((data) => {
        setIdeas(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const mainCompetitorUsernames = useMemo(() => {
    return new Set(creators.filter((c) => c.isMainCompetitor).map((c) => c.username));
  }, [creators]);

  const handleDetectViral = async () => {
    setDetecting(true);
    setDetectResult(null);
    try {
      const response = await fetch("/api/viral-ideas/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: 1.0 }),
      });
      const data = await response.json();
      setDetectResult(data);
      if (data.success) loadIdeas();
    } catch (err) {
      setDetectResult({ success: false, error: "Failed to detect viral videos" });
    } finally {
      setDetecting(false);
    }
  };

  const handleScanMainCompetitors = async () => {
    setScanningMain(true);
    setScanResult(null);
    try {
      const response = await fetch("/api/viral-ideas/scan-main-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      setScanResult(data);
      if (data.success) {
        loadIdeas();
        setFilterTab("main"); // Auto-switch to main competitors tab
      }
    } catch (err) {
      setScanResult({ success: false, error: "Failed to scan main competitors" });
    } finally {
      setScanningMain(false);
    }
  };

  const handleRefreshThumbnails = async () => {
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

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateScript = async (viralIdeaId: string) => {
    setCreatingScriptId(viralIdeaId);
    try {
      const response = await fetch("/api/viral-ideas/to-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viralIdeaId }),
      });
      const data = await response.json();
      if (data.success) {
        // Auto-navigate to Script Factory
        window.open("/scripts", "_blank");
      } else {
        alert(data.error || "Failed to create script");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create script");
    } finally {
      setCreatingScriptId(null);
    }
  };

  // Get unique creators for filter dropdown
  const uniqueCreators = useMemo(() => {
    const unique = new Set(ideas.map((i) => i.creator));
    return Array.from(unique).sort();
  }, [ideas]);

  // Filter and sort ideas
  const filteredIdeas = useMemo(() => {
    let result = [...ideas];
    // Tab filter: main competitors vs other
    if (filterTab === "main") {
      result = result.filter((i) => mainCompetitorUsernames.has(i.creator));
    } else if (filterTab === "other") {
      result = result.filter((i) => !mainCompetitorUsernames.has(i.creator));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.creator.toLowerCase().includes(q) ||
          i.contentPillar.toLowerCase().includes(q) ||
          i.originalScript.toLowerCase().includes(q)
      );
    }
    if (filterCreator !== "all") {
      result = result.filter((i) => i.creator === filterCreator);
    }
    switch (sortBy) {
      case "viral":
        result.sort((a, b) => b.viralMultiplier - a.viralMultiplier);
        break;
      case "views":
        result.sort((a, b) => b.views - a.views);
        break;
      case "recent":
        result.sort((a, b) => new Date(b.dateDetected).getTime() - new Date(a.dateDetected).getTime());
        break;
    }
    return result;
  }, [ideas, searchQuery, sortBy, filterCreator, filterTab, mainCompetitorUsernames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Viral Ideas</h1>
          <p className="text-gray-400 text-sm mt-1">
            Videos that outperformed their creator's average — click any card to see original vs adapted script
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleScanMainCompetitors}
            disabled={scanningMain}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white border border-red-400/30"
          >
            {scanningMain ? (
              <><Zap className="w-4 h-4 mr-2 animate-pulse" />Scanning Main...</>
            ) : (
              <><Flame className="w-4 h-4 mr-2" />Scan Main Competitors</>
            )}
          </Button>
          <Button
            onClick={handleDetectViral}
            disabled={detecting}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {detecting ? (
              <><Zap className="w-4 h-4 mr-2 animate-pulse" />Scanning...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Detect All Viral</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs gap-1.5 h-9 border-white/20 text-white hover:bg-white/10"
            onClick={handleRefreshThumbnails}
            disabled={refreshingThumbnails}
          >
            {refreshingThumbnails ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            Refresh Thumbnails
          </Button>
        </div>
      </div>

      {/* Refresh Result */}
      {refreshResult && (
        <div className={`p-3 rounded-xl border ${refreshResult.includes("failed") && !refreshResult.includes("0 failed") ? "bg-yellow-500/10 border-yellow-500/30" : "bg-blue-500/10 border-blue-500/30"}`}>
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm">{refreshResult}</span>
            <Button variant="ghost" size="sm" onClick={() => setRefreshResult(null)}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Detection Result */}
      {detectResult && (
        <div className={`p-4 rounded-xl border ${detectResult.success ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {detectResult.success ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
              <span className={detectResult.success ? "text-green-400" : "text-red-400"}>
                {detectResult.success ? `Found ${detectResult.newIdeas} new viral ideas` : detectResult.error}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDetectResult(null)}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Scan Main Competitors Result */}
      {scanResult && (
        <div className={`p-4 rounded-xl border ${scanResult.success ? "bg-orange-500/10 border-orange-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {scanResult.success ? <Flame className="w-5 h-5 text-orange-400" /> : <X className="w-5 h-5 text-red-400" />}
              <span className={scanResult.success ? "text-orange-400 font-medium" : "text-red-400"}>
                {scanResult.message || scanResult.error}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setScanResult(null)}><X className="w-4 h-4" /></Button>
          </div>
          {scanResult.scraped && scanResult.scraped.length > 0 && (
            <div className="text-xs text-gray-400 mt-1 space-y-0.5">
              {scanResult.scraped.map((s: any) => (
                <div key={s.username} className="flex items-center gap-2">
                  <span className="text-gray-300">@{s.username}</span>
                  {s.error ? (
                    <span className="text-red-400">{s.error}</span>
                  ) : (
                    <span>{s.videosFound} new videos</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {scanResult.fallbackUsed && (
            <p className="text-xs text-yellow-400 mt-2">API limits active — used fallback detection on existing videos</p>
          )}
        </div>
      )}

      {/* Main Competitor Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterTab === "all"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          All Viral
        </button>
        <button
          onClick={() => setFilterTab("main")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterTab === "main"
              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          Main Competitors
        </button>
        <button
          onClick={() => setFilterTab("other")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filterTab === "other"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          Other
        </button>
        <span className="ml-auto text-xs text-gray-500">
          {mainCompetitorUsernames.size > 0 ? `${mainCompetitorUsernames.size} main competitors set` : "No main competitors set"}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by creator, topic, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viral">Most Viral</SelectItem>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="recent">Recently Added</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCreator} onValueChange={setFilterCreator}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10">
            <SelectValue placeholder="All Creators" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Creators</SelectItem>
            {uniqueCreators.map((c) => (
              <SelectItem key={c} value={c}>@{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {ideas.length === 0 ? (
        <Card className="p-12 text-center border-white/10 bg-white/5">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
            <Flame className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No viral ideas yet</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Click "Detect Viral" to scan your existing video library for content that performed significantly above average.
          </p>
          <Button onClick={handleDetectViral} disabled={detecting} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Flame className="w-4 h-4 mr-2" />Detect Viral Videos
          </Button>
        </Card>
      ) : filteredIdeas.length === 0 ? (
        <Card className="p-12 text-center border-white/10 bg-white/5">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No matching ideas</h3>
          <p className="text-gray-400 text-sm">Try adjusting your filters</p>
        </Card>
      ) : (
        /* Video Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => (
            <ViralCard key={idea.id} idea={idea} onClick={() => setSelectedIdea(idea)} />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedIdea} onOpenChange={() => setSelectedIdea(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] bg-[#0a0a0f] border-white/10 p-0 overflow-hidden rounded-2xl">
          {selectedIdea && <ViralDetail idea={selectedIdea} onCopy={handleCopy} copiedField={copiedField} onCreateScript={handleCreateScript} creatingScriptId={creatingScriptId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isThumbnailFresh(url: string): boolean {
  try {
    const match = url.match(/oe=([0-9A-Fa-f]+)/);
    if (!match) return false;
    const expiryTimestamp = parseInt(match[1], 16);
    return !isNaN(expiryTimestamp) && expiryTimestamp * 1000 > Date.now() + 3600000;
  } catch {
    return false;
  }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function ViralCard({ idea, onClick }: { idea: ViralIdea; onClick: () => void }) {
  const engagementRate = idea.views > 0 ? (((idea.likes + idea.comments) / idea.views) * 100).toFixed(1) : "0";
  const localThumbnail = `/thumbnails/${idea.videoId}.jpg`;
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 group">
      {/* Horizontal card layout */}
      <div className="flex flex-row">
        {/* Thumbnail — clickable to open reel */}
        <a
          href={idea.link}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-28 sm:w-32 shrink-0 aspect-square bg-gradient-to-br from-purple-900/40 to-indigo-900/40 overflow-hidden cursor-pointer block"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Always-visible placeholder with creator initials */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center z-0 bg-gradient-to-br ${generateGradient(idea.creator)}`}>
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1 backdrop-blur-sm">
              <span className="text-sm font-bold text-white/80">{getInitials(idea.creator)}</span>
            </div>
            <span className="text-[9px] font-medium text-white/60">@{idea.creator}</span>
          </div>

          {/* Try local cached thumbnail first */}
          {!imgError && (
            <img
              src={localThumbnail}
              alt={idea.creator}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-10"
              onError={() => setImgError(true)}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20" />

          {/* Play Button with Views */}
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-30">
            <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <span className="text-white font-bold text-[10px]">
              {formatViews(idea.views)}
            </span>
          </div>

          {/* Viral Badge */}
          <div className="absolute top-1.5 right-1.5 z-30">
            <Badge className="bg-orange-500/90 text-white border-0 font-bold text-[9px] px-1 py-0">
              <TrendingUp className="w-2 h-2 mr-0.5" />
              {idea.viralMultiplier.toFixed(1)}x
            </Badge>
          </div>

          {/* External link indicator */}
          <div className="absolute top-1.5 left-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
              <ExternalLink className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </a>

        {/* Info — right side, clickable to expand */}
        <div
          className="flex-1 p-3 flex flex-col justify-between min-w-0 cursor-pointer"
          onClick={onClick}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-xs truncate">@{idea.creator}</span>
              <span className="text-[10px] text-gray-500 shrink-0 ml-2">{new Date(idea.dateDetected).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{formatViews(idea.likes)}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{formatViews(idea.comments)}</span>
              <span className="text-gray-500">{engagementRate}%</span>
            </div>

            {idea.contentPillar && (
              <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 px-1.5 py-0">
                {idea.contentPillar}
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 mt-2" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <MonitorPlay className="w-3 h-3 mr-1" />View Scripts
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ViralDetail({ idea, onCopy, copiedField, onCreateScript, creatingScriptId }: {
  idea: ViralIdea;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
  onCreateScript?: (id: string) => void;
  creatingScriptId?: string | null;
}) {
  const [activeTab, setActiveTab] = useState("compare");

  // Sanitize adapted content for Divido
  const cleanAdaptedScript = sanitizeForDivido(idea.adaptedScript);
  const cleanAdaptedHook = sanitizeForDivido(idea.adaptedHook);
  const cleanAdaptedBody = sanitizeForDivido(idea.adaptedBody);
  const cleanAdaptedCTA = sanitizeForDivido(idea.adaptedCTA);

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Compact Header */}
      <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base font-bold text-white">
              @{idea.creator}
            </DialogTitle>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              {idea.viralMultiplier.toFixed(1)}x
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href={idea.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20">
              <ExternalLink className="w-3 h-3" /> Open Reel
            </a>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {idea.views.toLocaleString()} views · {idea.likes.toLocaleString()} likes · {idea.contentPillar}
        </p>
      </DialogHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0 px-6 shrink-0 h-10">
          <TabsTrigger value="compare" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-400 px-4 py-2 text-xs">
            <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />Side by Side
          </TabsTrigger>
          <TabsTrigger value="original" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-400 px-4 py-2 text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />Original
          </TabsTrigger>
          <TabsTrigger value="adapted" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-400 px-4 py-2 text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />For Divido
          </TabsTrigger>
          <TabsTrigger value="bricks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-400 px-4 py-2 text-xs">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Analysis
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* SIDE BY SIDE TAB */}
          <TabsContent value="compare" className="p-5 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original Script Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Competitor's Original
                  </h3>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => onCopy(idea.originalScript, "orig-full")}>
                    {copiedField === "orig-full" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-3">
                  {idea.originalHook && (
                    <div>
                      <span className="text-[10px] font-semibold text-blue-400 uppercase">Hook</span>
                      <div className="text-xs text-gray-300 mt-1 leading-relaxed">
                        <MarkdownContent content={idea.originalHook} />
                      </div>
                    </div>
                  )}
                  {idea.originalBody && (
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">Body</span>
                      <div className="text-xs text-gray-300 mt-1 leading-relaxed max-h-48 overflow-y-auto">
                        <MarkdownContent content={idea.originalBody} />
                      </div>
                    </div>
                  )}
                  {idea.originalCTA && (
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">CTA</span>
                      <div className="text-xs text-gray-300 mt-1 leading-relaxed">
                        <MarkdownContent content={idea.originalCTA} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Adapted Script Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
                      Adapted for Divido
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => onCopy(cleanAdaptedScript, "adapt-full")}>
                    {copiedField === "adapt-full" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                
                <div className="bg-orange-500/[0.05] border border-orange-500/20 rounded-xl p-4 space-y-3">
                  {cleanAdaptedHook && (
                    <div>
                      <span className="text-[10px] font-semibold text-orange-400 uppercase">Hook</span>
                      <div className="text-xs text-gray-200 mt-1 leading-relaxed" dir="auto">
                        <MarkdownContent content={cleanAdaptedHook} />
                      </div>
                    </div>
                  )}
                  {cleanAdaptedBody && (
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">Body</span>
                      <div className="text-xs text-gray-200 mt-1 leading-relaxed max-h-48 overflow-y-auto" dir="auto">
                        <MarkdownContent content={cleanAdaptedBody} />
                      </div>
                    </div>
                  )}
                  {cleanAdaptedCTA && (
                    <div>
                      <span className="text-[10px] font-semibold text-green-400 uppercase">CTA</span>
                      <div className="text-xs text-gray-200 mt-1 leading-relaxed" dir="auto">
                        <MarkdownContent content={cleanAdaptedCTA} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* FULL ORIGINAL TAB */}
          <TabsContent value="original" className="p-5 m-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Full Original Script</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onCopy(idea.originalScript, "orig-all")}>
                  {copiedField === "orig-all" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}Copy
                </Button>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 max-h-[60vh] overflow-y-auto">
                <div className="text-xs text-gray-300 leading-relaxed">
                  <MarkdownContent content={idea.originalScript} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* FULL ADAPTED TAB */}
          <TabsContent value="adapted" className="p-5 m-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-orange-300">Full Script — Adapted for Divido</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onCopy(cleanAdaptedScript, "adapt-all")}>
                  {copiedField === "adapt-all" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}Copy
                </Button>
              </div>
              <div className="bg-orange-500/[0.05] border border-orange-500/20 rounded-xl p-5 max-h-[60vh] overflow-y-auto">
                <div className="text-xs text-gray-200 leading-relaxed" dir="auto">
                  <MarkdownContent content={cleanAdaptedScript} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 7 BRICKS TAB */}
          <TabsContent value="bricks" className="p-5 m-0">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-sm font-semibold text-white mb-3">Why This Went Viral</h3>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 max-h-[60vh] overflow-y-auto">
                <div className="text-xs text-gray-300 leading-relaxed">
                  <MarkdownContent content={idea.sevenBricksAnalysis} />
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Push to Script Factory */}
      <div className="shrink-0 border-t border-white/10 px-5 py-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Script available — push to production workflow
        </p>
        <button
          onClick={() => onCreateScript?.(idea.id)}
          disabled={creatingScriptId === idea.id}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 transition-all disabled:opacity-50"
        >
          {creatingScriptId === idea.id ? (
            <><RefreshCw className="h-3 w-3 animate-spin" />Creating...</>
          ) : (
            <><FileText className="h-3 w-3" />Push to Script Factory</>
          )}
        </button>
      </div>
    </div>
  );
}
