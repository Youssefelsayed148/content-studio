"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, Trophy, Film, FileText, TrendingUp, Award } from "lucide-react";
import type { Script, Video } from "@/lib/types";
import { IdeaScoreCard, calculateOverallScore, type ScriptScore } from "./idea-score-card";

interface GreatestHitsProps {
  scripts: Script[];
  videos: Video[];
  platform: string;
  getScore?: (scriptId: string) => ScriptScore;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  tiktok: Film,
  instagram: Film,
  youtube: Film,
  linkedin: FileText,
  x: FileText,
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function generateWhyItWorked(script: Script, video?: Video): string {
  if (video?.analysis) {
    const sentences = video.analysis.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length > 0) {
      const best = sentences
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && s.length < 180)
        .slice(0, 2)
        .join(". ");
      if (best) return best + ".";
    }
  }
  const reasons: string[] = [];
  if (script.hook.length < 80) reasons.push("Punchy hook grabs attention immediately");
  else reasons.push("Strong narrative hook builds curiosity");
  if (script.cta.toLowerCase().includes("follow") || script.cta.toLowerCase().includes("comment"))
    reasons.push("Direct CTA drives engagement");
  else reasons.push("Clear value proposition in CTA");
  if (script.body.length > 200) reasons.push("Deep value delivery in body");
  else reasons.push("Tight, scroll-stopping pacing");
  return reasons.slice(0, 2).join(". ") + ".";
}

function getDefaultScores(scriptId: string): ScriptScore {
  let hash = 0;
  for (let i = 0; i < scriptId.length; i++) {
    const char = scriptId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const absHash = Math.abs(hash);
  return {
    brandFit: 4 + (absHash % 7),
    effort: 3 + ((absHash >> 4) % 8),
    predictedImpact: 5 + ((absHash >> 8) % 6),
  };
}

export function GreatestHits({ scripts, videos, platform, getScore }: GreatestHitsProps) {
  const resolveScore = getScore || getDefaultScores;

  const hits = useMemo(() => {
    const platformScripts = scripts.filter((s) => s.platform === platform);
    const withPerformance = platformScripts.filter(
      (s) => (s.performanceViews || 0) + (s.performanceLikes || 0) > 0
    );

    const scored = withPerformance.map((s) => {
      const score = resolveScore(s.id);
      const overall = calculateOverallScore(score);
      const video = videos.find((v) => v.id === s.sourceVideoId);
      return {
        script: s,
        video,
        overall,
        totalEngagement: (s.performanceViews || 0) + (s.performanceLikes || 0),
      };
    });

    return scored.sort((a, b) => b.totalEngagement - a.totalEngagement).slice(0, 9);
  }, [scripts, videos, platform, resolveScore]);

  const hasData = hits.length > 0;

  if (!hasData) {
    return (
      <div className="bezel">
        <div className="bezel-inner p-10 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 mx-auto">
            <Trophy className="h-7 w-7 text-amber-400/60" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Hall of Fame</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              Post content to see what works. Your top-performing scripts will appear here once they have view and like data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const topHit = hits[0];
  const PlatformIcon = PLATFORM_ICONS[platform] || Film;

  return (
    <div className="space-y-6">
      {/* Featured Top Hit */}
      {topHit && (
        <div className="bezel-strong">
          <div className="bezel-inner-strong p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                #1 Greatest Hit
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold leading-snug">{topHit.script.title || "Untitled"}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {generateWhyItWorked(topHit.script, topHit.video)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-lg font-bold tabular-nums">
                    {formatNumber(topHit.totalEngagement)}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">total engagement</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge className="rounded-md text-[10px] bg-white/[0.05] border-white/[0.08]">
                <PlatformIcon className="h-3 w-3 mr-1" />
                {platform}
              </Badge>
              <Badge className="rounded-md text-[10px] bg-purple-500/10 border-purple-500/20 text-purple-300">
                {topHit.script.contentPillar}
              </Badge>
              <IdeaScoreCard
                scriptId={topHit.script.id}
                scores={resolveScore(topHit.script.id)}
                readOnly
                compact
              />
              <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(topHit.script.performanceViews || 0)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {formatNumber(topHit.script.performanceLikes || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of other hits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
        {hits.slice(1).map((hit) => (
          <div
            key={hit.script.id}
            className="bezel pressable transition-all duration-200"
            style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            <div className="bezel-inner p-4 space-y-3 h-full flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold line-clamp-2 flex-1">{hit.script.title || "Untitled"}</h4>
                <IdeaScoreCard
                  scriptId={hit.script.id}
                  scores={resolveScore(hit.script.id)}
                  readOnly
                  compact
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                {generateWhyItWorked(hit.script, hit.video)}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-md text-[10px] bg-white/[0.05] border-white/[0.08] capitalize">
                    {hit.script.platform}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{hit.script.contentPillar}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" />
                    {formatNumber(hit.script.performanceViews || 0)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5" />
                    {formatNumber(hit.script.performanceLikes || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
