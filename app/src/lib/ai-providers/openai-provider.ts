/**
 * OpenAI Provider
 * GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo for script generation.
 */

import type { AIProvider } from "./types";

export class OpenAIProvider implements AIProvider {
  readonly providerType = "openai" as const;
  readonly displayName = "OpenAI";
  private model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeVideo(
    _videoBuffer: Buffer,
    _mimeType: string,
    _analysisPrompt: string
  ): Promise<string> {
    throw new Error(
      "OpenAI does not support native video analysis. Please use Gemini for video analysis, or select Gemini as your video analysis provider in Settings."
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(`OpenAI error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const hashIndex = text.indexOf("#");
    return hashIndex >= 0 ? text.substring(hashIndex) : text;
  }
}
