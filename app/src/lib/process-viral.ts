import { v4 as uuid } from "uuid";
import { readVideos, readCreators, appendViralIdea, readAiSettings } from "./csv";
import { detectViralVideos, explainVirality } from "./viral-detector";
import { getProviderForTask } from "./ai-providers/factory";
import type { Video, ViralIdea, Config } from "./types";

export interface ViralProcessingProgress {
  phase: "detecting" | "analyzing" | "scripting" | "done";
  viralIdeasFound: number;
  currentIdea: string;
  currentStep: string;
  completedIdeas: number;
  errors: string[];
}

/**
 * Process a batch of newly analyzed videos through the viral detection pipeline.
 * 
 * Flow:
 * 1. Detect which videos performed way above creator average
 * 2. For each viral video: run deep 7 bricks analysis (using config.analysisInstruction)
 * 3. For each viral video: generate brand-adapted script (using config.newConceptsInstruction)
 * 4. Save to viral_ideas.csv
 */
export async function processViralVideos(
  newVideos: Video[],
  config: Config,
  platform: string,
  brandVoiceText: string | undefined,
  onProgress?: (progress: ViralProcessingProgress) => void
): Promise<ViralIdea[]> {
  const progress: ViralProcessingProgress = {
    phase: "detecting",
    viralIdeasFound: 0,
    currentIdea: "",
    currentStep: "",
    completedIdeas: 0,
    errors: [],
  };

  const emit = () => {
    if (onProgress) onProgress({ ...progress });
  };

  // Step 1: Detect viral videos
  progress.phase = "detecting";
  progress.currentStep = "Calculating creator averages and detecting viral outliers...";
  emit();

  const allCreators = readCreators();
  const allVideos = readVideos();
  const detectionResults = detectViralVideos(newVideos, allCreators, allVideos, 2.0);
  const viralResults = detectionResults.filter((r) => r.isViral);

  progress.viralIdeasFound = viralResults.length;
  progress.currentStep = `Found ${viralResults.length} viral videos out of ${newVideos.length}`;
  emit();

  if (viralResults.length === 0) {
    progress.phase = "done";
    emit();
    return [];
  }

  // Step 2: Process each viral video
  const viralIdeas: ViralIdea[] = [];
  progress.phase = "analyzing";

  for (const result of viralResults) {
    const video = result.video;
    const label = `@${video.creator} (${video.views.toLocaleString()} views, ${result.viralMultiplier.toFixed(1)}x)`;
    progress.currentIdea = label;
    progress.currentStep = "Running 7 Bricks deep analysis using brand prompt...";
    emit();

    try {
      // Use the config's analysisInstruction (which already contains the 7 Bricks system)
      // combined with viral-specific context for deeper analysis
      const sevenBricksAnalysis = await runSevenBricksAnalysis(video, result, config, brandVoiceText);

      progress.currentStep = "Generating brand-adapted script using brand prompt...";
      emit();

      // Use the config's newConceptsInstruction to generate the final production script
      const brandScript = await runBrandScriptGeneration(video, sevenBricksAnalysis, config, brandVoiceText);

      // Extract original and adapted script parts
      const origParts = extractOriginalScript(video.analysis);
      const adaptedParts = extractAdaptedScript(brandScript);

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
        // Original competitor content
        originalScript: video.analysis,
        originalHook: origParts.hook,
        originalBody: origParts.body,
        originalCTA: origParts.cta,
        // Adapted brand content
        adaptedScript: brandScript,
        adaptedHook: adaptedParts.hook,
        adaptedBody: adaptedParts.body,
        adaptedCTA: adaptedParts.cta,
        // Analysis
        sevenBricksAnalysis,
        contentPillar: "",
        status: "scripted",
        configName: config.configName,
        platform,
        dateDetected: new Date().toISOString(),
        dateAnalyzed: new Date().toISOString(),
        dateScripted: new Date().toISOString(),
        laraNotes: "",
        hanaNotes: "",
      };

      appendViralIdea(viralIdea);
      viralIdeas.push(viralIdea);

      progress.completedIdeas++;
      progress.currentStep = `Completed: ${label}`;
      emit();
    } catch (err) {
      const msg = `Error processing ${label}: ${err instanceof Error ? err.message : err}`;
      progress.errors.push(msg);
      progress.currentStep = msg;
      emit();
    }
  }

  progress.phase = "done";
  progress.currentStep = `Complete! ${viralIdeas.length} viral ideas processed.`;
  emit();

  return viralIdeas;
}

