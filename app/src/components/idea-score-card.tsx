"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Flame, Star, Gauge, Zap } from "lucide-react";

export interface ScriptScore {
  brandFit: number;
  effort: number;
  predictedImpact: number;
}

interface IdeaScoreCardProps {
  scriptId: string;
  scores: ScriptScore;
  onChange?: (scores: ScriptScore) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function calculateOverallScore(scores: ScriptScore): number {
  const { brandFit, effort, predictedImpact } = scores;
  return Math.round(brandFit * 0.4 + predictedImpact * 0.4 + (11 - effort) * 0.2);
}

export function getScoreColor(overall: number): string {
  if (overall >= 8) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (overall >= 5) return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  return "bg-red-500/15 text-red-300 border-red-500/25";
}

export function getScoreLabel(overall: number): string {
  if (overall >= 9) return "Exceptional";
  if (overall >= 8) return "Strong";
  if (overall >= 6) return "Solid";
  if (overall >= 5) return "Average";
  if (overall >= 3) return "Weak";
  return "Skip";
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

export function useScriptScores() {
  const [scores, setScores] = useState<Record<string, ScriptScore>>({});

  const getScore = useCallback(
    (scriptId: string): ScriptScore => {
      return scores[scriptId] || getDefaultScores(scriptId);
    },
    [scores]
  );

  const setScore = useCallback((scriptId: string, score: ScriptScore) => {
    setScores((prev) => ({ ...prev, [scriptId]: score }));
  }, []);

  return { scores, getScore, setScore };
}

function RatingBar({
  label,
  icon: Icon,
  value,
  colorClass,
  onChange,
  readOnly,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  colorClass: string;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3 w-3 ${colorClass}`} />
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        </div>
        <span className={`text-[11px] font-bold tabular-nums ${colorClass}`}>{value}/10</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={`flex-1 h-1.5 rounded-full transition-all duration-200 ${
              n <= value
                ? colorClass.replace("text-", "bg-").split(" ")[0]
                : "bg-white/[0.06]"
            } ${!readOnly ? "hover:opacity-80 active:scale-[0.97] cursor-pointer" : "cursor-default"}`}
            style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          />
        ))}
      </div>
    </div>
  );
}

export function IdeaScoreCard({
  scriptId,
  scores,
  onChange,
  readOnly = false,
  compact = false,
}: IdeaScoreCardProps) {
  const overall = calculateOverallScore(scores);
  const color = getScoreColor(overall);

  const handleChange = (dimension: keyof ScriptScore, value: number) => {
    onChange?.({ ...scores, [dimension]: value });
  };

  if (compact) {
    return (
      <Badge
        className={`rounded-md text-[10px] border font-semibold tabular-nums ${color}`}
        title={`Overall: ${overall} — ${getScoreLabel(overall)}`}
      >
        <Star className="h-2.5 w-2.5 mr-0.5" />
        {overall}
      </Badge>
    );
  }

  return (
    <div className="bezel">
      <div className="bezel-inner p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <span className="text-xs font-semibold">Idea Score</span>
          </div>
          <Badge className={`rounded-md text-[10px] border font-bold ${color}`}>
            {overall} — {getScoreLabel(overall)}
          </Badge>
        </div>

        <div className="space-y-3">
          <RatingBar
            label="Brand Fit"
            icon={Star}
            value={scores.brandFit}
            colorClass="text-purple-400"
            onChange={(v) => handleChange("brandFit", v)}
            readOnly={readOnly}
          />
          <RatingBar
            label="Effort"
            icon={Gauge}
            value={scores.effort}
            colorClass="text-amber-400"
            onChange={(v) => handleChange("effort", v)}
            readOnly={readOnly}
          />
          <RatingBar
            label="Predicted Impact"
            icon={Flame}
            value={scores.predictedImpact}
            colorClass="text-rose-400"
            onChange={(v) => handleChange("predictedImpact", v)}
            readOnly={readOnly}
          />
        </div>

        <div className="pt-1 border-t border-white/[0.05]">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Formula</span>
            <span className="font-mono">
              {scores.brandFit}×0.4 + {scores.predictedImpact}×0.4 + ({11 - scores.effort})×0.2
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
