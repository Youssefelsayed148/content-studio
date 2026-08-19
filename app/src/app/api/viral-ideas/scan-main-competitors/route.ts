import { NextResponse } from "next/server";
import { readVideos, readCreators, readViralIdeas, writeViralIdeas, appendVideo, readConfigs, readAiSettings } from "@/lib/csv";
import { scrapeReels, scrapePostsByUrls } from "@/lib/apify";
import { downloadThumbnail, getLocalThumbnailPath } from "@/lib/thumbnail-cache";
import { detectViralVideos } from "@/lib/viral-detector";
import { getProviderForTask } from "@/lib/ai-providers/factory";
import { v4 as uuid } from "uuid";
import type { ViralIdea, Video, Config } from "@/lib/types";

const MAIN_COMPETITOR_LOOKBACK_DAYS = 120;
const VIRAL_THRESHOLD = 1.2;

// Bounds on AI script generation per scan. Each generation is a full AI
// round-trip, so these keep total wall time well under the Cloudflare/proxy
// request timeout. Ideas beyond the cap are saved with a "not generated yet"
// placeholder rather than a fabricated error.
const MAX_SCRIPT_GENERATIONS_PER_SCAN = 8;
const SCRIPT_GENERATION_CONCURRENCY = 3;

/**
 * Dedicated endpoint for scanning main competitors.
 * 
 * Flow:
 * 1. Identify main competitors from creators.csv
 * 2. Try to scrape each main competitor for past 120 days (sequential to avoid API limits)
 * 3. Run viral detection on ALL videos from main competitors (new + existing)
 * 4. Save new viral ideas to viral_ideas.csv
 * 5. ALWAYS returns output — if scraping fails, detects virals from existing data
 */
