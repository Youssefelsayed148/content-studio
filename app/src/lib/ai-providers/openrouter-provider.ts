/**
 * OpenRouter Provider
 * Unified API gateway for 200+ models.
 * Routes to Claude, GPT, Gemini, and more via one API key.
 */

import type { AIProvider } from "./types";

export class OpenRouterProvider implements AIProvider {
  readonly providerType = "openrouter" as const;
  readonly displayName = "OpenRouter";
  private model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string = "openrouter-auto") {
    this.apiKey = apiKey;
    // Map friendly IDs to actual OpenRouter model IDs
    this.model = this.mapModelId(model);
  }

  private mapModelId(model: string): string {
    const mapping: Record<string, string> = {
      "openrouter-auto": "openai/gpt-4o",
      "openrouter-claude-sonnet": "anthropic/claude-sonnet-4-20250514",
      "openrouter-gpt-4o": "openai/gpt-4o",
    };
    return mapping[model] || model;
  }

  async analyzeVideo(
    _videoBuffer: Buffer,
    _mimeType: string,
    _analysisPrompt: string
  ): Promise<string> {
    throw new Error(
      "OpenRouter does not support native video analysis. Please use Gemini for video analysis, or select Gemini as your video analysis provider in Settings."
    );
  }

  async generateScript(
    videoAnalysis: string,
    instructions: string,
    brandVoice?: string
  ): Promise<string> {
    const brandVoiceSection = brandVoice
      ? `
# BRAND VOICE (STRICT — ALL OUTPUT MUST FOLLOW THIS)
------
${brandVoice}
------
`
      : "";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://projectdivido.com",
        "X-Title": "Content Studio Virality System",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert in creating viral Instagram Reels. You analyze competitor content and generate adapted concepts for brands. CRITICAL: NEVER mention competitor names, brands, or locations. Always use generic terms like 'our agent', 'our platform', 'Cairo', 'EGP'.",
          },
          {
            role: "user",
            content: `# OBJECTIVE
Take as input a viral video from my competitor and generate new concepts adapted for my brand.

# CRITICAL RULES
- NEVER mention competitor names (Fabo, Ryan Serhant, Marcel Remus, Grant Cardone, etc.)
- NEVER mention competitor brands (Nawy, Stake, SmartCrowd, etc.)
- NEVER mention competitor locations (Dubai, Dubai Marina, Palm Jumeirah, etc.)
- Use "our agent", "our investor", "our platform" instead of specific names
- Use "Cairo", "New Cairo", "Sheikh Zayed" instead of Dubai locations
- Use "EGP" instead of "$" for currency
- This is for Divido — Egypt's fractional real estate platform

# REFERENCE VIDEO DESCRIPTION
------
${videoAnalysis}
------

# MY INSTRUCTIONS FOR NEW CONCEPTS
------
${instructions}
------
${brandVoiceSection}# BEGIN YOUR WORK`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const hashIndex = text.indexOf("#");
    return hashIndex >= 0 ? text.substring(hashIndex) : text;
  }
}
