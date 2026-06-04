"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownContent } from "@/components/markdown-content";
import type { Script, ViralIdea } from "@/lib/types";
import {
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  Zap,
  AlertTriangle,
  Send,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Play,
  Film,
  CalendarDays,
  Smartphone,
  Camera,
  Briefcase,
  Eye,
  TrendingUp,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; step: number }> = {
  generated:      { label: "Generated",      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",   icon: Sparkles,      step: 0 },
  lara_review:    { label: "Lara Review",    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",         icon: Eye,           step: 1 },
  lara_approved:  { label: "Lara Approved",  color: "bg-purple-500/10 text-purple-400 border-purple-500/20",    icon: ThumbsUp,      step: 2 },
  hana_review:    { label: "Hana Review",    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",    icon: Eye,           step: 3 },
  hana_approved:  { label: "Hana Approved",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2,  step: 4 },
  brief_generated: { label: "Brief Ready",   color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",    icon: FileText,      step: 5 },
  scheduled:      { label: "Scheduled",      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",          icon: CalendarDays,  step: 6 },
  filmed:         { label: "Filmed",         color: "bg-pink-500/10 text-pink-400 border-pink-500/20",           icon: Film,          step: 7 },
  posted:         { label: "Posted",         color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",  icon: Play,          step: 8 },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  tiktok:    <Smartphone className="h-3 w-3" />,
  instagram: <Camera className="h-3 w-3" />,
  youtube:   <Play className="h-3 w-3" />,
  linkedin:  <Briefcase className="h-3 w-3" />,
  x:         <MessageSquare className="h-3 w-3" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok:    "text-pink-400 bg-pink-500/10 border-pink-500/20",
  instagram: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  youtube:   "text-red-400 bg-red-500/10 border-red-500/20",
  linkedin:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
  x:         "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

const FILTER_TABS = [
  { value: "all", label: "All Scripts" },
  { value: "generated", label: "Generated" },
  { value: "lara_review", label: "Lara Review" },
  { value: "lara_approved", label: "Lara Approved" },
  { value: "hana_review", label: "Hana Review" },
  { value: "hana_approved", label: "Hana Approved" },
  { value: "brief_generated", label: "Brief Ready" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
];

const STATUS_ORDER = [
  "generated", "lara_review", "lara_approved", "hana_review",
  "hana_approved", "brief_generated", "scheduled", "filmed", "posted"
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [viralIdeas, setViralIdeas] = useState<ViralIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [detailViralIdea, setDetailViralIdea] = useState<ViralIdea | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("list");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scriptsRes, viralRes] = await Promise.all([
        fetch("/api/scripts").then((r) => r.json()),
        fetch("/api/viral-ideas").then((r) => r.json()),
      ]);
      setScripts(scriptsRes);
      setViralIdeas(viralRes);
    } catch (err) {
      console.error("Failed to load scripts:", err);
    } finally {
      setLoading(false);
    }
  };

  const findViralIdeaForScript = (script: Script): ViralIdea | undefined => {
    return viralIdeas.find((v) => v.id === script.sourceVideoId || v.videoId === script.sourceVideoId);
  };

  // Stats
  const stats = useMemo(() => {
    const inReview = scripts.filter((s) => s.status === "lara_review" || s.status === "hana_review").length;
    const approved = scripts.filter((s) => s.status === "lara_approved" || s.status === "hana_approved").length;
    const briefReady = scripts.filter((s) => s.status === "brief_generated").length;
    const scheduled = scripts.filter((s) => s.status === "scheduled").length;
    const posted = scripts.filter((s) => s.status === "posted").length;
    return { total: scripts.length, inReview, approved, briefReady, scheduled, posted };
  }, [scripts]);

  // Filter & sort
  const filteredScripts = useMemo(() => {
    let result = [...scripts];

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.contentPillar?.toLowerCase().includes(q) ||
          s.sourceCompetitor?.toLowerCase().includes(q) ||
          s.hook?.toLowerCase().includes(q) ||
          s.id?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
        break;
      case "status":
        result.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
        break;
    }

    return result;
  }, [scripts, statusFilter, searchQuery, sortBy]);

  // Pipeline view groups
  const pipelineGroups = useMemo(() => {
    const groups: Record<string, Script[]> = {};
    STATUS_ORDER.forEach((status) => {
      groups[status] = scripts.filter((s) => s.status === status);
    });
    return groups;
  }, [scripts]);

  // Actions
  const handleApprove = async (script: Script, role: "lara" | "hana") => {
    setActionLoading(true);
    const newStatus = role === "lara" ? "lara_approved" : "hana_approved";
    try {
      await fetch("/api/scripts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: script.id,
          status: newStatus,
          ...(role === "lara" ? { laraNotes: notes } : { hanaNotes: notes }),
        }),
      });
      setNotes("");
      loadData();
      if (selectedScript?.id === script.id) {
        setSelectedScript({ ...script, status: newStatus as Script["status"] });
      }
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (script: Script, role: "lara" | "hana") => {
    if (!notes.trim() && !confirm(`Reject without feedback notes?`)) return;
    setActionLoading(true);
    const newStatus = script.status === "hana_review" ? "lara_approved" : "generated";
    try {
      await fetch("/api/scripts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: script.id,
          status: newStatus,
          ...(role === "lara" ? { laraNotes: `REJECTED: ${notes}` } : { hanaNotes: `REJECTED: ${notes}` }),
        }),
      });
      setNotes("");
      loadData();
      setSelectedScript(null);
    } catch (err) {
      console.error("Rejection failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToReview = async (script: Script) => {
    setActionLoading(true);
    try {
      await fetch("/api/scripts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: script.id, status: "lara_review" }),
      });
      loadData();
      setSelectedScript(null);
    } catch (err) {
      console.error("Failed to send to review:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (script: Script) => {
    setSelectedScript(script);
    setNotes("");
    const viral = findViralIdeaForScript(script);
    setDetailViralIdea(viral || null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">Script Factory</p>
          <h1 className="text-3xl font-bold tracking-tight">Production Scripts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, approve, and manage scripts from viral ideas through production
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "pipeline" ? "list" : "pipeline")}
            className="rounded-xl text-xs gap-1.5 h-9 border-white/20"
          >
            {viewMode === "pipeline" ? "List View" : "Pipeline View"}
          </Button>
          <Link href="/viral-ideas">
            <Button className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5">
              <Sparkles className="h-4 w-4" />
              Find Viral Ideas
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Total Scripts", value: stats.total, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          { label: "In Review", value: stats.inReview, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Approved", value: stats.approved, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Briefs Ready", value: stats.briefReady, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Scheduled", value: stats.scheduled, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
          { label: "Posted", value: stats.posted, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl ${stat.bg} p-3 text-center`}>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === tab.value
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 text-[10px] opacity-60">
                ({scripts.filter((s) => s.status === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by title, pillar, competitor, or hook..."
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
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scripts.length === 0 ? (
        /* Empty State */
        <div className="glass rounded-2xl p-12 text-center border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No scripts yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Scripts are automatically created when you find viral ideas and generate content from them.
            Run the pipeline to get started.
          </p>
          <Link href="/run">
            <Button className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 border-0 gap-1.5">
              <Zap className="h-4 w-4" />
              Run Pipeline
            </Button>
          </Link>
        </div>
      ) : viewMode === "pipeline" ? (
        /* Pipeline View — Kanban Columns */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const groupScripts = pipelineGroups[status] || [];
            const Icon = config.icon;
            return (
              <div key={status} className="min-w-[220px] flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-6 h-6 rounded-lg ${config.color} flex items-center justify-center`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium text-foreground/80">{config.label}</span>
                  <Badge variant="secondary" className="rounded-md text-[10px] ml-auto bg-white/5 border-white/10">
                    {groupScripts.length}
                  </Badge>
                </div>
                <div className="space-y-2 flex-1">
                  {groupScripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => handleOpenDetail(script)}
                      className="w-full text-left glass rounded-xl p-3 transition-all duration-200 hover:bg-white/[0.05] cursor-pointer border border-white/[0.05]"
                    >
                      <p className="text-xs font-medium truncate">
                        {script.title || `Script #${script.id.slice(0, 6)}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(script.generatedAt)}
                        </span>
                        {script.platform && (
                          <span className={PLATFORM_COLORS[script.platform] || "text-muted-foreground"}>
                            <span className="inline-flex items-center gap-0.5 text-[10px] rounded-md px-1 py-0.5">
                              {PLATFORM_ICONS[script.platform]}
                              {script.platform}
                            </span>
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {groupScripts.length === 0 && (
                    <div className="text-center py-6 rounded-xl border border-dashed border-white/[0.04]">
                      <p className="text-[10px] text-muted-foreground/40">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : filteredScripts.length === 0 ? (
        /* No search results */
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matching scripts</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        /* List View — Script Cards */
        <div className="space-y-2">
          {filteredScripts.map((script) => {
            const statusConfig = STATUS_CONFIG[script.status] || STATUS_CONFIG.generated;
            const StatusIcon = statusConfig.icon;
            const viral = findViralIdeaForScript(script);
            return (
              <div
                key={script.id}
                onClick={() => handleOpenDetail(script)}
                className="glass rounded-2xl p-4 transition-all duration-200 hover:bg-white/[0.05] cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold truncate">
                        {script.title || `Script from @${script.sourceCompetitor}`}
                      </h3>
                      {script.platform && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] rounded-md px-1.5 py-0.5 ${PLATFORM_COLORS[script.platform] || "bg-white/5 text-muted-foreground"}`}>
                          {PLATFORM_ICONS[script.platform]}
                          {script.platform}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{formatDate(script.generatedAt)}</span>
                      {script.contentPillar && (
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {script.contentPillar}
                        </span>
                      )}
                      {script.sourceCompetitor && (
                        <span className="text-[10px] text-muted-foreground/60">
                          From @{script.sourceCompetitor}
                        </span>
                      )}
                    </div>

                    {script.hook && (
                      <p className="mt-2 text-xs text-foreground/60 line-clamp-1 italic">
                        &ldquo;{script.hook}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`rounded-lg ${statusConfig.color} px-2 py-1 flex items-center gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      <span className="text-[10px] font-medium">{statusConfig.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Script Detail Dialog */}
      <Dialog open={!!selectedScript} onOpenChange={(open) => { if (!open) { setSelectedScript(null); setDetailViralIdea(null); setNotes(""); }}}>
        <DialogContent className="max-w-5xl w-[92vw] max-h-[90vh] bg-[#0a0a0f] border-white/10 p-0 overflow-hidden rounded-2xl">
          {selectedScript && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Dialog Header */}
              <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-base font-bold">
                      {selectedScript.title || "Script Detail"}
                    </DialogTitle>
                    {(() => {
                    const StatusIcon = STATUS_CONFIG[selectedScript.status]?.icon;
                    return (
                      <Badge className={`rounded-md text-[10px] ${STATUS_CONFIG[selectedScript.status]?.color || ""}`}>
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {STATUS_CONFIG[selectedScript.status]?.label || selectedScript.status}
                      </Badge>
                    );
                  })()}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedScript.platform && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] rounded-md px-1.5 py-0.5 ${PLATFORM_COLORS[selectedScript.platform] || "bg-white/5 text-muted-foreground"}`}>
                        {PLATFORM_ICONS[selectedScript.platform]}
                        {selectedScript.platform}
                      </span>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => { setSelectedScript(null); setDetailViralIdea(null); setNotes(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {selectedScript.sourceCompetitor && (
                    <span className="text-xs text-muted-foreground">
                      Source: <span className="text-foreground/70">@{selectedScript.sourceCompetitor}</span>
                    </span>
                  )}
                  {selectedScript.contentPillar && (
                    <span className="text-xs text-muted-foreground">
                      Pillar: <span className="text-foreground/70">{selectedScript.contentPillar}</span>
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Generated: {formatDateTime(selectedScript.generatedAt)}
                  </span>
                </div>
              </DialogHeader>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT: Original Viral Analysis */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <Sparkles className="h-3 w-3" />
                        Viral Source Analysis
                      </h3>
                      {detailViralIdea ? (
                        <div className="space-y-3">
                          {detailViralIdea.viralMultiplier && (
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-orange-500/90 text-white border-0 text-[10px]">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {detailViralIdea.viralMultiplier.toFixed(1)}x viral
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {detailViralIdea.views.toLocaleString()} views
                              </span>
                            </div>
                          )}
                          {detailViralIdea.sevenBricksAnalysis && (
                            <MarkdownContent content={detailViralIdea.sevenBricksAnalysis} variant="analysis" />
                          )}
                          {detailViralIdea.originalScript && (
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                Original Script
                              </p>
                              <p className="text-xs text-foreground/70 whitespace-pre-wrap bg-white/[0.02] rounded-xl p-3 border border-white/[0.05]">
                                {detailViralIdea.originalScript}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Source viral idea not found in database.</p>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Adapted Script */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <FileText className="h-3 w-3" />
                        Adapted Script
                      </h3>
                      <div className="space-y-4 bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
                        {/* Hook */}
                        <div>
                          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">Hook</p>
                          <p className="text-sm font-medium text-foreground/90">{selectedScript.hook || "—"}</p>
                        </div>

                        {/* Body */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Body</p>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{selectedScript.body || "—"}</p>
                        </div>

                        {/* CTA */}
                        <div>
                          <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider mb-1">CTA</p>
                          <p className="text-sm font-medium text-emerald-300">{selectedScript.cta || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Approval History */}
                    {(selectedScript.laraApprovedAt || selectedScript.hanaApprovedAt || selectedScript.laraNotes || selectedScript.hanaNotes) && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Approval History
                        </h3>
                        <div className="space-y-2">
                          {selectedScript.laraApprovedAt && (
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-purple-500/5 rounded-xl p-3 border border-purple-500/10">
                              <ThumbsUp className="h-3 w-3 text-purple-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-purple-300 font-medium">Lara approved</p>
                                <p className="text-[11px]">{formatDateTime(selectedScript.laraApprovedAt)}</p>
                                {selectedScript.laraNotes && <p className="text-[11px] mt-1 italic">&ldquo;{selectedScript.laraNotes}&rdquo;</p>}
                              </div>
                            </div>
                          )}
                          {selectedScript.hanaApprovedAt && (
                            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-emerald-300 font-medium">Hana approved</p>
                                <p className="text-[11px]">{formatDateTime(selectedScript.hanaApprovedAt)}</p>
                                {selectedScript.hanaNotes && <p className="text-[11px] mt-1 italic">&ldquo;{selectedScript.hanaNotes}&rdquo;</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Actions Footer */}
              <div className="shrink-0 border-t border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  {/* Approval Actions */}
                  {selectedScript.status === "generated" && (
                    <Button
                      onClick={() => handleSendToReview(selectedScript)}
                      disabled={actionLoading}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-0 gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send to Lara Review
                    </Button>
                  )}

                  {selectedScript.status === "lara_review" && (
                    <>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Add feedback notes for Hana (optional)..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="text-xs rounded-xl bg-white/[0.03] border-white/[0.08] min-h-[36px] h-9"
                          rows={1}
                        />
                      </div>
                      <Button
                        onClick={() => handleReject(selectedScript, "lara")}
                        disabled={actionLoading}
                        variant="outline"
                        className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                        Revise
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedScript, "lara")}
                        disabled={actionLoading}
                        className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                        Approve → Hana
                      </Button>
                    </>
                  )}

                  {selectedScript.status === "lara_approved" && (
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-md text-[10px] bg-purple-500/10 border-purple-500/20 text-purple-300 py-1.5">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Lara Approved — Awaiting Hana
                      </Badge>
                    </div>
                  )}

                  {selectedScript.status === "hana_review" && (
                    <>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Add feedback notes (optional)..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="text-xs rounded-xl bg-white/[0.03] border-white/[0.08] min-h-[36px] h-9"
                          rows={1}
                        />
                      </div>
                      <Button
                        onClick={() => handleReject(selectedScript, "hana")}
                        disabled={actionLoading}
                        variant="outline"
                        className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                        Send Back
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedScript, "hana")}
                        disabled={actionLoading}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve → Brief
                      </Button>
                    </>
                  )}

                  {selectedScript.status === "hana_approved" && (
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-md text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-300 py-1.5">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generating Production Brief...
                      </Badge>
                    </div>
                  )}

                  {selectedScript.status === "brief_generated" && (
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-md text-[10px] bg-indigo-500/10 border-indigo-500/20 text-indigo-300 py-1.5">
                        <FileText className="h-3 w-3 mr-1" />
                        Production Brief Ready
                      </Badge>
                      <Link href="/briefs">
                        <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 border-white/20">
                          View Brief
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  )}

                  {(selectedScript.status === "scheduled" || selectedScript.status === "filmed" || selectedScript.status === "posted") && (() => {
                    const SIcon = STATUS_CONFIG[selectedScript.status]?.icon;
                    return (
                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-md text-[10px] ${STATUS_CONFIG[selectedScript.status]?.color || ""} py-1.5`}>
                        {SIcon && <SIcon className="h-3 w-3 mr-1" />}
                        {STATUS_CONFIG[selectedScript.status]?.label || selectedScript.status}
                      </Badge>
                      <Link href="/calendar">
                        <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 border-white/20">
                          View Calendar
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  )})()}

                  <div className="ml-auto flex items-center gap-2">
                    <Link href={`/briefs?scriptId=${selectedScript.id}`}>
                      <Button size="sm" variant="ghost" className="rounded-xl text-xs gap-1.5">
                        <FileText className="h-3 w-3" />
                        Brief
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
