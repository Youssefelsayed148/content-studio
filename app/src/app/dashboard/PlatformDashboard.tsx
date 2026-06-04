"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ChevronRight,
  Pencil,
  Play,
  Zap,
  Loader2 as Loader2Icon,
  Film,
  AlertTriangle,
  Flame,
  Terminal,
  ArrowRight,
  Trophy,
  BarChart3,
  Hash,
  Settings,
} from "lucide-react";
import { usePipeline } from "@/context/pipeline-context";
import type { Script, Config, Video, Strategy } from "@/lib/types";
import { IdeaScoreCard, calculateOverallScore, getScoreColor, useScriptScores } from "@/components/idea-score-card";
import { GreatestHits } from "@/components/greatest-hits";
import { TrendingTopics } from "@/components/trending-topics";
import { PlatformAnalytics } from "@/components/platform-analytics";

interface PlatformDashboardProps {
  platform: "tiktok" | "instagram" | "youtube" | "linkedin" | "x";
}

const PLATFORM_CONFIG = {
  tiktok: {
    name: "TikTok",
    icon: Film,
    scriptLabel: "Video Script",
    hookLabel: "Hook (0-3 sec)",
    bodyLabel: "Script Body",
    ctaLabel: "Call to Action",
    formatHint: "60-second vertical video. Hook in first 3 seconds.",
    maxChars: 1500,
  },
  instagram: {
    name: "Instagram",
    icon: Film,
    scriptLabel: "Reel Script",
    hookLabel: "Hook (0-3 sec)",
    bodyLabel: "Script Body",
    ctaLabel: "Call to Action",
    formatHint: "15-90 second Reel. Visual-first, trend-aware, strong hook.",
    maxChars: 1500,
  },
  youtube: {
    name: "YouTube",
    icon: Film,
    scriptLabel: "Video Script",
    hookLabel: "Hook (0-15 sec)",
    bodyLabel: "Script Body",
    ctaLabel: "Call to Action",
    formatHint: "Shorts or long-form. Value-dense, searchable, retention-optimised.",
    maxChars: 3000,
  },
  linkedin: {
    name: "LinkedIn",
    icon: FileText,
    scriptLabel: "Post Draft",
    hookLabel: "Opening Line",
    bodyLabel: "Post Body",
    ctaLabel: "Closing / CTA",
    formatHint: "Long-form text post. 300-800 words. Professional but personal tone.",
    maxChars: 3000,
  },
  x: {
    name: "X",
    icon: FileText,
    scriptLabel: "Thread / Tweet",
    hookLabel: "First Tweet (Hook)",
    bodyLabel: "Thread Body",
    ctaLabel: "Final Tweet / CTA",
    formatHint: "Thread format. Each tweet max 280 chars. Punchy, contrarian, data-driven.",
    maxChars: 2000,
  },
};

