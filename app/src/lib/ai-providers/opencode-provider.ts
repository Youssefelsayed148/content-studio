/**
 * opencode-go Provider (glm-5.2)
 * Calls opencode-go's API directly using your own opencode-go credential.
 * This has no dependency on Hermes or any other service on the VPS — it's
 * a standalone HTTP client, same pattern as the OpenRouter provider.
 *
 *   base_url: https://opencode.ai/zen/go/v1
 *   wire format: chat_completions (OpenAI-compatible)
 *   default model: glm-5.2, fallback: kimi-k2.6 (handled server-side by opencode-go)
 */

import type { AIProvider } from "./types";

/** Max wait for a single generation before aborting. */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Accepts OPENCODE_BASE_URL either as the bare base
 * (https://opencode.ai/zen/go/v1) or with /chat/completions already
 * appended. Normalizes to the full endpoint so either form in .env works.
 */
function resolveEndpoint(): string {
  const raw = (process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/go/v1").trim().replace(/\/+$/, "");
  return raw.endsWith("/chat/completions") ? raw : `${raw}/chat/completions`;
}

export class OpencodeProvider implements AIProvider {
  readonly providerType = "opencode" as const;
  readonly displayName = "opencode-go (glm-5.2)";
  private model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string = "glm-5.2") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeVideo(
    _videoBuffer: Buffer,
    _mimeType: string,
    _analysisPrompt: string
  ): Promise<string> {
    throw new Error(
      "opencode-go (glm-5.2) does not support native video analysis. Please use Gemini for video analysis, or select Gemini as your video analysis provider in Settings."
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

    const response = await fetch(resolveEndpoint(), {
      method: "POST",
      // Bound the request so a hung upstream call can't stall the caller
      // indefinitely (the scan route runs several of these per batch).
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8192,
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
      throw new Error(`opencode-go error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const hashIndex = text.indexOf("#");
    return hashIndex >= 0 ? text.substring(hashIndex) : text;
  }
}
