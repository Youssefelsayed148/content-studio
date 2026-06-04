/**
 * AI Provider Architecture
 * Fortune 500-quality abstraction for multi-provider AI model selection
 */

export type AIProviderType = "gemini" | "anthropic" | "openai" | "openrouter";

export type AITaskType = "video-analysis" | "script-generation";

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProviderType;
  description: string;
  supportsVideo: boolean;
  maxTokens: number;
}

export interface ProviderConfig {
  provider: AIProviderType;
  model: string;
  apiKey: string;
}

export interface AIProvider {
  readonly providerType: AIProviderType;
  readonly displayName: string;

  /**
   * Analyze a video and return structured analysis text.
   * For providers that don't support native video, this may extract frames.
   */
  analyzeVideo(
    videoBuffer: Buffer,
    mimeType: string,
    analysisPrompt: string
  ): Promise<string>;

  /**
   * Generate adapted script concepts from a video analysis.
   */
  generateScript(
    videoAnalysis: string,
    instructions: string,
    brandVoice?: string
  ): Promise<string>;
}

// Model catalog — single source of truth for available models
export const MODEL_CATALOG: ModelOption[] = [
  // Gemini (Google) — best for video analysis
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    description: "Fastest multimodal model. Best for video analysis.",
    supportsVideo: true,
    maxTokens: 8192,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "gemini",
    description: "Highest quality multimodal model. Best for complex video analysis.",
    supportsVideo: true,
    maxTokens: 8192,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "gemini",
    description: "Fast multimodal model. Good balance of speed and quality.",
    supportsVideo: true,
    maxTokens: 8192,
  },

  // Anthropic (Claude) — best for script generation
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    description: "Balanced speed and quality. Excellent for script writing.",
    supportsVideo: false,
    maxTokens: 8192,
  },
  {
    id: "claude-opus-4-1-20250819",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    description: "Highest reasoning quality. Best for complex script adaptation.",
    supportsVideo: false,
    maxTokens: 128000,
  },
  {
    id: "claude-haiku-3-5-20241022",
    name: "Claude Haiku 3.5",
    provider: "anthropic",
    description: "Fastest Claude model. Good for quick draft generation.",
    supportsVideo: false,
    maxTokens: 4096,
  },

  // OpenAI
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "OpenAI's flagship model. Strong at creative writing.",
    supportsVideo: false,
    maxTokens: 4096,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    description: "Reliable and well-tested. Good for structured script output.",
    supportsVideo: false,
    maxTokens: 4096,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    description: "Fast and cost-effective. Good for simple script drafts.",
    supportsVideo: false,
    maxTokens: 4096,
  },

  // OpenRouter — unified gateway
  {
    id: "openrouter-auto",
    name: "OpenRouter (Auto)",
    provider: "openrouter",
    description: "Automatically routes to the best available model via OpenRouter.",
    supportsVideo: false,
    maxTokens: 4096,
  },
  {
    id: "openrouter-claude-sonnet",
    name: "OpenRouter → Claude Sonnet",
    provider: "openrouter",
    description: "Claude Sonnet via OpenRouter gateway.",
    supportsVideo: false,
    maxTokens: 8192,
  },
  {
    id: "openrouter-gpt-4o",
    name: "OpenRouter → GPT-4o",
    provider: "openrouter",
    description: "GPT-4o via OpenRouter gateway.",
    supportsVideo: false,
    maxTokens: 4096,
  },
];

export function getModelsForProvider(provider: AIProviderType): ModelOption[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

export function getDefaultModel(provider: AIProviderType, task: AITaskType): string {
  const models = getModelsForProvider(provider);
  if (task === "video-analysis") {
    // Prefer video-capable models
    const videoModel = models.find((m) => m.supportsVideo);
    return videoModel?.id || models[0]?.id || "";
  }
  // For script generation, default to first available
  return models[0]?.id || "";
}

export function getModelOption(modelId: string): ModelOption | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId);
}

// User settings for AI providers
export interface AIUserSettings {
  videoAnalysisProvider: AIProviderType;
  videoAnalysisModel: string;
  scriptProvider: AIProviderType;
  scriptModel: string;
}

export const DEFAULT_AI_SETTINGS: AIUserSettings = {
  videoAnalysisProvider: "gemini",
  videoAnalysisModel: "gemini-2.0-flash",
  scriptProvider: "anthropic",
  scriptModel: "claude-sonnet-4-5-20250929",
};

// Provider metadata for UI
export const PROVIDER_METADATA: Record<
  AIProviderType,
  { displayName: string; description: string; website: string; keyName: string }
> = {
  gemini: {
    displayName: "Google Gemini",
    description: "Native video upload support. Best for analyzing competitor Reels.",
    website: "https://ai.google.dev",
    keyName: "Gemini API Key",
  },
  anthropic: {
    displayName: "Anthropic Claude",
    description: "Exceptional writing quality. Best for adapting competitor scripts to your brand voice.",
    website: "https://console.anthropic.com",
    keyName: "Anthropic API Key",
  },
  openai: {
    displayName: "OpenAI",
    description: "GPT-4o and GPT-4 Turbo. Reliable creative writing and script generation.",
    website: "https://platform.openai.com",
    keyName: "OpenAI API Key",
  },
  openrouter: {
    displayName: "OpenRouter",
    description: "Unified API for 200+ models. One key, access to Claude, GPT, Gemini, and more.",
    website: "https://openrouter.ai",
    keyName: "OpenRouter API Key",
  },
};

// Map provider type to the service name used in api_keys.csv
export function providerToService(provider: AIProviderType): string {
  return provider; // Direct mapping: gemini -> gemini, anthropic -> anthropic, etc.
}
