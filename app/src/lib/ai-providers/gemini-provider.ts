/**
 * Google Gemini AI Provider
 * Wraps native Gemini video upload + text generation.
 * Best for video analysis due to native multimodal support.
 */

import { uploadVideo, analyzeVideo as geminiAnalyzeVideo } from "../gemini";
import type { AIProvider } from "./types";

export class GeminiProvider implements AIProvider {
  readonly providerType = "gemini" as const;
  readonly displayName = "Google Gemini";
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    this.model = model;
  }

  async analyzeVideo(
    videoBuffer: Buffer,
    mimeType: string,
    analysisPrompt: string
  ): Promise<string> {
    // Gemini has native video upload — use the existing gemini.ts implementation
    const fileData = await uploadVideo(videoBuffer, mimeType);
    return geminiAnalyzeVideo(fileData.uri, fileData.mimeType, analysisPrompt);
  }

  async generateScript(
    videoAnalysis: string,
    instructions: string,
    brandVoice?: string
  ): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Gemini API key not configured.");

    const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const brandVoiceSection = brandVoice
      ? `
# BRAND VOICE (STRICT — ALL OUTPUT MUST FOLLOW THIS)
------
${brandVoice}
------
`
      : "";

    const response = await fetch(`${GEMINI_GENERATE_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `# ROLE
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
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini script generation error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const hashIndex = text.indexOf("#");
    return hashIndex >= 0 ? text.substring(hashIndex) : text;
  }
}
