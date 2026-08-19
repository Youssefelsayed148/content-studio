import { getProviderForTask } from "./ai-providers/factory";
import type { AIUserSettings } from "./ai-providers/types";
import type { Config } from "./types";

/**
 * Analyze a competitor's original video to produce the source material for
 * the "Original" tab, the Side-by-Side competitor column, and hook/body/CTA
 * extraction.
 *
 * Two paths, same pattern already proven in app/api/analyze-reel/route.ts:
 *  1. Real video analysis via Gemini (native multimodal — actually watches
 *     the video). Requires GEMINI_API_KEY / a Gemini key in Settings.
 *  2. Text-based inference fallback — no video download, just asks the
 *     already-working script-generation provider (opencode-go by default)
 *     to infer the likely hook/body/CTA from caption, hashtags, and
 *     engagement metrics. Always available, lower fidelity.
 *
 * Never throws — on any failure it falls through to the text path, and if
 * that also fails, returns null so the caller can save an honest
 * "analysis not available" state instead of crashing the scan.
 */
export async function analyzeOriginalVideo(
  video: { videoUrl?: string; caption?: string; hashtags?: string[]; views: number; likes: number; comments: number; username: string },
  analysisInstruction: string,
  aiSettings?: AIUserSettings
): Promise<string | null> {
  // 1. Try real video analysis via Gemini, if a video URL was scraped.
  if (video.videoUrl) {
    try {
      const videoProvider = await getProviderForTask("video-analysis", aiSettings);
      const response = await fetch(video.videoUrl, { redirect: "follow" });
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        // Small/empty downloads are almost always a broken CDN link, not a real clip.
        if (buffer.length >= 10000) {
          const analysis = await videoProvider.analyzeVideo(buffer, "video/mp4", analysisInstruction);
          if (analysis && analysis.trim()) return analysis;
        }
      }
    } catch {
      // Gemini not configured, quota hit, download failed, etc. — fall through to text.
    }
  }

  // 2. Text-based inference fallback — always available once opencode-go (or
  // any script provider) is configured, since it's a plain text call.
  try {
    const scriptProvider = await getProviderForTask("script-generation", aiSettings);
    const textPrompt = `Analyze this Instagram Reel based on its metadata and generate a 7 Bricks analysis.

POST METADATA:
- Creator: @${video.username}
- Caption: ${video.caption || "(no caption)"}
- Hashtags: ${video.hashtags?.join(", ") || "(none)"}
- Views: ${video.views.toLocaleString()}
- Likes: ${video.likes.toLocaleString()}
- Comments: ${video.comments.toLocaleString()}

${analysisInstruction}

Generate a complete analysis based on this metadata, including a clearly-labeled HOOK, BODY, and CTA section (use "**HOOK:**", then a "**SCRIPT:**" section covering body and CTA). Make educated, clearly-inferred assumptions about the video's structure and viral mechanics based on the caption, hashtags, and engagement — since the raw video wasn't available for direct viewing, keep claims grounded in what the metadata actually supports.`;

    const analysis = await scriptProvider.generateScript("", textPrompt, undefined);
    if (analysis && analysis.trim()) return analysis;
  } catch {
    // Both paths failed — caller saves an honest empty/pending state.
  }

  return null;
}

/** Default 7-Bricks-style instruction used when no config.analysisInstruction is set. */
export function defaultAnalysisInstruction(config?: Config): string {
  return (
    config?.analysisInstruction ||
    "Analyze this video's viral mechanics using a 7 Bricks framework: Topic, Angle, Hook, Story Structure, Visual Format, Key Visuals, Audio. Identify the 2-3 'winning bricks' that most likely drove its performance."
  );
}
