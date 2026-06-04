"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownContent } from "@/components/markdown-content";
import { sanitizeForDivido } from "@/lib/sanitize-script";
import {
  Flame,
  Play,
  FileText,
  Users,
  CalendarDays,
  TrendingUp,
  Zap,
  ArrowRight,
  BarChart3,
  Film,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Sparkles,
  Search,
  X,
  Copy,
  Check,
} from "lucide-react";
import type { Video, Script, Creator, ViralIdea } from "@/lib/types";

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [viralIdeas, setViralIdeas] = useState<ViralIdea[]>([]);
  const [loading, setLoading] = useState(true);

  // Analyze Any Video state
  const [reelUrl, setReelUrl] = useState("");
  const [analyzingReel, setAnalyzingReel] = useState(false);
  const [reelResult, setReelResult] = useState<any>(null);
  const [reelError, setReelError] = useState<string | null>(null);
  const [showReelModal, setShowReelModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos").then((r) => r.json()),
      fetch("/api/scripts").then((r) => r.json()),
      fetch("/api/creators").then((r) => r.json()),
      fetch("/api/viral-ideas").then((r) => r.json()),
    ]).then(([v, s, c, vi]) => {
      setVideos(v);
      setScripts(s);
      setCreators(c);
      setViralIdeas(vi);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
  const mainCompetitors = creators.filter((c) => c.isMainCompetitor);
  const recentViral = viralIdeas
    .sort((a, b) => new Date(b.dateDetected).getTime() - new Date(a.dateDetected).getTime())
    .slice(0, 3);

  const hasData = videos.length > 0 || scripts.length > 0 || viralIdeas.length > 0;

  const handleAnalyzeReel = async () => {
    const isValidUrl = reelUrl.includes("instagram.com") || reelUrl.includes("tiktok.com");
    if (!reelUrl.trim() || !isValidUrl) {
      setReelError("Please enter a valid Instagram or TikTok URL");
      return;
    }
    setAnalyzingReel(true);
    setReelError(null);
    setReelResult(null);
    try {
      const response = await fetch("/api/analyze-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reelUrl.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setReelResult(data.data);
        setShowReelModal(true);
        setReelUrl("");
      } else {
        setReelError(data.error || "Analysis failed");
      }
    } catch (err) {
      setReelError(err instanceof Error ? err.message : "Failed to analyze reel");
    } finally {
      setAnalyzingReel(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI-powered competitor intelligence and content generation studio
          </p>
        </div>
        <Link href="/viral-ideas">
          <Button className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5">
            <Flame className="h-4 w-4" />
            Find Viral Ideas
          </Button>
        </Link>
      </div>

      {/* Analyze Any Video — Quick Action */}
      <Card className="glass rounded-2xl p-5 border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Analyze Any Video</h3>
              <p className="text-[11px] text-muted-foreground">
                Paste an Instagram or TikTok URL and get original script + script adapted to your brand tone/voice instantly
              </p>
            </div>
          </div>
          <div className="flex-1 w-full sm:w-auto flex gap-2">
            <Input
              placeholder="https://www.instagram.com/reel/... or https://www.tiktok.com/@user/video/..."
              value={reelUrl}
              onChange={(e) => { setReelUrl(e.target.value); setReelError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeReel()}
              className="flex-1 rounded-xl bg-white/[0.05] border-white/[0.08] h-10 text-sm"
            />
            <Button
              onClick={handleAnalyzeReel}
              disabled={analyzingReel}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 h-10 gap-1.5 shrink-0"
            >
              {analyzingReel ? (
                <><Sparkles className="h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Analyze</>
              )}
            </Button>
          </div>
        </div>
        {reelError && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {reelError}
          </div>
        )}
      </Card>

      {/* Reel Analysis Results Modal */}
      <Dialog open={showReelModal} onOpenChange={setShowReelModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden glass-strong rounded-2xl border-white/[0.08] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">
                Reel Analysis
              </DialogTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowReelModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {reelResult && (
              <p className="text-xs text-muted-foreground mt-1">
                @{reelResult.creator} · {reelResult.views.toLocaleString()} views
              </p>
            )}
          </DialogHeader>

          {reelResult && (
            <Tabs defaultValue="original" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0 px-6 shrink-0 h-10">
                <TabsTrigger value="original" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-400 px-4 py-2 text-xs">
                  <Search className="w-3.5 h-3.5 mr-1.5" />Why It Works
                </TabsTrigger>
                <TabsTrigger value="adapted" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-gray-400 px-4 py-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />My Version
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-6">
                <TabsContent value="original" className="m-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Original Analysis</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleCopy(reelResult.analysis, "analysis")}
                    >
                      {copiedField === "analysis" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedField === "analysis" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <MarkdownContent content={reelResult.analysis} variant="analysis" />
                </TabsContent>

                <TabsContent value="adapted" className="m-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Divido Adapted</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleCopy(sanitizeForDivido(reelResult.newConcepts), "adapted")}
                    >
                      {copiedField === "adapted" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedField === "adapted" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <MarkdownContent content={sanitizeForDivido(reelResult.newConcepts)} variant="concepts" />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {!hasData ? (
        /* Onboarding State */
        <Card className="glass rounded-2xl p-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Content Studio</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This is your command center for finding viral content ideas, analyzing competitors, and generating scripts.
              Follow these steps to get started:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="rounded-md text-[10px] bg-purple-500/10 border-purple-500/20 text-purple-300">Step 1</Badge>
                </div>
                <p className="text-sm font-medium mb-1">Add Competitors</p>
                <p className="text-[11px] text-muted-foreground">Add Instagram accounts you want to learn from</p>
                <Link href="/creators">
                  <Button size="sm" className="mt-3 rounded-xl text-xs w-full bg-gradient-to-r from-purple-500 to-indigo-600 border-0">
                    Go to Competitors
                  </Button>
                </Link>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="rounded-md text-[10px] bg-purple-500/10 border-purple-500/20 text-purple-300">Step 2</Badge>
                </div>
                <p className="text-sm font-medium mb-1">Set Your Brand</p>
                <p className="text-[11px] text-muted-foreground">Configure your brand voice and analysis prompts</p>
                <Link href="/settings">
                  <Button size="sm" className="mt-3 rounded-xl text-xs w-full bg-gradient-to-r from-purple-500 to-indigo-600 border-0">
                    Go to Settings
                  </Button>
                </Link>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="rounded-md text-[10px] bg-purple-500/10 border-purple-500/20 text-purple-300">Step 3</Badge>
                </div>
                <p className="text-sm font-medium mb-1">Find Viral Ideas</p>
                <p className="text-[11px] text-muted-foreground">Run the pipeline to discover and analyze viral content</p>
                <Link href="/viral-ideas">
                  <Button size="sm" className="mt-3 rounded-xl text-xs w-full bg-gradient-to-r from-orange-500 to-red-500 border-0">
                    Find Ideas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Videos</span>
              </div>
              <p className="text-2xl font-bold">{videos.length}</p>
              <p className="text-[11px] text-muted-foreground">
                {totalViews >= 1000000 ? `${(totalViews / 1000000).toFixed(1)}M` : totalViews >= 1000 ? `${(totalViews / 1000).toFixed(0)}K` : totalViews} total views
              </p>
            </Card>
            <Card className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Scripts</span>
              </div>
              <p className="text-2xl font-bold">{scripts.length}</p>
              <p className="text-[11px] text-muted-foreground">
                {scripts.filter((s) => s.status === "posted").length} published
              </p>
            </Card>
            <Card className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Viral Ideas</span>
              </div>
              <p className="text-2xl font-bold">{viralIdeas.length}</p>
              <p className="text-[11px] text-muted-foreground">
                {viralIdeas.filter((v) => v.viralMultiplier >= 2).length} high performers
              </p>
            </Card>
            <Card className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Competitors</span>
              </div>
              <p className="text-2xl font-bold">{creators.length}</p>
              <p className="text-[11px] text-muted-foreground">
                {mainCompetitors.length} main competitors
              </p>
            </Card>
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Viral Ideas */}
            <Card className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <h3 className="text-sm font-semibold">Recent Viral Ideas</h3>
                </div>
                <Link href="/viral-ideas">
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              {recentViral.length === 0 ? (
                <div className="text-center py-6 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-sm text-muted-foreground">No viral ideas yet</p>
                  <Link href="/viral-ideas">
                    <Button size="sm" className="mt-2 rounded-xl text-xs bg-gradient-to-r from-orange-500 to-red-500 border-0">
                      Find Viral Ideas
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentViral.map((idea) => (
                    <Link key={idea.id} href={`/viral-ideas`}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">@{idea.creator}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {idea.views.toLocaleString()} views · {idea.viralMultiplier.toFixed(1)}x viral
                            </p>
                          </div>
                        </div>
                        <Badge className="rounded-md text-[10px] bg-orange-500/10 border-orange-500/20 text-orange-300">
                          {idea.viralMultiplier.toFixed(1)}x
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold">Quick Actions</h3>
              </div>
              <div className="space-y-2">
                <Link href="/viral-ideas">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:border-orange-500/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Flame className="h-4 w-4 text-orange-400" />
                      <div>
                        <p className="text-sm font-medium">Scan Main Competitors</p>
                        <p className="text-[11px] text-muted-foreground">Check for new viral content from rivals</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-400" />
                  </div>
                </Link>
                <Link href="/creators">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium">Manage Competitors</p>
                        <p className="text-[11px] text-muted-foreground">{creators.length} accounts tracked</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link href="/settings">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium">Review Settings</p>
                        <p className="text-[11px] text-muted-foreground">Brand, APIs, and connections</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}