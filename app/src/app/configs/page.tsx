"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Settings2, Sparkles, Search, Users, Film, Mic, Ban, BookOpen, Shield, Target, CheckCircle2, ChevronDown, ChevronUp, Quote, AlertCircle, Gauge, Wand2 } from "lucide-react";
import type { Config, Creator, Video, BrandVoice, Strategy } from "@/lib/types";

/* ─────────── Brand Profile empty state ─────────── */
const emptyConfig = {
  configName: "",
  creatorsCategory: "",
  analysisInstruction: "",
  newConceptsInstruction: "",
};

/* ─────────── Divido template ─────────── */
const DIVIDO_TEMPLATE = {
  brandName: "Divido",
  principles: `1. We are a regulated platform first. FRA regulation is not a footnote. It is our opening credential.\n2. The numbers carry the argument. Every claim requires a specific number, regulatory reference, or verifiable fact.\n3. The founding story is a proof of concept. Nadeem Al Rabey rebuilt from a collapsed venture — that story is the clearest evidence we have that the team understands what it costs to build something real in this region.`,
  communicationFramework: `The P.R.I.D.E. System:\n\nP — Precise: Every claim requires a specific number, date, or regulatory reference. No vague superlatives.\nR — Regulated: FRA regulatory credential appears on the first page of every document without exception.\nI — Investable: Every document answers three questions — What am I getting? When do I get it? How do I get out?\nD — Direct: Every document ends with one specific, unambiguous ask. Not a list of next steps. One ask.\nE — Earned Trust: The founding story is proof of competence. Deploy it where investors evaluate team quality.`,
  bannedWords: `Disrupting / disruption, Game-changing, Democratising investment, Excited to announce, World-class, We believe / We feel, Passive voice constructions`,
  registerRules: `Institutional Register: Lead with FRA credential and asset fundamentals. Zero founder story unless asked. All numbers, all documentation.\n\nHigh-Net-Worth Register: Balance regulation with accessibility. Use founding story to build personal trust. Make the product feel attainable without simplifying it.\n\nStrategic Partner Register: Lead with market thesis. Show commercial logic before product details. Founder story is relevant as proof of execution.`,
  voiceDescription: `Divido occupies a specific position: a regulated institutional-grade platform with an unfiltered founder story. The tone must hold both simultaneously. We are serious without being sterile. Personal without being casual. Confident without being arrogant.\n\nWords we use: FRA-regulated, fractional ownership, rental yield, quarterly valuation, Grade A assets, secondary market, Egypt housing deficit, institutional access, exit liquidity, verified returns, earned confidence (We have built. We have deployed. We have navigated.)\n\nThe Invisible CTA: We do not pitch Divido at the end of documents. We build the case throughout so that by the time the reader reaches the ask, the conclusion feels like their own.`,
};

/* ─────────── Sub-components ─────────── */

