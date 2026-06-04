"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Plug,
  Users,
  Activity,
  Database,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  RefreshCw,
  Loader2,
  Save,
  ExternalLink,
  Shield,
  Zap,
  Brain,
  Globe,
  FileDown,
  FileUp,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Cpu,
} from "lucide-react";
import AIModelsSettings from "./ai-models-settings";
import type { Creator, Config, Brand } from "@/lib/types";
import {
  TikTokLogo,
  InstagramLogo,
  YouTubeLogo,
  LinkedInLogo,
  XLogo,
} from "@/components/platform-logos";

const PLATFORMS = [
  { id: "tiktok", name: "TikTok", Logo: TikTokLogo, color: "text-white" },
  { id: "instagram", name: "Instagram", Logo: InstagramLogo, color: "text-pink-400" },
  { id: "youtube", name: "YouTube", Logo: YouTubeLogo, color: "text-red-500" },
  { id: "linkedin", name: "LinkedIn", Logo: LinkedInLogo, color: "text-blue-500" },
  { id: "x", name: "X / Twitter", Logo: XLogo, color: "text-white" },
];

interface ApiStatus {
  name: string;
  key: string;
  icon: React.ElementType;
  description: string;
  status: "connected" | "error" | "unknown";
  message: string;
}

export default function SettingsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showKeyInput, setShowKeyInput] = useState<Record<string, boolean>>({});
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    checkApiStatus();
  }, []);

  const loadData = () => {
    Promise.all([
      fetch("/api/creators").then((r) => r.json()),
      fetch("/api/configs").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
      fetch("/api/connections").then((r) => r.json()),
      fetch("/api/keys").then((r) => r.json()),
    ]).then(([c, cf, b, con, keys]) => {
      setCreators(c);
      setConfigs(cf);
      setBrands(b);
      setConnections(con);
      setApiKeys(keys);
      setLoading(false);
    });
  };

  const saveApiKey = async (service: string) => {
    const value = keyValues[service];
    if (!value?.trim()) return;
    setValidating((prev) => ({ ...prev, [service]: true }));
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, keyValue: value }),
      });
      const data = await response.json();
      if (data.success) {
        setApiKeys((prev) => {
          const filtered = prev.filter((k) => k.service !== service);
          return [...filtered, data.key];
        });
        setKeyValues((prev) => ({ ...prev, [service]: "" }));
        setShowKeyInput((prev) => ({ ...prev, [service]: false }));
      }
      alert(data.message || (data.valid ? "Key saved successfully" : "Key validation failed"));
    } finally {
      setValidating((prev) => ({ ...prev, [service]: false }));
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("Remove this API key?")) return;
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      
      const statuses: ApiStatus[] = [
        {
          name: "Apify",
          key: "apify",
          icon: Globe,
          description: "Instagram scraping service",
          status: data.apify.configured ? "connected" : "error",
          message: data.apify.message,
        },
        {
          name: "Google Gemini",
          key: "gemini",
          icon: Brain,
          description: "Video analysis AI (native video support)",
          status: data.gemini.configured ? "connected" : "error",
          message: data.gemini.message,
        },
        {
          name: "Anthropic Claude",
          key: "anthropic",
          icon: Zap,
          description: "Script generation AI (high-quality writing)",
          status: data.anthropic.configured ? "connected" : "error",
          message: data.anthropic.message,
        },
        {
          name: "OpenAI",
          key: "openai",
          icon: Brain,
          description: "Script generation AI (GPT-4o, GPT-4 Turbo)",
          status: data.openai.configured ? "connected" : "error",
          message: data.openai.message,
        },
        {
          name: "OpenRouter",
          key: "openrouter",
          icon: Globe,
          description: "Unified gateway (200+ models via one key)",
          status: data.openrouter.configured ? "connected" : "error",
          message: data.openrouter.message,
        },
      ];

      setApiStatuses(statuses);
    } catch {
      setApiStatuses([
        { name: "Apify", key: "apify", icon: Globe, description: "Instagram scraping service", status: "error", message: "Unable to check status" },
        { name: "Google Gemini", key: "gemini", icon: Brain, description: "Video analysis AI", status: "error", message: "Unable to check status" },
        { name: "Anthropic Claude", key: "anthropic", icon: Zap, description: "Script generation AI", status: "error", message: "Unable to check status" },
        { name: "OpenAI", key: "openai", icon: Brain, description: "Script generation AI", status: "error", message: "Unable to check status" },
        { name: "OpenRouter", key: "openrouter", icon: Globe, description: "Unified gateway", status: "error", message: "Unable to check status" },
      ]);
    }
  };

  const toggleMainCompetitor = async (creator: Creator) => {
    setSaving(true);
    try {
      const response = await fetch("/api/creators", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: creator.id, isMainCompetitor: !creator.isMainCompetitor }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, isMainCompetitor: !c.isMainCompetitor } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update main competitor status");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const response = await fetch("/api/export");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-studio-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  const mainCompetitors = creators.filter((c) => c.isMainCompetitor);
  const otherCreators = creators.filter((c) => !c.isMainCompetitor);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-5 w-5 text-purple-400" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your brand, competitors, connections, and system configuration
        </p>
      </div>

      <Tabs defaultValue="brand" className="space-y-6">
        <TabsList className="glass rounded-xl p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="brand" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <Shield className="h-3.5 w-3.5 mr-1.5" />Brand Profile
          </TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
            <Users className="h-3.5 w-3.5 mr-1.5" />Main Competitors
          </TabsTrigger>
          <TabsTrigger value="connections" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
            <Plug className="h-3.5 w-3.5 mr-1.5" />Connections
          </TabsTrigger>
          <TabsTrigger value="models" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <Cpu className="h-3.5 w-3.5 mr-1.5" /> AI Models
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-300">
            <Plug className="h-3.5 w-3.5 mr-1.5" /> API Status
          </TabsTrigger>
          <TabsTrigger value="data" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            <Database className="h-3.5 w-3.5 mr-1.5" /> Data
          </TabsTrigger>
          <TabsTrigger value="data" className="rounded-lg text-xs px-4 py-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300">
            <Database className="h-3.5 w-3.5 mr-1.5" />Data
          </TabsTrigger>
        </TabsList>

        {/* BRAND PROFILE TAB */}
        <TabsContent value="brand" className="space-y-6">
          <Card className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Brand Configurations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your content analysis prompts and brand voice settings
                </p>
              </div>
              <Link href="/configs">
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                  Manage Configs <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {configs.length === 0 ? (
              <div className="text-center py-8 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No brand configs yet</p>
                <Link href="/configs">
                  <Button size="sm" className="mt-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 border-0 text-xs">
                    Create Your First Config
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {configs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div>
                      <p className="text-sm font-medium">{c.configName}</p>
                      <p className="text-[11px] text-muted-foreground">Category: {c.creatorsCategory}</p>
                    </div>
                    <Link href="/configs">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Brand Identity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your brand name, colors, and visual identity
                </p>
              </div>
              <Link href="/brand-voice">
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                  Edit Brand <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {brands.length === 0 ? (
              <div className="text-center py-8 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No brand identity set</p>
                <Link href="/brand-voice">
                  <Button size="sm" className="mt-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 border-0 text-xs">
                    Set Up Brand
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {brands.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: b.primaryColor }}>
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* MAIN COMPETITORS TAB */}
        <TabsContent value="competitors" className="space-y-6">
          <Card className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-orange-400 fill-orange-400" />
                  Main Competitors
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mark your direct competitors. These are prioritized in pipeline runs and shown first in Viral Ideas.
                </p>
              </div>
              <Badge variant="secondary" className="rounded-md text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-300">
                {mainCompetitors.length} set
              </Badge>
            </div>

            {mainCompetitors.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Active Main Competitors</p>
                <div className="flex flex-wrap gap-2">
                  {mainCompetitors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleMainCompetitor(c)}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium hover:bg-orange-500/20 transition-colors"
                    >
                      <Star className="h-3 w-3 fill-orange-400" />
                      @{c.username}
                      {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">All Competitors</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {otherCreators.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleMainCompetitor(c)}
                    disabled={saving}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <span className="text-xs">@{c.username}</span>
                    <Star className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-orange-400 transition-colors" />
                  </button>
                ))}
              </div>
              {creators.length === 0 && (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No competitors added yet</p>
                  <Link href="/creators">
                    <Button size="sm" className="mt-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 border-0 text-xs">
                      Add Competitors
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* CONNECTIONS TAB */}
        <TabsContent value="connections" className="space-y-6">
          <Card className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Social Media Connections</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect your accounts to track performance and publish content
                </p>
              </div>
              <Link href="/connections">
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                  Manage Connections <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLATFORMS.map((platform) => {
                const connection = connections.find((c: any) => c.platform === platform.id);
                const isConnected = !!connection?.isActive;
                return (
                  <div
                    key={platform.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isConnected
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-white/[0.02] border-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5">
                          <platform.Logo size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{platform.name}</p>
                          {isConnected && connection?.accountHandle && (
                            <p className="text-[11px] text-muted-foreground">@{connection.accountHandle}</p>
                          )}
                        </div>
                      </div>
                      {isConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="mt-3">
                      <Link href="/connections">
                        <Button
                          variant={isConnected ? "ghost" : "outline"}
                          size="sm"
                          className="w-full rounded-lg text-xs h-8"
                        >
                          {isConnected ? "Manage" : "Connect"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* AI MODELS TAB */}
        <TabsContent value="models" className="space-y-6">
          <AIModelsSettings />
        </TabsContent>

        {/* API STATUS TAB */}
        <TabsContent value="api" className="space-y-6">
          <Card className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">API Health</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Status of external services used by the platform
                </p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-lg text-xs gap-1.5" onClick={checkApiStatus}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {apiStatuses.map((api) => (
                <div
                  key={api.key}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    api.status === "connected"
                      ? "bg-green-500/5 border-green-500/10"
                      : api.status === "error"
                      ? "bg-red-500/5 border-red-500/10"
                      : "bg-white/[0.02] border-white/[0.05]"
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <api.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{api.name}</p>
                      {api.status === "connected" && (
                        <Badge className="rounded-md text-[10px] bg-green-500/10 border-green-500/20 text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                        </Badge>
                      )}
                      {api.status === "error" && (
                        <Badge className="rounded-md text-[10px] bg-red-500/10 border-red-500/20 text-red-400">
                          <XCircle className="h-3 w-3 mr-1" />Not Configured
                        </Badge>
                      )}
                      {api.status === "unknown" && (
                        <Badge className="rounded-md text-[10px] bg-yellow-500/10 border-yellow-500/20 text-yellow-400">
                          <AlertTriangle className="h-3 w-3 mr-1" />Checking
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{api.description}</p>
                    <p className="text-[11px] mt-1">
                      {api.status === "connected" ? (
                        <span className="text-green-400/80">{api.message}</span>
                      ) : api.status === "error" ? (
                        <span className="text-red-400/80">{api.message}</span>
                      ) : (
                        <span className="text-muted-foreground">{api.message}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-yellow-400">Free Tier Limitations</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Apify free tier has an 8192MB memory cap. Gemini free tier has daily request limits.
                    If you see errors, wait for quotas to reset or upgrade your plans.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* DATA TAB */}
        <TabsContent value="data" className="space-y-6">
          <Card className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">Data Management</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <FileDown className="h-4 w-4 text-purple-400" />
                  <p className="text-sm font-medium">Export Data</p>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Download a complete backup of all your data (configs, competitors, videos, scripts, etc.)
                </p>
                <Button onClick={handleExport} size="sm" className="rounded-xl text-xs bg-gradient-to-r from-purple-500 to-indigo-600 border-0">
                  <FileDown className="h-3.5 w-3.5 mr-1.5" /> Export Backup
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <FileUp className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-medium">Import Data</p>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Restore from a previously exported backup file
                </p>
                <label className="cursor-pointer">
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  <Button size="sm" className="rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-teal-600 border-0" asChild>
                    <span><FileUp className="h-3.5 w-3.5 mr-1.5" /> Import Backup</span>
                  </Button>
                </label>
              </div>
            </div>
          </Card>

          <Card className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">Data Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Competitors", value: creators.length, icon: Users },
                { label: "Configs", value: configs.length, icon: Shield },
                { label: "Videos", value: "View in Videos", icon: Database, link: "/videos" },
                { label: "Scripts", value: "View in Scripts", icon: Database, link: "/scripts" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                  <item.icon className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-lg font-bold">{typeof item.value === "number" ? item.value : "—"}</p>
                  {item.link ? (
                    <Link href={item.link} className="text-[10px] text-purple-400 hover:text-purple-300">
                      {item.label} →
                    </Link>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}