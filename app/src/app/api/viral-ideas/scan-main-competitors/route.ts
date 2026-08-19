import { NextResponse } from "next/server";
import { readVideos, readCreators, readViralIdeas, writeViralIdeas, appendVideo, updateVideoAnalysis, readConfigs, readAiSettings } from "@/lib/csv";
import { scrapeReels, scrapePostsByUrls } from "@/lib/apify";
import { downloadThumbnail, getLocalThumbnailPath } from "@/lib/thumbnail-cache";
import { detectViralVideos } from "@/lib/viral-detector";
import { getProviderForTask } from "@/lib/ai-providers/factory";
import { analyzeOriginalVideo, defaultAnalysisInstruction } from "@/lib/video-analysis";
import { createScanJob, updateScanJobProgress, completeScanJob, failScanJob, getScanJob } from "@/lib/scan-jobs";
import { v4 as uuid } from "uuid";
import type { ViralIdea, Video, Config } from "@/lib/types";
import type { AIUserSettings } from "@/lib/ai-providers/types";

const MAIN_COMPETITOR_LOOKBACK_DAYS = 120;
const VIRAL_THRESHOLD = 1.2;

// Bounds on AI script generation per scan. Each generation is a full AI
// round-trip; kept bounded so a single scan can't run indefinitely even
// though it's no longer constrained by the HTTP request lifetime.
const MAX_SCRIPT_GENERATIONS_PER_SCAN = 8;
const SCRIPT_GENERATION_CONCURRENCY = 3;

// Same bounding logic for original-video analysis (the Gemini/text-fallback
// call that powers the Original tab, Side-by-Side, and hook/body/CTA).
const MAX_VIDEO_ANALYSES_PER_SCAN = 15;
const VIDEO_ANALYSIS_CONCURRENCY = 3;

/**
 * Dedicated endpoint for scanning main competitors.
 *
 * Runs as a background job instead of one long synchronous request, because
 * scraping (46-65s per competitor on Apify's current free-plan speed) plus
 * AI analysis/script generation for several competitors easily exceeds
 * Cloudflare's ~100s gateway timeout. This route creates a job row and
 * returns `202 { jobId }` immediately; the actual work keeps running
 * server-side (this is a persistent `next start` Node process, not a
 * serverless function that freezes on response) and updates the job row as
 * it progresses. The frontend polls GET /scan-status/:jobId instead of
 * holding one request open, so it can never hit the same timeout itself.
 *
 * Flow (same as before, just no longer blocking the HTTP response):
 * 1. Identify main competitors from creators.csv
 * 2. Scrape each main competitor for past 120 days (sequential, API limits)
 * 3. Analyze each new video's original content (Gemini video analysis, or
 *    text-based inference from caption/hashtags if Gemini isn't configured)
 * 4. Run viral detection on ALL videos from main competitors (new + existing)
 * 5. Save new viral ideas, generate brand-adapted scripts for the top ones
 */
export async function POST(request: Request) {
  let configName: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    configName = body?.configName;
  } catch {
    // no body — fine, configName stays undefined and we fall back to the first config
  }

  const jobId = createScanJob(configName);

  // Deliberately not awaited — this keeps running after the response below
  // is sent. Errors inside are caught and written to the job row itself,
  // never left to become an unhandled rejection.
  runScan(jobId, configName).catch((err) => {
    failScanJob(jobId, err instanceof Error ? err.message : String(err));
  });

  return NextResponse.json({ jobId }, { status: 202 });
}

