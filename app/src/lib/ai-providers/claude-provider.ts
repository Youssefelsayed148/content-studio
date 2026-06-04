/**
 * Anthropic Claude AI Provider
 * Exceptional writing quality for script adaptation.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "./types";

export class ClaudeProvider implements AIProvider {
  readonly providerType = "anthropic" as const;
  readonly displayName = "Anthropic Claude";
  private model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-5-20250929") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeVideo(
    _videoBuffer: Buffer,
    _mimeType: string,
    _analysisPrompt: string
  ): Promise<string> {
    throw new Error(
      "Claude does not support native video analysis. Please use Gemini for video analysis, or select Gemini as your video analysis provider in Settings."
    );
  }

  async generateScript(
    videoAnalysis: string,
    instructions: string,
    brandVoice?: string
  ): Promise<string> {
    const client = new Anthropic({ apiKey: this.apiKey });

    const brandVoiceSection = brandVoice
      ? `
# BRAND VOICE (STRICT — ALL OUTPUT MUST FOLLOW THIS)
------
${brandVoice}
------
`
      : "";

    const message = await client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `# ROLE
You're an expert in creating viral Reels on Instagram.

# OBJECTIVE
Take as input viral video from my competitor and based on it generate new concepts for me. Adapt this reference for me.

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
    });

    const block = message.content[0];
    return block.type === "text" ? block.text : "";
  }
}
