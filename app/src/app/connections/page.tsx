"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBrand } from "@/context/brand-context";
import type { SocialConnection } from "@/lib/types";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Plug,
  Loader2,
  Users,
  AlertCircle,
  FileText,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import {
  TikTokLogo,
  InstagramLogo,
  YouTubeLogo,
  LinkedInLogo,
  XLogo,
} from "@/components/platform-logos";

const PLATFORMS = [
  {
    id: "tiktok" as const,
    name: "TikTok",
    Logo: TikTokLogo,
    color: "text-white",
    bgColor: "bg-[#111111]",
    borderColor: "border-white/10",
    description: "Connect your TikTok Business account to track video performance",
  },
  {
    id: "instagram" as const,
    name: "Instagram",
    Logo: InstagramLogo,
    color: "text-pink-400",
    bgColor: "bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10",
    borderColor: "border-pink-500/20",
    description: "Connect your Instagram Business account to track Reels and posts",
  },
  {
    id: "youtube" as const,
    name: "YouTube",
    Logo: YouTubeLogo,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    description: "Connect your YouTube channel to track Shorts and video performance",
  },
  {
    id: "linkedin" as const,
    name: "LinkedIn",
    Logo: LinkedInLogo,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    description: "Connect your LinkedIn Page to track post engagement",
  },
  {
    id: "x" as const,
    name: "X / Twitter",
    Logo: XLogo,
    color: "text-white",
    bgColor: "bg-white/5",
    borderColor: "border-white/10",
    description: "Connect your X account to track tweet and thread performance",
  },
];

interface PlatformSetup {
  platform: string;
  name: string;
  authUrl: string;
  docsUrl: string;
  scopes: string[];
  setupSteps: string[];
}