export async function POST(request: Request) {
  const results = {
    success: true,
    mainCompetitors: [] as string[],
    scraped: [] as { username: string; videosFound: number; error?: string }[],
    newVideosSaved: 0,
    viralDetected: 0,
    newViralIdeas: 0,
    scriptsGenerated: 0,
    scriptsFailed: 0,
    errors: [] as string[],
    fallbackUsed: false,
  };

  try {
    const body = await request.json();
    const configName = body.configName;

    // 1. Identify main competitors
    const allCreators = readCreators();
    const mainCompetitors = allCreators.filter((c) => c.isMainCompetitor);
    results.mainCompetitors = mainCompetitors.map((c) => c.username);

    if (mainCompetitors.length === 0) {
      return NextResponse.json({
        ...results,
        success: false,
        error: "No main competitors set. Go to Competitors page and mark your key competitors as 'Main Competitors'.",
      }, { status: 400 });
    }

    // Get config for saving videos
    const configs = readConfigs();
    const config = configName 
      ? configs.find((c) => c.configName === configName) 
      : configs[0];
    const saveConfigName = config?.configName || "default";

    // 2. Try to scrape main competitors (sequential to respect API limits)
    const allVideos = readVideos();
    const existingLinks = new Set(allVideos.map((v) => v.link));
    let newVideos: Video[] = [];

    for (const competitor of mainCompetitors) {
      try {
        const reels = await scrapeReels(competitor.username, 50, MAIN_COMPETITOR_LOOKBACK_DAYS);
        
        const cutoffDate = new Date(Date.now() - MAIN_COMPETITOR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
        const videos = reels
          .filter((r) => r.videoUrl && r.timestamp && !existingLinks.has(r.url))
          .map((r) => ({
            videoUrl: r.videoUrl,
            postUrl: r.url,
            views: r.videoPlayCount || 0,
            likes: r.likesCount || 0,
            comments: r.commentsCount || 0,
            username: r.ownerUsername || competitor.username,
            thumbnail: r.images?.[0] || "",
            datePosted: r.timestamp?.split("T")[0] || "",
            timestamp: new Date(r.timestamp),
          }))
          .filter((v) => v.timestamp >= cutoffDate);

        // Save new videos (without analysis — just raw data for viral detection)
        for (const v of videos) {
          const video: Video = {
            id: uuid(),
            link: v.postUrl,
            thumbnail: v.thumbnail,
            creator: v.username,
            views: v.views,
            likes: v.likes,
            comments: v.comments,
            analysis: "", // No AI analysis yet — APIs are limited
            newConcepts: "",
            datePosted: v.datePosted,
            dateAdded: new Date().toISOString(),
            configName: saveConfigName,
            starred: false,
          };
          appendVideo(video);
          newVideos.push(video);
          existingLinks.add(v.postUrl);
        }

        results.scraped.push({
          username: competitor.username,
          videosFound: videos.length,
        });
        results.newVideosSaved += videos.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.scraped.push({
          username: competitor.username,
          videosFound: 0,
          error: msg,
        });
        results.errors.push(`@${competitor.username}: ${msg}`);
      }
    }

    // If ALL scrapes failed, mark fallback
    if (results.scraped.every((s) => s.error)) {
      results.fallbackUsed = true;
    }

    // Cache a thumbnail for every new video. Profile-feed scrapes frequently
    // omit image fields (empty displayUrl/images), so after trying the scraped
    // URL directly we re-scrape the post URLs in batches — post-level scrapes
    // do include fresh CDN image URLs.
    await Promise.allSettled(
      newVideos.map((v) => downloadThumbnail(v.thumbnail, v.id, v.link))
    );
    const missingThumbnails = newVideos.filter((v) => !getLocalThumbnailPath(v.id));
    if (missingThumbnails.length > 0) {
      for (let i = 0; i < missingThumbnails.length; i += 10) {
        const batch = missingThumbnails.slice(i, i + 10);
        try {
          const posts = await scrapePostsByUrls(batch.map((v) => v.link));
          for (const post of posts) {
            const video = batch.find((v) => v.link === post.url);
            if (!video) continue;
            const thumbUrl = post.displayUrl || post.images?.[0];
            if (thumbUrl) {
              await downloadThumbnail(thumbUrl, video.id, video.link);
            }
          }
        } catch {
          // Best-effort — a failed re-scrape must not fail the scan.
        }
      }
    }

    // 3. Run viral detection on ALL videos from main competitors (existing + new)
    const refreshedVideos = readVideos();
    const mainCompetitorUsernames = new Set(mainCompetitors.map((c) => c.username));
    const competitorVideos = refreshedVideos.filter((v) => mainCompetitorUsernames.has(v.creator));

    const detectionResults = detectViralVideos(competitorVideos, allCreators, refreshedVideos, VIRAL_THRESHOLD);
    const viralResults = detectionResults.filter((r) => r.isViral);
    results.viralDetected = viralResults.length;

    // 4. Save new viral ideas
    const existingViralIds = new Set(readViralIdeas().map((v) => v.videoId));
    const newViralIdeas: ViralIdea[] = [];

    for (const result of viralResults) {
      const video = result.video;
      if (existingViralIds.has(video.id)) continue;

      const originalParts = extractOriginalScript(video.analysis);
      const sevenBricksAnalysis = generateSevenBricksFromVideo(video, result);

      const viralIdea: ViralIdea = {
        id: uuid(),
        videoId: video.id,
        creator: video.creator,
        link: video.link,
        thumbnail: video.thumbnail,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        creatorAvgViews: result.creatorAvgViews,
        viralMultiplier: result.viralMultiplier,
        originalScript: video.analysis || `Video from @${video.creator} — ${video.views.toLocaleString()} views. No AI analysis available for this video yet.`,
        originalHook: originalParts.hook || "No hook extracted",
        originalBody: originalParts.body || "No body extracted",
        originalCTA: originalParts.cta || "No CTA extracted",
        // Populated below in the bounded script-generation phase. Anything not
        // reached this run stays honestly labelled as pending rather than being
        // dressed up as a quota error.
        adaptedScript: "Script not generated yet — re-run the scan or generate from the Scripts view.",
        adaptedHook: "",
        adaptedBody: "",
        adaptedCTA: "",
        sevenBricksAnalysis,
        contentPillar: extractContentPillar(video.analysis),
        status: "detected",
        configName: saveConfigName,
        platform: "tiktok",
        dateDetected: new Date().toISOString(),
        dateAnalyzed: new Date().toISOString(),
        dateScripted: new Date().toISOString(),
        laraNotes: "",
        hanaNotes: "",
      };

      newViralIdeas.push(viralIdea);
    }

    // Generate adapted scripts for the strongest new ideas only.
    //
    // Each generation is a full AI round-trip (~20-40s on glm-5.2), so this is
    // deliberately bounded on two axes: MAX_SCRIPT_GENERATIONS_PER_SCAN caps the
    // total, and SCRIPT_GENERATION_CONCURRENCY caps how many run at once. Without
    // both, a scan detecting dozens of new videos would run serial AI calls for
    // many minutes and blow the Cloudflare request timeout. Ideas beyond the cap
    // are still saved — they just keep the honest "not generated yet" placeholder.
    const scriptTargets = [...newViralIdeas]
      .sort((a, b) => b.viralMultiplier - a.viralMultiplier)
      .slice(0, MAX_SCRIPT_GENERATIONS_PER_SCAN);

    let scriptsGenerated = 0;
    let scriptsFailed = 0;

    for (let i = 0; i < scriptTargets.length; i += SCRIPT_GENERATION_CONCURRENCY) {
      const batch = scriptTargets.slice(i, i + SCRIPT_GENERATION_CONCURRENCY);
      await Promise.all(
        batch.map(async (idea) => {
          const generated = await generateAdaptedScript(idea, config);
          if (generated.ok) {
            const parts = extractAdaptedScript(generated.text);
            idea.adaptedScript = generated.text;
            idea.adaptedHook = parts.hook;
            idea.adaptedBody = parts.body;
            idea.adaptedCTA = parts.cta;
            idea.dateScripted = new Date().toISOString();
            scriptsGenerated++;
          } else {
            idea.adaptedScript = `Script generation failed: ${generated.error}`;
            scriptsFailed++;
          }
        })
      );
    }

    results.scriptsGenerated = scriptsGenerated;
    results.scriptsFailed = scriptsFailed;

    if (newViralIdeas.length > 0) {
      const existing = readViralIdeas();
      writeViralIdeas([...existing, ...newViralIdeas]);
      results.newViralIdeas = newViralIdeas.length;
    }

    return NextResponse.json({
      ...results,
      message: results.fallbackUsed
        ? `API limits hit — used fallback on ${competitorVideos.length} existing videos from main competitors. Found ${results.newViralIdeas} new viral ideas.`
        : `Scanned ${results.mainCompetitors.length} main competitors. Found ${results.newVideosSaved} new videos and ${results.newViralIdeas} new viral ideas.`,
    });

  } catch (err) {
    return NextResponse.json(
      {
        ...results,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate the brand-adapted script via the configured AI provider
 * (opencode-go / glm-5.2 by default — see DEFAULT_AI_SETTINGS in ai-providers/types.ts).
 * Mirrors the pattern used in lib/process-viral.ts's runBrandScriptGeneration.
 * Returns an honest ok/error result rather than masking failures behind a
 * fabricated "quota exceeded" message.
 */
async function generateAdaptedScript(
  idea: ViralIdea,
  config: Config | undefined
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const aiSettings = readAiSettings();
    const scriptProvider = await getProviderForTask("script-generation", aiSettings || undefined);

    const viralContext = `
---
VIRAL VIDEO REFERENCE
=====================
Creator: @${idea.creator}
Views: ${idea.views.toLocaleString()}
Viral Multiplier: ${idea.viralMultiplier.toFixed(1)}x above this creator's average
Link: ${idea.link}
`;

    const baseInstruction =
      config?.newConceptsInstruction ||
      "Adapt this competitor's viral video into a new concept for our brand.";

    const scriptPrompt = `${baseInstruction}

${viralContext}

7 BRICKS FORENSIC ANALYSIS (use this to understand the viral mechanics):
${idea.sevenBricksAnalysis}

---

TASK: Generate ONE complete, production-ready script with:
- Hook (0-3s): Visual + Spoken + Text
- Body (3-50s): Scene-by-scene breakdown
- CTA (50-60s): Native embed call-to-action
- Production notes: Talent, location, props, B-roll, audio

Format the output with "## HOOK", "## BODY", and "## CTA" section headers.`;

    const text = await scriptProvider.generateScript(
      idea.sevenBricksAnalysis,
      scriptPrompt,
      undefined
    );

    if (!text || !text.trim()) {
      return { ok: false, error: "Provider returned an empty response" };
    }

    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function extractOriginalScript(analysis: string): { hook: string; body: string; cta: string } {
  if (!analysis) return { hook: "", body: "", cta: "" };
  
  const hookMatch = analysis.match(/\*\*HOOK:\*\*[\s\S]*?(?=\*\*RETENTION|\*\*SCRIPT|$)/i);
  const scriptMatch = analysis.match(/\*\*SCRIPT:\*\*[\s\S]*?(?=$)/i);
  
  if (hookMatch && scriptMatch) {
    const fullScript = scriptMatch[0];
    const lines = fullScript.split('\n').filter(l => l.trim());
    const hook = lines.slice(0, Math.min(5, lines.length)).join('\n');
    const body = lines.slice(5, Math.max(5, lines.length - 2)).join('\n');
    const cta = lines.slice(-2).join('\n');
    return { hook, body, cta };
  }
  
  const paragraphs = analysis.split('\n\n').filter(p => p.trim());
  if (paragraphs.length >= 3) {
    return {
      hook: paragraphs[0],
      body: paragraphs.slice(1, -1).join('\n\n'),
      cta: paragraphs[paragraphs.length - 1],
    };
  }
  
  return { hook: analysis.slice(0, 300), body: analysis.slice(300, 1000), cta: analysis.slice(1000) };
}

function extractAdaptedScript(newConcepts: string): { hook: string; body: string; cta: string } {
  if (!newConcepts) return { hook: "", body: "", cta: "" };
  
  const hookMatch = newConcepts.match(/##\s*HOOK[\s\S]*?(?=##\s*(BODY|SCRIPT)|$)/i);
  const bodyMatch = newConcepts.match(/##\s*(?:BODY|SCRIPT)[\s\S]*?(?=##\s*CTA|$)/i);
  const ctaMatch = newConcepts.match(/##\s*CTA[\s\S]*?(?=##|$)/i);
  
  return {
    hook: hookMatch ? hookMatch[0] : newConcepts.slice(0, 500),
    body: bodyMatch ? bodyMatch[0] : newConcepts.slice(500, 2000),
    cta: ctaMatch ? ctaMatch[0] : newConcepts.slice(2000),
  };
}

function generateSevenBricksFromVideo(
  video: { creator: string; views: number; analysis: string },
  result: { creatorAvgViews: number; viralMultiplier: number }
): string {
  return `# 7 Bricks Forensic Analysis

## Performance Context
- **Creator:** @${video.creator}
- **This Video:** ${video.views.toLocaleString()} views
- **Creator Average:** ${result.creatorAvgViews.toLocaleString()} views
- **Viral Multiplier:** ${result.viralMultiplier.toFixed(1)}x above average

## Deep Deconstruction

### Brick 1: Topic
This video addresses a topic that resonated deeply with the audience, generating significantly above-average engagement.

### Brick 2: Angle
The content presents a unique perspective or contrarian take that challenges conventional thinking.

### Brick 3: Hook
Strong opening that stops the scroll through visual-text-audio alignment.

### Brick 4: Story Structure
Follows a proven narrative format that builds tension and delivers payoff.

### Brick 5: Visual Format
Production style matches platform expectations while adding distinctive visual elements.

### Brick 6: Key Visuals
Specific visual elements help viewers understand complex ideas quickly.

### Brick 7: Audio
Audio strategy supports the message through appropriate music, voiceover, or sound effects.

## Winning Bricks (Why This Went Viral)
1. **Hook** — Stopped the scroll immediately
2. **Story Structure** — Kept viewers watching until the end  
3. **Angle** — Sparked comments and shares

*Note: For deeper AI-powered analysis, run the full pipeline with Gemini + Claude API access.*`;
}

function extractContentPillar(analysis: string): string {
  if (!analysis) return "Investment Education";
  const lower = analysis.toLowerCase();
  if (lower.includes("certificate") || lower.includes("bank") || lower.includes("interest")) {
    return "Bank Certificate Trap";
  }
  if (lower.includes("exit") || lower.includes("sell") || lower.includes("liquidity")) {
    return "Exit Mechanics";
  }
  if (lower.includes("testimonial") || lower.includes("journey") || lower.includes("experience")) {
    return "First Investor Journey";
  }
  if (lower.includes("regulated") || lower.includes("license") || lower.includes("institutional")) {
    return "Credibility";
  }
  if (lower.includes("devaluation") || lower.includes("inflation") || lower.includes("currency")) {
    return "Currency & Inflation";
  }
  if (lower.includes("real estate") || lower.includes("property")) {
    return "Real Estate";
  }
  return "Investment Education";
}