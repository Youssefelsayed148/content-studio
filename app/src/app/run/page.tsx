"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  TrendingUp,
  Video,
  Brain,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Flame,
} from "lucide-react";

interface Config {
  configName: string;
  creatorsCategory: string;
}

interface PipelineProgress {
  status: string;
  phase: string;
  creatorsCompleted: number;
  creatorsTotal: number;
  videosAnalyzed: number;
  videosTotal: number;
  viralIdeasFound: number;
  scriptsGenerated: number;
  errors: string[];
  log: string[];
}

const pipelineSteps = [
  { id: "scraping", label: "Scrape Competitors", icon: Video, description: "Fetch recent videos from all competitor accounts" },
  { id: "analyzing", label: "AI Video Analysis", icon: Brain, description: "Analyze content, hooks, and viral mechanics with Gemini" },
  { id: "viral_detection", label: "Viral Detection", icon: Flame, description: "Identify videos performing above creator average" },
  { id: "scripting", label: "Script Generation", icon: FileText, description: "Generate brand-adapted scripts from viral ideas" },
  { id: "done", label: "Complete", icon: CheckCircle, description: "All done! View results in Videos and Viral Ideas" },
];

export default function RunPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [maxVideos, setMaxVideos] = useState(10);
  const [topK, setTopK] = useState(3);
  const [nDays, setNDays] = useState(7);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [viralDetecting, setViralDetecting] = useState(false);
  const [viralResult, setViralResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/configs")
      .then((r) => r.json())
      .then((data) => {
        setConfigs(data);
        if (data.length > 0) setSelectedConfig(data[0].configName);
      });
  }, []);

  const runPipeline = async () => {
    if (!selectedConfig || running) return;
    setRunning(true);
    setProgress(null);

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configName: selectedConfig, maxVideos, topK, nDays, platform }),
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
              setProgress(data);
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const runViralDetection = async () => {
    if (viralDetecting) return;
    setViralDetecting(true);
    setViralResult(null);

    try {
      const response = await fetch("/api/viral-ideas/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: 2.0, configName: selectedConfig, platform }),
      });

      const data = await response.json();
      setViralResult(data);
    } catch (err) {
      setViralResult({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setViralDetecting(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!progress) return -1;
    const idx = pipelineSteps.findIndex((s) => s.id === progress.phase);
    return idx >= 0 ? idx : pipelineSteps.length - 1;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Content Pipeline</h1>
        <p className="text-gray-400">
          Scrape competitors, analyze videos, detect viral content, and generate scripts — all automatically
        </p>
      </div>

      {/* Configuration */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-purple-400" />
          Configuration
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Config</label>
            <Select value={selectedConfig} onValueChange={setSelectedConfig}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.configName} value={c.configName}>
                    {c.configName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Platform</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="x">X</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Max Videos</label>
            <Select value={String(maxVideos)} onValueChange={(v) => setMaxVideos(Number(v))}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Top K</label>
            <Select value={String(topK)} onValueChange={(v) => setTopK(Number(v))}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Pipeline Steps Visual */}
      <Card className="p-6 border-white/10 bg-white/5">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Pipeline Flow
        </h2>

        <div className="space-y-4">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStepIndex && running;
            const isComplete = idx < currentStepIndex || (idx === currentStepIndex && progress?.status === "completed");
            const isPending = idx > currentStepIndex && running;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-purple-500/10 border border-purple-500/30"
                    : isComplete
                    ? "bg-green-500/5 border border-green-500/20"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? "bg-purple-500/20 text-purple-400"
                      : isComplete
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isActive ? "text-purple-400" : isComplete ? "text-green-400" : "text-gray-400"}`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                        Running
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
                {isActive && progress && (
                  <div className="text-right">
                    <div className="text-sm text-purple-400 font-medium">
                      {step.id === "scraping" && `${progress.creatorsCompleted}/${progress.creatorsTotal} creators`}
                      {step.id === "analyzing" && `${progress.videosAnalyzed}/${progress.videosTotal} videos`}
                      {step.id === "viral_detection" && `${progress.viralIdeasFound || 0} found`}
                      {step.id === "scripting" && `${progress.scriptsGenerated || 0} scripts`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        {running && progress && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">
                {Math.round(
                  ((progress.creatorsCompleted / Math.max(progress.creatorsTotal, 1)) * 25) +
                  ((progress.videosAnalyzed / Math.max(progress.videosTotal, 1)) * 25) +
                  (progress.phase === "viral_detection" ? 25 : 0) +
                  (progress.phase === "done" ? 25 : 0)
                )}%
              </span>
            </div>
            <Progress
              value={
                ((progress.creatorsCompleted / Math.max(progress.creatorsTotal, 1)) * 25) +
                ((progress.videosAnalyzed / Math.max(progress.videosTotal, 1)) * 25) +
                (progress.phase === "viral_detection" ? 25 : 0) +
                (progress.phase === "done" ? 25 : 0)
              }
              className="h-2"
            />
          </div>
        )}

        {/* Log Output */}
        {running && progress?.log && progress.log.length > 0 && (
          <div className="mt-4 bg-black/30 rounded-lg p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
            {progress.log.slice(-10).map((log, i) => (
              <div key={i} className="text-gray-400">
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={runPipeline}
            disabled={running || !selectedConfig}
            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
          >
            {running ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Full Pipeline
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/viral-ideas")}
            className="border-white/10 hover:bg-white/10"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            View Viral Ideas
          </Button>
        </div>
      </Card>

      {/* Quick Viral Detection Card */}
      <Card className="p-6 border-orange-500/20 bg-orange-500/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Quick Viral Detection
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Already have analyzed videos? Run viral detection on existing data without re-scraping.
              This finds videos that performed significantly above their creator's average.
            </p>

            {viralResult && (
              <div className={`mb-4 p-3 rounded-lg ${viralResult.success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {viralResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`font-medium ${viralResult.success ? "text-green-400" : "text-red-400"}`}>
                    {viralResult.success
                      ? `${viralResult.newIdeas} new viral ideas found!`
                      : viralResult.error}
                  </span>
                </div>
                {viralResult.success && (
                  <p className="text-sm text-gray-400">
                    Scanned {viralResult.totalVideos} videos, found {viralResult.viralFound} viral outliers.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={runViralDetection}
                disabled={viralDetecting}
                variant="outline"
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                {viralDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Detect Viral Videos
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/viral-ideas")}
                className="text-gray-400 hover:text-white"
              >
                View Results
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Settings2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}
