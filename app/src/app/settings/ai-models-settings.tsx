"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Video,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  type AIProviderType,
  type AIUserSettings,
  MODEL_CATALOG,
  PROVIDER_METADATA,
  getModelsForProvider,
  getDefaultModel,
} from "@/lib/ai-providers/types";
import { DEFAULT_AI_SETTINGS } from "@/lib/ai-providers/types";

interface ProviderKeyState {
  value: string;
  show: boolean;
  status: "idle" | "validating" | "valid" | "invalid";
  message: string;
}

export default function AIModelsSettings() {
  const [settings, setSettings] = useState<AIUserSettings>(DEFAULT_AI_SETTINGS);
  const [providerKeys, setProviderKeys] = useState<Record<AIProviderType, ProviderKeyState>>({
    gemini: { value: "", show: false, status: "idle", message: "" },
    anthropic: { value: "", show: false, status: "idle", message: "" },
    openai: { value: "", show: false, status: "idle", message: "" },
    openrouter: { value: "", show: false, status: "idle", message: "" },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings and keys on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, keysRes] = await Promise.all([
        fetch("/api/ai-settings"),
        fetch("/api/keys"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }

      if (keysRes.ok) {
        const data = await keysRes.json();
        const keys: Record<string, { keyValue: string; isValid: boolean }> = {};
        for (const key of data.keys || []) {
          keys[key.service] = { keyValue: key.keyValue, isValid: key.isValid };
        }

        setProviderKeys((prev) => ({
          gemini: {
            ...prev.gemini,
            value: keys.gemini?.keyValue || "",
            status: keys.gemini?.isValid ? "valid" : keys.gemini?.keyValue ? "invalid" : "idle",
            message: keys.gemini?.isValid ? "Key validated" : keys.gemini?.keyValue ? "Invalid key" : "",
          },
          anthropic: {
            ...prev.anthropic,
            value: keys.anthropic?.keyValue || "",
            status: keys.anthropic?.isValid ? "valid" : keys.anthropic?.keyValue ? "invalid" : "idle",
            message: keys.anthropic?.isValid ? "Key validated" : keys.anthropic?.keyValue ? "Invalid key" : "",
          },
          openai: {
            ...prev.openai,
            value: keys.openai?.keyValue || "",
            status: keys.openai?.isValid ? "valid" : keys.openai?.keyValue ? "invalid" : "idle",
            message: keys.openai?.isValid ? "Key validated" : keys.openai?.keyValue ? "Invalid key" : "",
          },
          openrouter: {
            ...prev.openrouter,
            value: keys.openrouter?.keyValue || "",
            status: keys.openrouter?.isValid ? "valid" : keys.openrouter?.keyValue ? "invalid" : "idle",
            message: keys.openrouter?.isValid ? "Key validated" : keys.openrouter?.keyValue ? "Invalid key" : "",
          },
        }));
      }
    } catch (err) {
      console.error("Failed to load AI settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateKey = async (provider: AIProviderType) => {
    const keyState = providerKeys[provider];
    if (!keyState.value.trim()) return;

    setProviderKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], status: "validating", message: "Validating..." },
    }));

    try {
      const response = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: keyState.value }),
      });

      const data = await response.json();

      if (data.valid) {
        setProviderKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: "valid", message: "Key is valid" },
        }));
      } else {
        setProviderKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: "invalid", message: data.error || "Invalid key" },
        }));
      }
    } catch {
      setProviderKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: "invalid", message: "Validation failed" },
      }));
    }
  };

  const saveKey = async (provider: AIProviderType) => {
    const keyState = providerKeys[provider];
    if (!keyState.value.trim()) return;

    setProviderKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], status: "validating", message: "Saving..." },
    }));

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: provider,
          keyValue: keyState.value,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProviderKeys((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            status: data.key.isValid ? "valid" : "invalid",
            message: data.key.isValid ? "Saved and validated" : data.error || "Saved but invalid",
          },
        }));
      } else {
        const data = await response.json();
        setProviderKeys((prev) => ({
          ...prev,
          [provider]: { ...prev[provider], status: "invalid", message: data.error || "Save failed" },
        }));
      }
    } catch {
      setProviderKeys((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: "invalid", message: "Save failed" },
      }));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save AI settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = useCallback(
    (task: "video" | "script", provider: AIProviderType) => {
      setSettings((prev) => {
        const isVideo = task === "video";
        const newSettings = {
          ...prev,
          [isVideo ? "videoAnalysisProvider" : "scriptProvider"]: provider,
          [isVideo ? "videoAnalysisModel" : "scriptModel"]: getDefaultModel(provider, isVideo ? "video-analysis" : "script-generation"),
        };
        return newSettings;
      });
    },
    []
  );

  const updateModel = useCallback((task: "video" | "script", model: string) => {
    setSettings((prev) => ({
      ...prev,
      [task === "video" ? "videoAnalysisModel" : "scriptModel"]: model,
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  const videoModels = getModelsForProvider(settings.videoAnalysisProvider);
  const scriptModels = getModelsForProvider(settings.scriptProvider);

  return (
    <div className="space-y-6">
      {/* AI Model Selection */}
      <Card className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Model Selection</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which AI models power your video analysis and script generation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Analysis */}
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-medium">Video Analysis</h4>
              <Badge className="rounded-md text-[10px] bg-blue-500/10 border-blue-500/20 text-blue-400">
                Analyzes competitor Reels
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Extracts hooks, structure, and winning elements from competitor videos.
              Gemini is recommended — it has native video support.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Provider</label>
                <Select
                  value={settings.videoAnalysisProvider}
                  onValueChange={(v) => updateProvider("video", v as AIProviderType)}
                >
                  <SelectTrigger className="h-9 text-sm bg-white/[0.03] border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">
                      <div className="flex items-center gap-2">
                        <span>Google Gemini</span>
                        <Badge className="text-[9px] bg-green-500/10 text-green-400 border-green-500/20">Best for Video</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Model</label>
                <Select value={settings.videoAnalysisModel} onValueChange={(v) => updateModel("video", v)}>
                  <SelectTrigger className="h-9 text-sm bg-white/[0.03] border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {videoModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span className="text-sm">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Script Generation */}
          <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-medium">Script Generation</h4>
              <Badge className="rounded-md text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-400">
                Adapts competitor scripts
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Takes the video analysis and generates new concepts adapted to your brand voice.
              Claude, OpenAI, and OpenRouter are all excellent choices.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Provider</label>
                <Select
                  value={settings.scriptProvider}
                  onValueChange={(v) => updateProvider("script", v as AIProviderType)}
                >
                  <SelectTrigger className="h-9 text-sm bg-white/[0.03] border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="openai">OpenAI GPT</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter (200+ models)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Model</label>
                <Select value={settings.scriptModel} onValueChange={(v) => updateModel("script", v)}>
                  <SelectTrigger className="h-9 text-sm bg-white/[0.03] border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scriptModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span className="text-sm">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saved && (
              <Badge className="rounded-md text-[10px] bg-green-500/10 border-green-500/20 text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Settings saved
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            className="rounded-lg text-xs gap-1.5 bg-purple-500 hover:bg-purple-600"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Save Model Settings
          </Button>
        </div>
      </Card>

      {/* Provider API Keys */}
      <Card className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Key className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Provider API Keys</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each provider requires its own API key. Add only the ones you plan to use.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {(["gemini", "anthropic", "openai", "openrouter"] as AIProviderType[]).map((provider) => {
            const meta = PROVIDER_METADATA[provider];
            const keyState = providerKeys[provider];
            const isConfigured = keyState.status === "valid";

            return (
              <div
                key={provider}
                className={`p-4 rounded-xl border ${
                  isConfigured
                    ? "bg-green-500/5 border-green-500/10"
                    : "bg-white/[0.02] border-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{meta.displayName}</span>
                    {isConfigured ? (
                      <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                      </Badge>
                    ) : keyState.value ? (
                      <Badge className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Not Validated
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-white/5 text-muted-foreground border-white/10">
                        <XCircle className="h-3 w-3 mr-1" /> Not Configured
                      </Badge>
                    )}
                  </div>
                  <a
                    href={meta.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    Get key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <p className="text-[11px] text-muted-foreground mb-3">{meta.description}</p>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type={keyState.show ? "text" : "password"}
                      value={keyState.value}
                      onChange={(e) =>
                        setProviderKeys((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], value: e.target.value, status: "idle", message: "" },
                        }))
                      }
                      placeholder={`Paste your ${meta.keyName} here`}
                      className="h-9 pl-9 pr-9 text-sm bg-white/[0.03] border-white/[0.08]"
                    />
                    <button
                      onClick={() =>
                        setProviderKeys((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], show: !prev[provider].show },
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {keyState.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs h-9"
                    onClick={() => validateKey(provider)}
                    disabled={!keyState.value.trim() || keyState.status === "validating"}
                  >
                    {keyState.status === "validating" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-lg text-xs h-9 bg-purple-500 hover:bg-purple-600"
                    onClick={() => saveKey(provider)}
                    disabled={!keyState.value.trim()}
                  >
                    Save
                  </Button>
                </div>

                {keyState.message && (
                  <p
                    className={`text-[11px] mt-2 ${
                      keyState.status === "valid"
                        ? "text-green-400"
                        : keyState.status === "invalid"
                        ? "text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {keyState.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