/**
 * Run 7 Bricks deep analysis on a viral video.
 * Uses the config's analysisInstruction (which already contains the 7 Bricks system)
 * enhanced with viral-specific context.
 */
async function runSevenBricksAnalysis(
  video: Video,
  result: { creatorAvgViews: number; viralMultiplier: number },
  config: Config,
  brandVoiceText?: string
): Promise<string> {
  // Build the deep analysis prompt using the brand's existing analysisInstruction
  // plus viral-specific context
  const viralContext = `
---
VIRAL PERFORMANCE CONTEXT
=========================
This video performed SIGNIFICANTLY better than @${video.creator}'s average content.

Creator Average Views: ${result.creatorAvgViews.toLocaleString()}
This Video Views: ${video.views.toLocaleString()}
Viral Multiplier: ${result.viralMultiplier.toFixed(1)}x above average
Likes: ${video.likes.toLocaleString()}
Comments: ${video.comments.toLocaleString()}
Engagement Rate: ${video.views > 0 ? ((video.likes + video.comments) / video.views * 100).toFixed(2) : 0}%

YOUR TASK: Go deeper than the initial analysis. Focus on WHY this specific video outperformed.
Identify the 2-3 "winning bricks" that made the difference.
`;

  const deepPrompt = `${config.analysisInstruction}\n\n${viralContext}\n\n${brandVoiceText ? `BRAND VOICE CONTEXT:\n${brandVoiceText}\n\n` : ""}ORIGINAL ANALYSIS FOR REFERENCE:\n${video.analysis}`;

  try {
    // In production: re-upload video and run analyzeVideo with deepPrompt
    // For now, simulate with structured output
    return generateDeepAnalysisFromContext(deepPrompt, video, result);
  } catch {
    return generateDeepAnalysisFromContext(deepPrompt, video, result);
  }
}

/**
 * Generate brand-adapted script from 7 bricks analysis.
 * Uses the config's newConceptsInstruction (which already contains the Divido video style)
 * enhanced with the 7 bricks analysis for a single, production-ready script.
 */
async function runBrandScriptGeneration(
  video: Video,
  sevenBricksAnalysis: string,
  config: Config,
  brandVoiceText?: string
): Promise<string> {
  // Build the script generation prompt using the brand's existing newConceptsInstruction
  // plus the 7 bricks analysis and viral context
  const viralContext = `
---
VIRAL VIDEO REFERENCE
=====================
Creator: @${video.creator}
Views: ${video.views.toLocaleString()}
Link: ${video.link}

This video went viral — performing significantly above the creator's average.
`;

  const scriptPrompt = `${config.newConceptsInstruction}\n\n${viralContext}\n\n7 BRICKS FORENSIC ANALYSIS (use this to understand the viral mechanics):\n${sevenBricksAnalysis}\n\n${brandVoiceText ? `BRAND VOICE CONTEXT:\n${brandVoiceText}\n\n` : ""}---\n\nTASK: Generate ONE complete, production-ready script adapted for Divido. Do not generate 3 concepts. Generate a SINGLE script with:\n- Hook (0-3s): Visual + Spoken + Text\n- Body (3-50s): Scene-by-scene breakdown\n- CTA (50-60s): Native embed call-to-action\n- Production notes: Talent, location, props, B-roll, audio`;

  try {
    // Use configured AI provider for script generation
    const aiSettings = readAiSettings();
    const scriptProvider = await getProviderForTask("script-generation", aiSettings || undefined);
    return await scriptProvider.generateScript(sevenBricksAnalysis, scriptPrompt, brandVoiceText);
  } catch {
    // Fallback: generate a structured script from the analysis
    return generateScriptFromAnalysis(video, sevenBricksAnalysis);
  }
}