function Section({ icon, title, content, color }: { icon: React.ReactNode; title: string; content: string; color: string }) {
  if (!content) return null;
  return (
    <div>
      <p className={`text-[10px] font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${color}`}>
        {icon}
        {title}
      </p>
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
        <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function VoiceScore({ voice }: { voice: BrandVoice }) {
  const checks = [
    { label: "Principles", filled: !!voice.principles, weight: 20 },
    { label: "Framework", filled: !!voice.communicationFramework, weight: 20 },
    { label: "Banned Words", filled: !!voice.bannedWords, weight: 15 },
    { label: "Register Rules", filled: !!voice.registerRules, weight: 15 },
    { label: "Voice Description", filled: !!voice.voiceDescription, weight: 20 },
    { label: "Linked Strategy", filled: !!voice.strategyId, weight: 10 },
  ];
  const score = checks.reduce((acc, c) => acc + (c.filled ? c.weight : 0), 0);
  const health = score >= 80 ? { label: "Strong", color: "text-emerald-400", bar: "bg-emerald-400" }
    : score >= 60 ? { label: "Good", color: "text-yellow-400", bar: "bg-yellow-400" }
    : score >= 40 ? { label: "Developing", color: "text-orange-400", bar: "bg-orange-400" }
    : { label: "Incomplete", color: "text-red-400", bar: "bg-red-400" };

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">Voice Analyzer</span>
        </div>
        <span className={`text-[10px] font-semibold ${health.color}`}>{health.label} — {score}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div className={`h-full rounded-full ${health.bar} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${c.filled ? "bg-emerald-400" : "bg-white/20"}`} />
            <span className="text-[10px] text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoicePreview({ voice }: { voice: BrandVoice }) {
  const sample = useMemo(() => {
    const brand = voice.brandName || "Your Brand";
    const pillar = voice.principles?.split("\n")[0]?.replace(/^\d+\.\s*/, "").slice(0, 60) || "building trust through transparency";
    const tone = voice.voiceDescription?.toLowerCase().includes("founder") ? "founder-led, unfiltered" : "confident and clear";
    return `${brand} does not do generic marketing.\n\nWe built this for one reason: ${pillar}.\n\nIf you are tired of the same hype-driven content, this is for you. No fluff. No borrowed authority. Just the work, the numbers, and what we learned building in public.\n\nThat is the ${brand} way.`;
  }, [voice]);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Quote className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider">Voice Preview</span>
      </div>
      <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed italic">
        {sample}
      </p>
    </div>
  );
}



/* ─────────── Main page ─────────── */
export default function ConfigsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "voice">("profile");

  /* Brand Profile state */
  const [configs, setConfigs] = useState<Config[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [configForm, setConfigForm] = useState(emptyConfig);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);

  /* Brand Voice state */
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<BrandVoice | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<BrandVoice | null>(null);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);

  const emptyVoiceForm = {
    brandName: "",
    strategyId: "",
    principles: "",
    communicationFramework: "",
    bannedWords: "",
    registerRules: "",
    voiceDescription: "",
  };
  const [voiceForm, setVoiceForm] = useState(emptyVoiceForm);

  /* Load data */
  const loadData = () => {
    fetch("/api/configs").then((r) => r.json()).then(setConfigs);
    fetch("/api/creators").then((r) => r.json()).then(setCreators);
    fetch("/api/videos").then((r) => r.json()).then(setVideos);
    fetch("/api/brand-voices").then((r) => r.json()).then(setVoices);
    fetch("/api/strategies").then((r) => r.json()).then(setStrategies);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ─── Brand Profile handlers ─── */
  const openNewConfig = () => {
    setEditingConfig(null);
    setConfigForm(emptyConfig);
    setConfigDialogOpen(true);
  };

  const openEditConfig = (config: Config) => {
    setEditingConfig(config);
    setConfigForm({
      configName: config.configName,
      creatorsCategory: config.creatorsCategory,
      analysisInstruction: config.analysisInstruction,
      newConceptsInstruction: config.newConceptsInstruction,
    });
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (editingConfig) {
      await fetch("/api/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingConfig.id, ...configForm }),
      });
    } else {
      await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
    }
    setConfigDialogOpen(false);
    loadData();
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Delete this brand profile?")) return;
    await fetch(`/api/configs?id=${id}`, { method: "DELETE" });
    loadData();
  };

  /* ─── Brand Voice handlers ─── */
  const openNewVoice = () => {
    setEditingVoice(null);
    setVoiceForm(emptyVoiceForm);
    setVoiceDialogOpen(true);
  };

  const openEditVoice = (voice: BrandVoice) => {
    setEditingVoice(voice);
    setVoiceForm({
      brandName: voice.brandName,
      strategyId: voice.strategyId,
      principles: voice.principles,
      communicationFramework: voice.communicationFramework,
      bannedWords: voice.bannedWords,
      registerRules: voice.registerRules,
      voiceDescription: voice.voiceDescription,
    });
    setVoiceDialogOpen(true);
  };

  const loadDividoTemplate = () => {
    setVoiceForm((prev) => ({ ...prev, ...DIVIDO_TEMPLATE }));
  };

  const handleSaveVoice = async () => {
    if (editingVoice) {
      await fetch("/api/brand-voices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingVoice.id, ...voiceForm }),
      });
    } else {
      await fetch("/api/brand-voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voiceForm),
      });
    }
    setVoiceDialogOpen(false);
    loadData();
  };

  const handleDeleteVoice = async (id: string) => {
    if (!confirm("Delete this brand voice?")) return;
    await fetch(`/api/brand-voices?id=${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">Identity</p>
        <h1 className="text-3xl font-bold tracking-tight">My Brand</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your brand profiles and voice so AI generates content that sounds like you.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] pressable ${
            activeTab === "profile"
              ? "bg-white/10 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Brand Profile
          </span>
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] pressable ${
            activeTab === "voice"
              ? "bg-white/10 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            Brand Voice
          </span>
        </button>
      </div>

      {/* ─────────────── BRAND PROFILE TAB ─────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-8">
          <div className="flex items-end justify-between">
            <p className="text-sm text-muted-foreground">
              Tell AI about your brand so it can make videos that sound like you.
            </p>
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewConfig} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
                  <Plus className="h-4 w-4" />
                  New Brand Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
                <DialogHeader>
                  <DialogTitle>{editingConfig ? "Edit Brand Profile" : "New Brand Profile"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Profile Name</Label>
                    <Input
                      value={configForm.configName}
                      onChange={(e) => setConfigForm({ ...configForm, configName: e.target.value })}
                      placeholder="e.g. My Real Estate Brand"
                      className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Competitor Group</Label>
                    <Input
                      value={configForm.creatorsCategory}
                      onChange={(e) => setConfigForm({ ...configForm, creatorsCategory: e.target.value })}
                      placeholder="e.g. dubai-real-estate"
                      className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Type the same group name you used for your competitors.</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Search className="h-3 w-3 text-purple-400" />
                      How to Analyze Videos
                    </Label>
                    <Textarea
                      value={configForm.analysisInstruction}
                      onChange={(e) => setConfigForm({ ...configForm, analysisInstruction: e.target.value })}
                      placeholder="Tell AI what to look for in competitor videos (hook, script, why it works...)"
                      rows={10}
                      className="mt-1.5 rounded-xl glass border-white/[0.08] font-mono text-xs leading-relaxed"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-indigo-400" />
                      How to Write Your Videos
                    </Label>
                    <Textarea
                      value={configForm.newConceptsInstruction}
                      onChange={(e) => setConfigForm({ ...configForm, newConceptsInstruction: e.target.value })}
                      placeholder="Tell AI about your brand, your style, and what kind of videos you want back..."
                      rows={10}
                      className="mt-1.5 rounded-xl glass border-white/[0.08] font-mono text-xs leading-relaxed"
                    />
                  </div>
                  <Button
                    onClick={handleSaveConfig}
                    className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 pressable"
                  >
                    {editingConfig ? "Save Changes" : "Create Profile"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Config Cards */}
          <div className="grid gap-4 stagger-children">
            {configs.map((config) => {
              const creatorCount = creators.filter((c) => c.category === config.creatorsCategory).length;
              const videoCount = videos.filter((v) => v.configName === config.configName).length;
              const isExpanded = expandedConfigId === config.id;

              return (
                <div key={config.id} className="bezel glass-hover">
                  <div className="bezel-inner p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
                          <Settings2 className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{config.configName}</h3>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]">
                              {config.creatorsCategory}
                            </Badge>
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {creatorCount}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Film className="h-3 w-3" />
                              {videoCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedConfigId(isExpanded ? null : config.id)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable"
                          title="Quick Preview"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditConfig(config)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfig(config.id)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-400 pressable"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick Preview */}
                    <div className={`mt-4 grid gap-3 md:grid-cols-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? "opacity-100 max-h-[500px]" : "opacity-100 max-h-24 overflow-hidden"}`}>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                        <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Search className="h-3 w-3" />
                          Video Analysis
                        </p>
                        <p className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}>
                          {config.analysisInstruction}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                        <p className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Your Video Style
                        </p>
                        <p className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}>
                          {config.newConceptsInstruction}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {configs.length === 0 && (
              <div className="bezel">
                <div className="bezel-inner p-12 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                    <Settings2 className="h-6 w-6 text-purple-400/60" />
                  </div>
                  <h3 className="text-sm font-semibold">No brand profiles yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                    Create one so AI knows how to write videos for you. Define analysis rules and your creative style.
                  </p>
                  <Button
                    onClick={openNewConfig}
                    className="mt-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable"
                  >
                    <Plus className="h-4 w-4" />
                    Create Brand Profile
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────── BRAND VOICE TAB ─────────────── */}
      {activeTab === "voice" && (
        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <p className="text-sm text-muted-foreground">
              Define how your brand speaks. AI uses this to generate scripts that sound like you, not generic marketing.
            </p>
            <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewVoice} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
                  <Plus className="h-4 w-4" />
                  New Brand Voice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
                <DialogHeader>
                  <DialogTitle>{editingVoice ? "Edit Brand Voice" : "Create Brand Voice"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                  {!editingVoice && (
                    <Button onClick={loadDividoTemplate} variant="outline" className="w-full rounded-xl border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1.5 pressable">
                      <BookOpen className="h-4 w-4" />
                      Load Divido P.R.I.D.E. Template
                    </Button>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Brand Name</Label>
                    <Input value={voiceForm.brandName} onChange={(e) => setVoiceForm({ ...voiceForm, brandName: e.target.value })} placeholder="e.g. Divido" className="mt-1.5 rounded-xl glass border-white/[0.08] h-11" />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Link to Strategy</Label>
                    <Select value={voiceForm.strategyId} onValueChange={(v) => setVoiceForm({ ...voiceForm, strategyId: v })}>
                      <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                        <SelectValue placeholder="Select a strategy..." />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.strategyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-purple-400" />
                      Core Principles
                    </Label>
                    <Textarea value={voiceForm.principles} onChange={(e) => setVoiceForm({ ...voiceForm, principles: e.target.value })} placeholder="What does your brand believe? What are the non-negotiables?" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={5} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-indigo-400" />
                      Communication Framework
                    </Label>
                    <Textarea value={voiceForm.communicationFramework} onChange={(e) => setVoiceForm({ ...voiceForm, communicationFramework: e.target.value })} placeholder="How do you structure communications? Any frameworks you follow?" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={6} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Ban className="h-3 w-3 text-red-400" />
                      Banned Words / Phrases
                    </Label>
                    <Textarea value={voiceForm.bannedWords} onChange={(e) => setVoiceForm({ ...voiceForm, bannedWords: e.target.value })} placeholder="What words does your brand NEVER use?" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={3} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Register Rules (audience-specific tone)</Label>
                    <Textarea value={voiceForm.registerRules} onChange={(e) => setVoiceForm({ ...voiceForm, registerRules: e.target.value })} placeholder="How does tone shift for different audiences?" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={4} />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mic className="h-3 w-3 text-emerald-400" />
                      Voice Description
                    </Label>
                    <Textarea value={voiceForm.voiceDescription} onChange={(e) => setVoiceForm({ ...voiceForm, voiceDescription: e.target.value })} placeholder="Describe your brand's personality in detail. What do you sound like?" className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs" rows={6} />
                  </div>

                  <Button onClick={handleSaveVoice} disabled={!voiceForm.brandName} className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 pressable">
                    {editingVoice ? "Save Brand Voice" : "Create Brand Voice"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Brand Voice Cards */}
          <div className="grid gap-4 stagger-children">
            {voices.map((voice) => {
              const linkedStrategy = strategies.find((s) => s.id === voice.strategyId);
              const isPreviewOpen = previewVoiceId === voice.id;
              return (
                <div key={voice.id} className="bezel glass-hover">
                  <div className="bezel-inner p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
                          <Mic className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{voice.brandName}</h3>
                          {linkedStrategy && (
                            <p className="text-xs text-muted-foreground mt-0.5">Linked to: {linkedStrategy.strategyName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewVoiceId(isPreviewOpen ? null : voice.id)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable" title="Preview">
                          {isPreviewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedVoice(voice)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable" title="View">
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditVoice(voice)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVoice(voice.id)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-400 pressable">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Voice Analyzer & Preview */}
                    <div className={`mt-4 grid gap-3 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isPreviewOpen ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
                      <VoiceScore voice={voice} />
                      {isPreviewOpen && <VoicePreview voice={voice} />}
                    </div>

                    {voice.principles && (
                      <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                        <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1">Core Principles</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{voice.principles}</p>
                      </div>
                    )}

                    {voice.bannedWords && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {voice.bannedWords.split(",").slice(0, 5).map((word) => (
                          <Badge key={word} variant="secondary" className="rounded-md text-[10px] bg-red-500/10 border border-red-500/20 text-red-300">
                            {word.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {voices.length === 0 && (
              <div className="bezel">
                <div className="bezel-inner p-12 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                    <Mic className="h-6 w-6 text-purple-400/60" />
                  </div>
                  <h3 className="text-sm font-semibold">No brand voice yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                    Create one so AI generates scripts that sound like your brand, not generic marketing.
                  </p>
                  <Button onClick={openNewVoice} className="mt-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable">
                    <Plus className="h-4 w-4" />
                    Create Brand Voice
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* View Detail Modal */}
          <Dialog open={!!selectedVoice} onOpenChange={(open) => { if (!open) setSelectedVoice(null); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
              {selectedVoice && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-muted-foreground">Brand Voice</span>
                    </div>
                    <DialogTitle className="text-lg mt-1">{selectedVoice.brandName}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-5 pt-2">
                    <VoiceScore voice={selectedVoice} />
                    <VoicePreview voice={selectedVoice} />
                    <Section icon={<Shield className="h-3 w-3" />} title="Core Principles" content={selectedVoice.principles} color="text-purple-400" />
                    <Section icon={<Target className="h-3 w-3" />} title="Communication Framework" content={selectedVoice.communicationFramework} color="text-indigo-400" />
                    <Section icon={<Ban className="h-3 w-3" />} title="Banned Words" content={selectedVoice.bannedWords} color="text-red-400" />
                    <Section icon={<BookOpen className="h-3 w-3" />} title="Register Rules" content={selectedVoice.registerRules} color="text-yellow-400" />
                    <Section icon={<Mic className="h-3 w-3" />} title="Voice Description" content={selectedVoice.voiceDescription} color="text-emerald-400" />
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