async function runScan(jobId: string, configName: string | undefined) {
  const results = {
    success: true,
    mainCompetitors: [] as string[],
    scraped: [] as { username: string; videosFound: number; error?: string }[],
    newVideosSaved: 0,
    videosAnalyzed: 0,
    videosAnalysisFailed: 0,
    viralDetected: 0,
    newViralIdeas: 0,
    scriptsGenerated: 0,
    scriptsFailed: 0,
    errors: [] as string[],
    fallbackUsed: false,
  };

  const allCreators = readCreators();
  const mainCompetitors = allCreators.filter((c) => c.isMainCompetitor);
  results.mainCompetitors = mainCompetitors.map((c) => c.username);

  if (mainCompetitors.length === 0) {
    completeScanJob(jobId, {
      ...results,
      success: false,
      error: "No main competitors set. Go to Competitors page and mark your key competitors as 'Main Competitors'.",
    });
    return;
  }

  const configs = readConfigs();
  const config = configName
    ? configs.find((c) => c.configName === configName)
    : configs[0];
  const saveConfigName = config?.configName || "default";
  const aiSettings = readAiSettings() || undefined;

  updateScanJobProgress(jobId, { step: "Scraping competitor videos...", total: mainCompetitors.length });
  const allVideos = readVideos();
  const existingLinks = new Set(allVideos.map((v) => v.link));
  const newVideos: (Video & { _videoUrl?: string; _caption?: string; _hashtags?: string[] })[] = [];

  let competitorIndex = 0;
  for (const competitor of mainCompetitors) {
    competitorIndex++;
    updateScanJobProgress(jobId, {
      step: `Scraping @${competitor.username} (${competitorIndex}/${mainCompetitors.length})...`,
      current: competitorIndex,
    });
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
          caption: r.caption || "",
          hashtags: r.hashtags || [],
          datePosted: r.timestamp?.split("T")[0] || "",
          timestamp: new Date(r.timestamp),
        }))
        .filter((v) => v.timestamp >= cutoffDate);

      for (const v of videos) {
        const video: Video & { _videoUrl?: string; _caption?: string; _hashtags?: string[] } = {
          id: uuid(),
          link: v.postUrl,
          thumbnail: v.thumbnail,
          creator: v.username,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          analysis: "", // filled in below, in the analysis phase
          newConcepts: "",
          datePosted: v.datePosted,
          dateAdded: new Date().toISOString(),
          configName: saveConfigName,
          starred: false,
        };
        appendVideo(video);
        // Carry scrape-only fields for the analysis phase — not part of the
        // persisted Video schema, just kept in memory for this run.
        video._videoUrl = v.videoUrl;
        video._caption = v.caption;
        video._hashtags = v.hashtags;
        newVideos.push(video);
        existingLinks.add(v.postUrl);
      }

      results.scraped.push({ username: competitor.username, videosFound: videos.length });
      results.newVideosSaved += videos.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.scraped.push({ username: competitor.username, videosFound: 0, error: msg });
      results.errors.push(`@${competitor.username}: ${msg}`);
    }
  }

  if (results.scraped.every((s) => s.error)) {
    results.fallbackUsed = true;
  }

  updateScanJobProgress(jobId, { step: "Caching thumbnails..." });
  await Promise.allSettled(newVideos.map((v) => downloadThumbnail(v.thumbnail, v.id, v.link)));
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
          if (thumbUrl) await downloadThumbnail(thumbUrl, video.id, video.link);
        }
      } catch {
        // Best-effort — a failed re-scrape must not fail the scan.
      }
    }
  }

  // Analyze original videos — Gemini native video analysis if configured,
  // otherwise text-based inference from caption/hashtags. This is what
  // populates the Original tab, Side-by-Side competitor column, and
  // hook/body/CTA extraction, all of which previously stayed permanently
  // empty because this step never ran at all.
  const analysisInstruction = defaultAnalysisInstruction(config);
  const analysisTargets = newVideos.slice(0, MAX_VIDEO_ANALYSES_PER_SCAN);
  updateScanJobProgress(jobId, { step: "Analyzing original videos...", total: analysisTargets.length, current: 0 });

  let analyzedCount = 0;
  for (let i = 0; i < analysisTargets.length; i += VIDEO_ANALYSIS_CONCURRENCY) {
    const batch = analysisTargets.slice(i, i + VIDEO_ANALYSIS_CONCURRENCY);
    await Promise.all(
      batch.map(async (v) => {
        try {
          const analysis = await analyzeOriginalVideo(
            {
              videoUrl: v._videoUrl,
              caption: v._caption,
              hashtags: v._hashtags,
              views: v.views,
              likes: v.likes,
              comments: v.comments,
              username: v.creator,
            },
            analysisInstruction,
            aiSettings
          );
          if (analysis) {
            updateVideoAnalysis(v.id, analysis);
            v.analysis = analysis; // keep in-memory copy in sync for the detection step below
            results.videosAnalyzed++;
          } else {
            results.videosAnalysisFailed++;
          }
        } catch {
          results.videosAnalysisFailed++;
        }
        analyzedCount++;
        updateScanJobProgress(jobId, { current: analyzedCount });
      })
    );
  }

  updateScanJobProgress(jobId, { step: "Running viral detection..." });
  const refreshedVideos = readVideos();
  const mainCompetitorUsernames = new Set(mainCompetitors.map((c) => c.username));
  const competitorVideos = refreshedVideos.filter((v) => mainCompetitorUsernames.has(v.creator));

  const detectionResults = detectViralVideos(competitorVideos, allCreators, refreshedVideos, VIRAL_THRESHOLD);
  const viralResults = detectionResults.filter((r) => r.isViral);
  results.viralDetected = viralResults.length;

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

  updateScanJobProgress(jobId, {
    step: "Generating adapted scripts...",
    total: Math.min(newViralIdeas.length, MAX_SCRIPT_GENERATIONS_PER_SCAN),
    current: 0,
  });
  const scriptTargets = [...newViralIdeas]
    .sort((a, b) => b.viralMultiplier - a.viralMultiplier)
    .slice(0, MAX_SCRIPT_GENERATIONS_PER_SCAN);

  let scriptsGenerated = 0;
  let scriptsFailed = 0;
  let scriptedCount = 0;

  for (let i = 0; i < scriptTargets.length; i += SCRIPT_GENERATION_CONCURRENCY) {
    const batch = scriptTargets.slice(i, i + SCRIPT_GENERATION_CONCURRENCY);
    await Promise.all(
      batch.map(async (idea) => {
        const generated = await generateAdaptedScript(idea, config, aiSettings);
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
        scriptedCount++;
        updateScanJobProgress(jobId, { current: scriptedCount });
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

  completeScanJob(jobId, {
    ...results,
    message: results.fallbackUsed
      ? `API limits hit — used fallback on ${competitorVideos.length} existing videos from main competitors. Found ${results.newViralIdeas} new viral ideas.`
      : `Scanned ${results.mainCompetitors.length} main competitors. Found ${results.newVideosSaved} new videos, analyzed ${results.videosAnalyzed} originals, and found ${results.newViralIdeas} new viral ideas.`,
  });
}

/**
 * Convenience GET on this same route (?jobId=...) mirroring the dedicated
 * /scan-status/:jobId endpoint, so any existing client code hitting this
 * URL for status doesn't hard-fail.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId query param required" }, { status: 400 });
  }
  const job = getScanJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

/**
 * Generate the brand-adapted script via the configured AI provider
 * (opencode-go / glm-5.2 by default — see DEFAULT_AI_SETTINGS in ai-providers/types.ts).
 * Returns an honest ok/error result rather than masking failures behind a
 * fabricated "quota exceeded" message.
 */
async function generateAdaptedScript(
  idea: ViralIdea,
  config: Config | undefined,
  aiSettings: AIUserSettings | undefined
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const scriptProvider = await getProviderForTask("script-generation", aiSettings);

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

${video.analysis ? `### Source Analysis\n${video.analysis}\n` : `*No original-video analysis available — falling back to performance-only context.*\n`}

## Winning Bricks (Why This Went Viral)
1. **Hook** — Stopped the scroll immediately
2. **Story Structure** — Kept viewers watching until the end
3. **Angle** — Sparked comments and shares`;
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
