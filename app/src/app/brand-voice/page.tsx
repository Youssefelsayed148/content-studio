"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type { BrandVoice, Strategy } from "@/lib/types";
import {
  Mic,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Ban,
  Target,
  FileText,
  Sparkles,
  Volume2,
} from "lucide-react";

export default function BrandVoicePage() {
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const emptyForm = {
    strategyId: "",
    brandName: "",
    voiceDescription: "",
    principles: "",
    communicationFramework: "",
    bannedWords: "",
    registerRules: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<BrandVoice | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/brand-voices").then((r) => r.json()),
      fetch("/api/strategies").then((r) => r.json()),
    ]).then(([v, s]) => {
      setVoices(v);
      setStrategies(s);
      setLoading(false);
      if (v.length > 0) {
        selectVoice(v[0]);
      }
    });
  }, []);

  const selectVoice = (voice: BrandVoice) => {
    setSelectedVoice(voice);
    setEditingId(voice.id);
    setForm({
      strategyId: voice.strategyId,
      brandName: voice.brandName,
      voiceDescription: voice.voiceDescription,
      principles: voice.principles,
      communicationFramework: voice.communicationFramework,
      bannedWords: voice.bannedWords,
      registerRules: voice.registerRules,
    });
  };

  const handleNew = () => {
    setEditingId(null);
    setSelectedVoice(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.brandName.trim()) {
      setSaveResult({ success: false, message: "Brand name is required" });
      return;
    }
    setSaving(true);
    setSaveResult(null);
    try {
      if (editingId) {
        await fetch("/api/brand-voices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        const res = await fetch("/api/brand-voices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const newVoice = await res.json();
        setEditingId(newVoice.id);
        setSelectedVoice(newVoice);
      }
      const updated = await fetch("/api/brand-voices").then((r) => r.json());
      setVoices(updated);
      setSaveResult({ success: true, message: "Brand voice saved" });
      setTimeout(() => setSaveResult(null), 3000);
    } catch {
      setSaveResult({ success: false, message: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand voice?")) return;
    await fetch(`/api/brand-voices?id=${id}`, { method: "DELETE" });
    const updated = await fetch("/api/brand-voices").then((r) => r.json());
    setVoices(updated);
    if (selectedVoice?.id === id) {
      if (updated.length > 0) selectVoice(updated[0]);
      else { setSelectedVoice(null); setEditingId(null); setForm(emptyForm); }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  const getStrategyName = (strategyId: string) =>
    strategies.find((s) => s.id === strategyId)?.strategyName || "Not linked";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">Brand</p>
          <h1 className="text-3xl font-bold tracking-tight">Brand Voice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define how your brand sounds — the AI uses this to generate on-brand scripts and content
          </p>
        </div>
        <div className="flex items-center gap-2">
          {voices.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleNew} className="rounded-xl text-xs gap-1.5 h-9 border-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              New Brand Voice
            </Button>
          )}
        </div>
      </div>

      {/* Save Result */}
      {saveResult && (
        <div className={`p-3 rounded-xl border flex items-center gap-2 ${
          saveResult.success ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {saveResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span className="text-sm">{saveResult.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Voice List */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Saved Voices ({voices.length})
          </p>
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => selectVoice(voice)}
              className={`w-full text-left glass rounded-xl p-3 transition-all duration-200 cursor-pointer border ${
                selectedVoice?.id === voice.id
                  ? "border-purple-500/30 bg-purple-500/10"
                  : "border-white/[0.05] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold truncate">{voice.brandName || "Untitled"}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(voice.id); }}
                  className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{getStrategyName(voice.strategyId)}</p>
            </button>
          ))}
          {voices.length === 0 && (
            <div className="text-center py-8 rounded-xl border border-dashed border-white/[0.06]">
              <Mic className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No brand voices yet</p>
            </div>
          )}
        </div>

        {/* Main Form */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="glass rounded-2xl p-6 border-white/10">
            <div className="flex items-center gap-2 mb-5">
              <Mic className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold">
                {editingId ? "Edit Brand Voice" : "Create Brand Voice"}
              </h2>
            </div>

            <div className="space-y-5">
              {/* Brand Name & Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Brand Name</Label>
                  <Input
                    value={form.brandName}
                    onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                    placeholder="e.g. Divido"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Linked Strategy</Label>
                  <Select value={form.strategyId} onValueChange={(v) => setForm({ ...form, strategyId: v })}>
                    <SelectTrigger className="mt-1.5 rounded-xl glass border-white/[0.08] h-11">
                      <SelectValue placeholder="Select a strategy..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {strategies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.strategyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Voice Description */}
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3" />
                  Voice Description
                </Label>
                <Textarea
                  value={form.voiceDescription}
                  onChange={(e) => setForm({ ...form, voiceDescription: e.target.value })}
                  placeholder="e.g. Egyptian Arabic, transparent founder-led, no hype, data-driven, calm authority. Speaks directly to young Egyptians who want to build wealth but feel the system is rigged against them."
                  className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs min-h-[80px]"
                  rows={4}
                />
              </div>

              {/* Principles */}
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" />
                  Brand Principles
                </Label>
                <Textarea
                  value={form.principles}
                  onChange={(e) => setForm({ ...form, principles: e.target.value })}
                  placeholder="e.g. 1. Honest about risk — never overpromise returns&#10;2. Founder voice — first-person, personal stories&#10;3. Category creation — frame fractional real estate as the new normal&#10;4. Educational — explain complex concepts simply"
                  className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs min-h-[80px]"
                  rows={5}
                />
              </div>

              {/* Communication Framework */}
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Target className="h-3 w-3" />
                  Communication Framework
                </Label>
                <Textarea
                  value={form.communicationFramework}
                  onChange={(e) => setForm({ ...form, communicationFramework: e.target.value })}
                  placeholder="e.g. Problem → Inside Knowledge → Solution → CTA&#10;Or: Hook → Story → Insight → Call to Action"
                  className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs min-h-[60px]"
                  rows={3}
                />
              </div>

              {/* Two column: Banned Words & Register Rules */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Ban className="h-3 w-3" />
                    Banned Words / Topics
                  </Label>
                  <Textarea
                    value={form.bannedWords}
                    onChange={(e) => setForm({ ...form, bannedWords: e.target.value })}
                    placeholder="e.g. &#10;- 'Get rich quick'&#10;- 'Guaranteed returns'&#10;- 'No risk'&#10;- Hype words like 'revolutionary'&#10;- Competitor names (Fabo, Stake)"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs min-h-[100px]"
                    rows={6}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Register / Tone Rules
                  </Label>
                  <Textarea
                    value={form.registerRules}
                    onChange={(e) => setForm({ ...form, registerRules: e.target.value })}
                    placeholder="e.g. &#10;- Short sentences. 15-20 words max.&#10;- No jargon unless explained&#10;- Egyptian Arabic for consumer, English for LinkedIn&#10;- Use metaphors from everyday Egyptian life&#10;- Numbers and data preferred over adjectives"
                    className="mt-1.5 rounded-xl glass border-white/[0.08] text-xs min-h-[100px]"
                    rows={6}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !form.brandName.trim()}
            className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-2 text-sm"
          >
            {saving ? (
              <><RefreshCw className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />{editingId ? "Save Brand Voice" : "Create Brand Voice"}</>
            )}
          </Button>

          {/* Help text */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
            <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">How this works</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The brand voice is used by AI when generating scripts from viral ideas. 
              It ensures every piece of content sounds like your brand, not like the competitor you analyzed.
              Link it to a Content Strategy to connect everything together.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}