const STATUS_STAGES = [
  { key: "generated", label: "Generated", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  { key: "lara_review", label: "Editor Review", color: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20" },
  { key: "lara_approved", label: "Editor Approved", color: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  { key: "hana_review", label: "Final Review", color: "bg-pink-500/10 text-pink-300 border-pink-500/20" },
  { key: "hana_approved", label: "Approved", color: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  { key: "brief_generated", label: "Brief Ready", color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  { key: "scheduled", label: "Scheduled", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  { key: "filmed", label: "Filmed", color: "bg-teal-500/10 text-teal-300 border-teal-500/20" },
  { key: "posted", label: "Posted", color: "bg-green-500/10 text-green-300 border-green-500/20" },
];

export default function PlatformDashboard({ platform }: PlatformDashboardProps) {
  const config = PLATFORM_CONFIG[platform];
  const [scripts, setScripts] = useState<Script[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeTab, setActiveTab] = useState<"scripts" | "ideas" | "greatest-hits" | "analytics">("scripts");
  const [scriptFilter, setScriptFilter] = useState("generated");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedConfigName, setSelectedConfigName] = useState<string>("");

  const { getScore, setScore } = useScriptScores();

  // Pipeline state
  const { running, progress, runPipeline } = usePipeline();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [platform]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progress?.log.length]);

  const loadData = () => {
    fetch("/api/scripts")
      .then((r) => r.json())
      .then((allScripts: Script[]) => {
        setScripts(allScripts.filter((s) => s.platform === platform));
      });
    fetch("/api/videos")
      .then((r) => r.json())
      .then((allVideos: Video[]) => setVideos(allVideos));
    fetch("/api/configs")
      .then((r) => r.json())
      .then((allConfigs: Config[]) => {
        setConfigs(allConfigs);
        const matching = allConfigs.find((c) =>
          c.configName.toLowerCase().includes(platform)
        );
        if (matching) setSelectedConfigName(matching.configName);
        else if (allConfigs.length > 0) setSelectedConfigName(allConfigs[0].configName);
      });
    fetch("/api/strategies")
      .then((r) => r.json())
      .then(setStrategies);
  };

  const getConfigStrategyName = (configName: string) => {
    const strategy = strategies.find((s) => s.configName === configName);
    return strategy?.strategyName || null;
  };

  const filteredScripts = scripts.filter((s) => {
    const statusMatch = s.status === scriptFilter;
    if (!topicFilter) return statusMatch;
    const topicLower = topicFilter.toLowerCase();
    const textMatch =
      s.title.toLowerCase().includes(topicLower) ||
      s.hook.toLowerCase().includes(topicLower) ||
      s.body.toLowerCase().includes(topicLower) ||
      s.cta.toLowerCase().includes(topicLower) ||
      s.contentPillar.toLowerCase().includes(topicLower);
    return statusMatch && textMatch;
  });

  const getStatusBadge = (status: string) => {
    const stage = STATUS_STAGES.find((s) => s.key === status);
    return stage ? (
      <Badge className={`rounded-md text-[10px] border ${stage.color}`}>
        {stage.label}
      </Badge>
    ) : null;
  };

  const advanceStatus = async (script: Script, newStatus: Script["status"], notesValue: string) => {
    setLoading(true);
    const payload: Record<string, string | number> = { id: script.id, status: newStatus };
    if (newStatus === "lara_approved") payload.laraNotes = notesValue;
    if (newStatus === "hana_approved") payload.hanaNotes = notesValue;

    await fetch("/api/scripts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    setSelectedScript(null);
    setNotes("");
    loadData();
  };

  const saveEdit = async (script: Script) => {
    setLoading(true);
    await fetch("/api/scripts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: script.id,
        title: script.title,
        hook: script.hook,
        body: script.body,
        cta: script.cta,
        platform: script.platform,
        contentPillar: script.contentPillar,
      }),
    });
    setLoading(false);
    setEditMode(false);
    loadData();
  };

  const handleRunPipeline = () => {
    if (!selectedConfigName) return;
    runPipeline({ configName: selectedConfigName, maxVideos: 20, topK: 3, nDays: 30 });
  };

  const handleTopicClick = (topic: string) => {
    setTopicFilter(topic);
    setActiveTab("scripts");
    const hasMatch = scripts.some(
      (s) =>
        s.status === scriptFilter &&
        (s.title.toLowerCase().includes(topic.toLowerCase()) ||
          s.hook.toLowerCase().includes(topic.toLowerCase()) ||
          s.body.toLowerCase().includes(topic.toLowerCase()) ||
          s.cta.toLowerCase().includes(topic.toLowerCase()) ||
          s.contentPillar.toLowerCase().includes(topic.toLowerCase()))
    );
    if (!hasMatch) {
      for (const stage of STATUS_STAGES) {
        const anyMatch = scripts.some(
          (s) =>
            s.status === stage.key &&
            (s.title.toLowerCase().includes(topic.toLowerCase()) ||
              s.hook.toLowerCase().includes(topic.toLowerCase()) ||
              s.body.toLowerCase().includes(topic.toLowerCase()) ||
              s.cta.toLowerCase().includes(topic.toLowerCase()) ||
              s.contentPillar.toLowerCase().includes(topic.toLowerCase()))
        );
        if (anyMatch) {
          setScriptFilter(stage.key);
          break;
        }
      }
    }
  };

  const totalProgress = progress
    ? progress.phase === "scraping"
      ? progress.creatorsTotal > 0 ? (progress.creatorsScraped / progress.creatorsTotal) * 40 : 0
      : progress.videosTotal > 0 ? 40 + (progress.videosAnalyzed / progress.videosTotal) * 60 : 40
    : 0;

  return (
    <div className="space-y-6">
      {/* Platform Info Banner */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
          <config.icon className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{config.name} Content</h2>
          <p className="text-xs text-muted-foreground">{config.formatHint}</p>
        </div>
        <div className="ml-auto flex gap-1 flex-wrap justify-end">
          {[
            { key: "scripts" as const, label: "Scripts", icon: FileText, count: scripts.length },
            { key: "ideas" as const, label: "Find Ideas", icon: Play, count: null },
            { key: "greatest-hits" as const, label: "Greatest Hits", icon: Trophy, count: null },
            { key: "analytics" as const, label: "Analytics", icon: BarChart3, count: null },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              onClick={() => { setActiveTab(tab.key); setTopicFilter(null); }}
              className="rounded-xl text-xs"
              size="sm"
            >
              <tab.icon className="h-3.5 w-3.5 mr-1" />
              {tab.label}
              {tab.count !== null && <span>({tab.count})</span>}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "scripts" && (
        <>
          {/* Topic filter chip */}
          {topicFilter && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                <Hash className="h-3 w-3" />
                <span className="font-medium">{topicFilter}</span>
                <button
                  onClick={() => setTopicFilter(null)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  <XCircle className="h-3 w-3" />
                </button>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Filtering scripts by topic
              </span>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_STAGES.map((stage) => {
              const count = scripts.filter((s) => s.status === stage.key).length;
              const isActive = scriptFilter === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => setScriptFilter(stage.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                    isActive
                      ? stage.color
                      : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.06]"
                  }`}
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  {stage.label}
                  {count > 0 && <span className="ml-1.5 opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Scripts List */}
          <div className="space-y-3 stagger-children">
            {filteredScripts.map((script) => {
              const score = getScore(script.id);
              const overall = calculateOverallScore(score);
              const scoreBadgeColor = getScoreColor(overall);
              return (
                <div
                  key={script.id}
                  onClick={() => { setSelectedScript(script); setNotes(""); setEditMode(false); }}
                  className="glass rounded-2xl p-4 transition-all duration-200 hover:bg-white/[0.05] cursor-pointer active:scale-[0.97]"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">{script.title || "Untitled"}</h3>
                        {getStatusBadge(script.status)}
                        <Badge className={`rounded-md text-[10px] border font-semibold tabular-nums ${scoreBadgeColor}`}>
                          {overall}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>@{script.sourceCompetitor}</span>
                        <span>{script.contentPillar}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{script.hook}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-2" />
                  </div>
                </div>
              );
            })}

            {filteredScripts.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <h3 className="mt-4 font-semibold">No scripts yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Go to Find Ideas to generate {config.name} scripts.
                </p>
                {topicFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTopicFilter(null)}
                    className="mt-3 rounded-xl text-xs"
                  >
                    Clear topic filter
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "ideas" && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold">Find Viral Ideas for {config.name}</h2>
            </div>

            {/* Config Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Brand Configuration
                </span>
              </div>

              {configs.length > 0 ? (
                <div className="space-y-2">
                  <Select value={selectedConfigName} onValueChange={setSelectedConfigName}>
                    <SelectTrigger className="rounded-xl glass border-white/[0.08] h-10 text-xs">
                      <SelectValue placeholder="Select a brand config..." />
                    </SelectTrigger>
                    <SelectContent>
                      {configs.map((c) => {
                        const strategyName = getConfigStrategyName(c.configName);
                        return (
                          <SelectItem key={c.configName} value={c.configName} className="text-xs">
                            <div className="flex flex-col">
                              <span className="font-medium">{c.configName}</span>
                              {strategyName && (
                                <span className="text-[10px] text-muted-foreground">
                                  Strategy: {strategyName}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedConfigName && (
                    <p className="text-[11px] text-muted-foreground">
                      Using <span className="font-medium text-foreground">{selectedConfigName}</span>
                      {getConfigStrategyName(selectedConfigName) && (
                        <span>
                          &nbsp;with strategy <span className="font-medium text-foreground">{getConfigStrategyName(selectedConfigName)}</span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No brand profile configured. Go to My Brand to set one up.
                </p>
              )}

              <Button
                onClick={handleRunPipeline}
                disabled={running || configs.length === 0 || !selectedConfigName}
                size="lg"
                className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 glow-sm transition-all duration-300 hover:glow text-sm font-semibold"
              >
                {running ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Finding Ideas...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Find {config.name} Content Ideas
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Trending Topics */}
          {!running && videos.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <TrendingTopics videos={videos} onTopicClick={handleTopicClick} />
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {progress.status === "running" && <Loader2Icon className="h-4 w-4 text-purple-400 animate-spin" />}
                    {progress.status === "completed" && progress.errors.length === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {progress.status === "completed" && progress.errors.length > 0 && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                    {progress.status === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                    <h2 className="text-sm font-semibold">
                      {progress.status === "running" && progress.phase === "scraping" && "Finding competitor videos..."}
                      {progress.status === "running" && progress.phase === "analyzing" && "Analyzing and generating scripts..."}
                      {progress.status === "completed" && progress.errors.length === 0 && "Done! Your ideas are ready"}
                      {progress.status === "completed" && progress.errors.length > 0 && progress.videosAnalyzed === 0 && "API limits reached — no new videos found"}
                      {progress.status === "completed" && progress.errors.length > 0 && progress.videosAnalyzed > 0 && `Done with ${progress.errors.length} warning${progress.errors.length > 1 ? 's' : ''}`}
                      {progress.status === "error" && "Something went wrong"}
                    </h2>
                  </div>
                </div>

                <div>
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress.status === "completed" && progress.errors.length === 0
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : progress.status === "completed" && progress.errors.length > 0
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                          : progress.status === "error"
                          ? "bg-gradient-to-r from-red-500 to-orange-500"
                          : "bg-gradient-to-r from-purple-500 to-indigo-500"
                      }`}
                      style={{ width: `${progress.status === "completed" ? 100 : totalProgress}%` }}
                    />
                  </div>
                </div>

                {progress.status === "completed" && progress.videosAnalyzed > 0 && (
                  <Button onClick={() => setActiveTab("scripts")} className="w-full rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0 font-semibold gap-2">
                    <FileText className="h-4 w-4" />
                    View {progress.videosAnalyzed} New Scripts
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                {progress.status === "completed" && progress.errors.length > 0 && progress.videosAnalyzed === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-yellow-400">API quotas exhausted</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Apify and Gemini free tiers have daily limits. Your existing analyzed videos are still available.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/viral-ideas">
                        <Button className="w-full rounded-xl h-10 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0 text-xs gap-1.5">
                          <Flame className="h-3.5 w-3.5" />
                          Scan Main Competitors
                        </Button>
                      </Link>
                      <Link href="/videos">
                        <Button variant="outline" className="w-full rounded-xl h-10 text-xs gap-1.5">
                          <Film className="h-3.5 w-3.5" />
                          View Existing Videos
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {progress.errors.length > 0 && (
                  <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 space-y-1">
                    <p className="text-[11px] font-medium text-red-400">Errors ({progress.errors.length})</p>
                    {progress.errors.slice(0, 3).map((err, i) => (
                      <p key={i} className="text-[11px] text-red-400/70 leading-relaxed">{err}</p>
                    ))}
                    {progress.errors.length > 3 && (
                      <p className="text-[11px] text-red-400/50">...and {progress.errors.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>

              <details className="glass rounded-2xl overflow-hidden">
                <summary className="p-4 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Terminal className="h-4 w-4" />
                  <span className="font-medium">Details</span>
                  <Badge variant="secondary" className="ml-auto rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
                    {progress.log.length} entries
                  </Badge>
                </summary>
                <div className="border-t border-white/[0.06] p-4">
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {progress.log.map((line, i) => (
                      <div key={i} className={`leading-5 ${
                        line.includes("Error") || line.includes("error") ? "text-red-400" :
                        line.includes("done") || line.includes("complete") || line.includes("Complete") ? "text-emerald-400/80" :
                        "text-muted-foreground"
                      }`}>
                        {line}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {activeTab === "greatest-hits" && (
        <GreatestHits scripts={scripts} videos={videos} platform={platform} getScore={getScore} />
      )}

      {activeTab === "analytics" && (
        <PlatformAnalytics scripts={scripts} platform={platform} />
      )}

      {/* Script Detail Modal */}
      <Dialog open={!!selectedScript} onOpenChange={(open) => { if (!open) { setSelectedScript(null); setEditMode(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
          {selectedScript && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedScript.status)}
                  <span className="text-xs text-muted-foreground">From @{selectedScript.sourceCompetitor}</span>
                </div>
                <DialogTitle className="text-lg mt-2">
                  {editMode ? (
                    <Input value={selectedScript.title} onChange={(e) => setSelectedScript({ ...selectedScript, title: e.target.value })} className="rounded-xl glass border-white/[0.08]" />
                  ) : (
                    selectedScript.title || "Untitled"
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Idea Score Card */}
                <IdeaScoreCard
                  scriptId={selectedScript.id}
                  scores={getScore(selectedScript.id)}
                  onChange={(scores) => setScore(selectedScript.id, scores)}
                />

                <div className="flex gap-3">
                  {editMode ? (
                    <>
                      <Select value={selectedScript.platform} onValueChange={(v) => setSelectedScript({ ...selectedScript, platform: v })}>
                        <SelectTrigger className="rounded-xl glass border-white/[0.08] h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="x">X / Twitter</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={selectedScript.contentPillar} onChange={(e) => setSelectedScript({ ...selectedScript, contentPillar: e.target.value })} placeholder="Content pillar" className="rounded-xl glass border-white/[0.08] h-9 text-xs" />
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06] capitalize">
                        {selectedScript.platform}
                      </Badge>
                      <Badge variant="secondary" className="rounded-md text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300">
                        {selectedScript.contentPillar}
                      </Badge>
                    </>
                  )}
                </div>

                <div>
                  <Label className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">{config.hookLabel}</Label>
                  {editMode ? (
                    <Textarea value={selectedScript.hook} onChange={(e) => setSelectedScript({ ...selectedScript, hook: e.target.value })} className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={3} />
                  ) : (
                    <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{selectedScript.hook}</p>
                  )}
                </div>

                <div>
                  <Label className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider">{config.bodyLabel}</Label>
                  {editMode ? (
                    <Textarea value={selectedScript.body} onChange={(e) => setSelectedScript({ ...selectedScript, body: e.target.value })} className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={8} />
                  ) : (
                    <div className="mt-1.5 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedScript.body}</div>
                  )}
                </div>

                <div>
                  <Label className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">{config.ctaLabel}</Label>
                  {editMode ? (
                    <Textarea value={selectedScript.cta} onChange={(e) => setSelectedScript({ ...selectedScript, cta: e.target.value })} className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={2} />
                  ) : (
                    <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{selectedScript.cta}</p>
                  )}
                </div>

                {/* Notes from reviewers */}
                {selectedScript.laraNotes && (
                  <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-3">
                    <p className="text-[10px] font-medium text-yellow-400 uppercase tracking-wider mb-1">Editor Notes</p>
                    <p className="text-xs text-muted-foreground">{selectedScript.laraNotes}</p>
                  </div>
                )}
                {selectedScript.hanaNotes && (
                  <div className="rounded-xl bg-pink-500/5 border border-pink-500/10 p-3">
                    <p className="text-[10px] font-medium text-pink-400 uppercase tracking-wider mb-1">Approver Notes</p>
                    <p className="text-xs text-muted-foreground">{selectedScript.hanaNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {editMode ? (
                    <>
                      <Button onClick={() => saveEdit(selectedScript)} disabled={loading} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Save Changes
                      </Button>
                      <Button variant="ghost" onClick={() => setEditMode(false)} className="rounded-xl">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Editor actions */}
                      {(selectedScript.status === "generated" || selectedScript.status === "lara_review") && (
                        <>
                          <Button onClick={() => setEditMode(true)} variant="ghost" className="rounded-xl gap-1.5 text-xs">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Script
                          </Button>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes (optional)..."
                            className="w-full rounded-xl glass border-white/[0.08] text-xs mt-2"
                            rows={2}
                          />
                          <div className="flex gap-2 w-full mt-2">
                            <Button onClick={() => advanceStatus(selectedScript, "lara_approved", notes)} disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 border-0 text-xs">
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Approve for Review
                            </Button>
                            <Button onClick={() => advanceStatus(selectedScript, "generated", notes)} disabled={loading} variant="ghost" className="rounded-xl text-red-400 hover:text-red-300 text-xs">
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Approver actions */}
                      {(selectedScript.status === "lara_approved" || selectedScript.status === "hana_review") && (
                        <>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add final notes (optional)..."
                            className="w-full rounded-xl glass border-white/[0.08] text-xs mt-2"
                            rows={2}
                          />
                          <div className="flex gap-2 w-full mt-2">
                            <Button onClick={() => advanceStatus(selectedScript, "hana_approved", notes)} disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 border-0 text-xs">
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Final Approve
                            </Button>
                            <Button onClick={() => advanceStatus(selectedScript, "lara_review", notes)} disabled={loading} variant="ghost" className="rounded-xl text-red-400 hover:text-red-300 text-xs">
                              <XCircle className="h-4 w-4" />
                              Send Back
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Post-brief actions */}
                      {selectedScript.status === "brief_generated" && (
                        <Button asChild className="rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 border-0 text-xs">
                          <Link href="/briefs">
                            <Eye className="h-4 w-4" />
                            View Production Brief
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