export default function ConnectionsPage() {
  const { activeBrand } = useBrand();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [setupInfo, setSetupInfo] = useState<PlatformSetup | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [activeBrand]);

  const loadConnections = async () => {
    if (!activeBrand) return;
    const res = await fetch(`/api/connections?brandId=${activeBrand.id}`);
    const data = await res.json();
    setConnections(data);
    setLoading(false);
  };

  const getConnection = (platform: string) =>
    connections.find((c) => c.platform === platform && c.isActive);

  const handleConnect = async (platformId: string) => {
    setSelectedPlatform(platformId);
    setSetupLoading(true);
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/connect?platform=${platformId}&origin=${origin}`);
      const data = await res.json();
      setSetupInfo(data);
    } catch (err) {
      console.error("Failed to load setup info:", err);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Disconnect this account? You will need to reconnect to sync analytics again.")) return;
    await fetch(`/api/connections?id=${connectionId}`, { method: "DELETE" });
    loadConnections();
  };

  const handleSync = async (connectionId: string) => {
    // This will be implemented when analytics fetchers are ready
    alert("Analytics sync will fetch your latest post metrics. This feature requires API credentials to be configured in .env");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Link your brand's social accounts to pull real analytics and track what actually performs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
            {connections.filter((c) => c.isActive).length} / {PLATFORMS.length} Connected
          </Badge>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connection = getConnection(platform.id);
          const LogoComponent = platform.Logo;

          return (
            <div
              key={platform.id}
              className="bezel transition-all duration-300 hover:border-white/[0.1]"
            >
              <div className="bezel-inner p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.bgColor} border ${platform.borderColor}`}
                    >
                      <LogoComponent className={platform.color} size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{platform.name}</h3>
                      {connection ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-[11px] text-emerald-400">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">Not connected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {connection && (
                    <Badge
                      variant="secondary"
                      className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]"
                    >
                      <Users className="h-2.5 w-2.5 mr-1" />
                      {connection.followerCount.toLocaleString()}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {connection
                    ? `Connected as @${connection.accountHandle}. Last synced ${connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleDateString() : "never"}.`
                    : platform.description}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  {connection ? (
                    <>
                      <Button
                        onClick={() => handleSync(connection.id)}
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl text-xs glass-hover pressable gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Analytics
                      </Button>
                      <Button
                        onClick={() => handleDisconnect(connection.id)}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 pressable"
                      >
                        <Plug className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(platform.id)}
                      size="sm"
                      className="w-full rounded-xl text-xs bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 pressable gap-1.5"
                    >
                      <Plug className="h-3.5 w-3.5" />
                      Connect {platform.name}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step-by-Step Guide */}
      <div className="bezel">
        <div className="bezel-inner p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                <HelpCircle className="h-4 w-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold">How to Connect Your Social Accounts</h3>
            </div>
            <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
              3 Easy Steps
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative group">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 text-xs font-bold text-purple-300">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-1">Get Your API Keys</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Go to each platform's Developer Portal and create an app. Copy the Client ID and Secret.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PLATFORMS.map((p) => {
                      const PLogo = p.Logo;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleConnect(p.id)}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all border ${p.bgColor} ${p.borderColor} ${p.color} hover:opacity-80 pressable`}
                        >
                          <PLogo size={14} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* Arrow on desktop */}
              <div className="hidden md:block absolute top-4 -right-2 text-muted-foreground/20">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 text-xs font-bold text-purple-300">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-1">Add Keys to .env</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Open the <code className="text-purple-300 bg-purple-500/10 px-1 rounded">.env</code> file in the app folder. Paste your Client ID and Secret for each platform.
                  </p>
                  <div className="mt-2 rounded-lg bg-black/30 border border-white/[0.04] p-2 font-mono text-[9px] text-muted-foreground">
                    TIKTOK_CLIENT_ID=your_key_here<br/>
                    INSTAGRAM_CLIENT_ID=your_key_here
                  </div>
                </div>
              </div>
              {/* Arrow on desktop */}
              <div className="hidden md:block absolute top-4 -right-2 text-muted-foreground/20">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 text-xs font-bold text-purple-300">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-1">Click Connect</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Come back to this page and click the <strong className="text-foreground/70">Connect</strong> button on any platform card. Authorize your account.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400 font-medium">Done!</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">Then click Sync Analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Don't have API keys yet? Click any platform button above for a step-by-step walkthrough.
            </p>
            <Link
              href="/guide"
              className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <FileText className="h-3 w-3" />
              Full Guide
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bezel">
        <div className="bezel-inner p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">How connections work</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When you connect a social account, the dashboard can pull real post metrics (views, likes, comments, shares)
                directly from the platform's API. This lets you compare predicted performance against actual results,
                and automatically update your content strategy based on what works. Each brand workspace has its own
                separate connections — switch brands using the workspace switcher in the top bar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={!!selectedPlatform} onOpenChange={(open) => { if (!open) { setSelectedPlatform(null); setSetupInfo(null); } }}>
        <DialogContent className="max-w-lg glass-strong rounded-2xl border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {setupInfo ? `Connect ${setupInfo.name}` : "Connect Account"}
            </DialogTitle>
          </DialogHeader>

          {setupLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : setupInfo ? (
            <div className="space-y-5 pt-2">
              <p className="text-xs text-muted-foreground">
                Follow these steps to connect your {setupInfo.name} account. You'll need developer access 
                to create an app and get API credentials.
              </p>

              <div className="space-y-3">
                {setupInfo.setupSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-300">
                      {i + 1}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Required Scopes</p>
                <div className="flex flex-wrap gap-1.5">
                  {setupInfo.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  asChild
                  className="flex-1 rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5"
                >
                  <a href={setupInfo.docsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Developer Docs
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl h-11 border-white/[0.08] hover:bg-white/[0.05]"
                  onClick={() => { setSelectedPlatform(null); setSetupInfo(null); }}
                >
                  Close
                </Button>
              </div>

              <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-3">
                <p className="text-[11px] text-yellow-400/80">
                  <strong>Note:</strong> After adding credentials to your .env file, restart the app 
                  and return here to complete the connection.
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