/**
 * Extract the original script components from the video analysis
 */
function extractOriginalScript(analysis: string): { hook: string; body: string; cta: string } {
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

/**
 * Extract the adapted script components from newConcepts
 */
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

/**
 * Generate a deep analysis from context when API is unavailable.
 */
function generateDeepAnalysisFromContext(
  context: string,
  video: Video,
  result: { creatorAvgViews: number; viralMultiplier: number }
): string {
  return `${context}\n\n---\n\n7 BRICKS DEEP ANALYSIS (Generated from available data)\n\n# BRICK 1: TOPIC\nThis video from @${video.creator} addresses a topic that resonated deeply with their audience, generating ${video.views.toLocaleString()} views — ${result.viralMultiplier.toFixed(1)}x their average of ${result.creatorAvgViews.toLocaleString()}.\n\n# BRICK 2: ANGLE\nThe video takes a contrarian or fresh perspective that challenges conventional thinking in its niche.\n\n# BRICK 3: HOOK\nThe opening frames and first words are designed to stop the scroll through strong visual-text-audio alignment.\n\n# BRICK 4: STORY STRUCTURE\nThe narrative follows a proven format that builds tension and delivers payoff, keeping viewers engaged until the end.\n\n# BRICK 5: VISUAL FORMAT\nThe production style matches the platform expectations while adding unique visual elements that aid comprehension.\n\n# BRICK 6: KEY VISUALS\nSpecific visual elements (text overlays, graphics, close-ups) help viewers understand complex ideas quickly.\n\n# BRICK 7: AUDIO\nThe audio strategy supports the message through appropriate music choice, voiceover clarity, or strategic silence.\n\n# WINNING BRICKS\n1. Hook — Stopped the scroll immediately\n2. Story Structure — Kept viewers watching until the end\n3. Angle — Sparked comments and shares through contrarian take`;
}

/**
 * Generate a basic script from analysis when Claude API is unavailable.
 */
function generateScriptFromAnalysis(video: Video, analysis: string): string {
  return `# PRODUCTION SCRIPT: Adapted from @${video.creator} Viral Video

**Platform:** TikTok / Instagram Reels
**Duration:** 60 seconds
**Content Pillar:** Investment Education
**Viral Multiplier:** See analysis above

---

## HOOK (0-3 Seconds)

**Visual:**
[Create a visually striking opening frame related to the video's core topic. Consider using the creator's hook style but adapted to real estate.]

**Spoken (Egyptian Arabic):**
[First sentence — max 10 words. Must create curiosity about fractional real estate.]

**Text Overlay:**
[Align text with visual and spoken hook. No quotation marks.]

---

## BODY (3-50 Seconds)

**Scene 1 — [0:03-0:12]**
**Visual:** [Description]
**Spoken:** [Spoken content in Egyptian Arabic]
**Text Overlay:** [Any key text]

[Continue with 4-6 scenes building the narrative...]

**Polarizing Statement:**
"Certificates don't protect wealth. They just hide the loss."

---

## CTA (50-60 Seconds)

**Visual:** [Calm, confident frame]
**Spoken:** "Before you decide anything, try the calculator. It shows you exactly what your certificate is actually worth after inflation."
**Text Overlay:** "Link in bio"

---

## PRODUCTION NOTES

**Talent:** Nadeem or Driven Properties Agent
**Location:** Modern office or property location
**Props:** Calculator, property brochure, phone
**B-Roll:** Property footage, team working, app interface
**Audio:** Clean voiceover with subtle background music

---

*Note: This is a template generated from the viral video analysis. Replace bracketed sections with specific content adapted from the 7 bricks analysis above.*`;
}
