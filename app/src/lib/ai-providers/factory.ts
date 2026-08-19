/**
 * AI Provider Factory
 * Returns the correct provider instance based on user settings and task type.
 */

import {
  type AIProvider,
  type AIProviderType,
  type AITaskType,
  type AIUserSettings,
  DEFAULT_AI_SETTINGS,
  PROVIDER_METADATA,
} from "./types";
import { GeminiProvider } from "./gemini-provider";
import { ClaudeProvider } from "./claude-provider";
import { OpenAIProvider } from "./openai-provider";
import { OpenRouterProvider } from "./openrouter-provider";
import { OpencodeProvider } from "./opencode-provider";
import { readApiKeys } from "../csv";

/**
 * Get the appropriate AI provider for a given task.
 * Reads user settings and API keys from CSV storage.
 */
export async function getProviderForTask(
  task: AITaskType,
  settings?: AIUserSettings
): Promise<AIProvider> {
  const resolvedSettings = settings || (await loadUserSettings());
  const providerType =
    task === "video-analysis"
      ? resolvedSettings.videoAnalysisProvider
      : resolvedSettings.scriptProvider;
  const model =
    task === "video-analysis"
      ? resolvedSettings.videoAnalysisModel
      : resolvedSettings.scriptModel;

  const apiKey = await getApiKeyForProvider(providerType);
  if (!apiKey) {
    const meta = PROVIDER_METADATA[providerType];
    throw new Error(
      `${meta.displayName} API key not configured. Add your key in Settings > AI Model Selection.`
    );
  }

  return createProvider(providerType, apiKey, model);
}

/**
 * Create a provider instance directly (for testing or when you already have the key).
 */
export function createProvider(
  providerType: AIProviderType,
  apiKey: string,
  model: string
): AIProvider {
  switch (providerType) {
    case "gemini":
      return new GeminiProvider(model);
    case "anthropic":
      return new ClaudeProvider(apiKey, model);
    case "openai":
      return new OpenAIProvider(apiKey, model);
    case "openrouter":
      return new OpenRouterProvider(apiKey, model);
    case "opencode":
      return new OpencodeProvider(apiKey, model);
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

/**
 * Get API key for a provider from user storage or env fallback.
 */
export async function getApiKeyForProvider(
  provider: AIProviderType
): Promise<string | undefined> {
  const keys = readApiKeys();

  // Map provider to service name in api_keys.csv
  const serviceMap: Record<AIProviderType, string> = {
    gemini: "gemini",
    anthropic: "anthropic",
    openai: "openai",
    openrouter: "openrouter",
    opencode: "opencode",
  };

  const service = serviceMap[provider];
  const userKey = keys.find((k) => k.service === service && k.isValid)?.keyValue;
  if (userKey) return userKey;

  // Fall back to environment variables
  const envMap: Record<AIProviderType, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    opencode: process.env.OPENCODE_API_KEY,
  };

  return envMap[provider];
}

/**
 * Validate an API key for a specific provider.
 */
export async function validateProviderKey(
  provider: AIProviderType,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case "gemini": {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { valid: false, error: data.error?.message || `HTTP ${response.status}` };
        }
        return { valid: true };
      }
      case "anthropic": {
        const response = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { valid: false, error: data.error?.message || `HTTP ${response.status}` };
        }
        return { valid: true };
      }
      case "openai": {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { valid: false, error: data.error?.message || `HTTP ${response.status}` };
        }
        return { valid: true };
      }
      case "openrouter": {
        const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { valid: false, error: data.error?.message || `HTTP ${response.status}` };
        }
        return { valid: true };
      }
      case "opencode": {
        // opencode-go is OpenAI-compatible, so /models is the standard auth probe.
        // Only treat an explicit auth rejection (401/403) as an invalid key — if the
        // endpoint doesn't expose /models or the network hiccups, fail open and let
        // generateScript() surface the real error at call time rather than blocking
        // the user from saving a key that may well be fine.
        const base = (process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/go/v1")
          .replace(/\/chat\/completions\/?$/, "");
        try {
          const response = await fetch(`${base}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (response.status === 401 || response.status === 403) {
            return { valid: false, error: `Authentication failed (HTTP ${response.status})` };
          }
          return { valid: true };
        } catch {
          return { valid: true };
        }
      }
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Load user AI settings from CSV.
 */
export async function loadUserSettings(): Promise<AIUserSettings> {
  const { readAiSettings } = await import("../csv");
  const settings = readAiSettings();
  return settings || DEFAULT_AI_SETTINGS;
}

/**
 * Save user AI settings to CSV.
 */
export async function saveUserSettings(settings: AIUserSettings): Promise<void> {
  const { writeAiSettings } = await import("../csv");
  writeAiSettings(settings);
}
