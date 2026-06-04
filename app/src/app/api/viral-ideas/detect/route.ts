import { NextResponse } from "next/server";
import { readVideos, readCreators, readViralIdeas, writeViralIdeas } from "@/lib/csv";
import { detectViralVideos } from "@/lib/viral-detector";
import type { ViralIdea } from "@/lib/types";
import { v4 as uuid } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threshold = 1.5, configName, platform = "tiktok" } = body;

    const allVideos = readVideos();
    const allCreators = readCreators();
    const existingViralIds = new Set(readViralIdeas().map((v) => v.videoId));

    // Detect viral videos from ALL existing videos
    const detectionResults = detectViralVideos(allVideos, allCreators, allVideos, threshold);
    const viralResults = detectionResults.filter((r) => r.isViral);

    const newViralIdeas: ViralIdea[] = [];

    for (const result of viralResults) {
      const video = result.video;
      
      // Skip if already in viral ideas
      if (existingViralIds.has(video.id)) continue;

      // Extract original script from analysis
      const originalParts = extractOriginalScript(video.analysis);
      
      // Extract adapted script from newConcepts
      const adaptedParts = extractAdaptedScript(video.newConcepts);

      // Generate 7 bricks analysis
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
        // Original competitor script
        originalScript: video.analysis,
        originalHook: originalParts.hook,
        originalBody: originalParts.body,
        originalCTA: originalParts.cta,
        // Adapted brand script
        adaptedScript: video.newConcepts,
        adaptedHook: adaptedParts.hook,
        adaptedBody: adaptedParts.body,
        adaptedCTA: adaptedParts.cta,
        // Analysis
        sevenBricksAnalysis,
        contentPillar: extractContentPillar(video.analysis),
        status: "scripted",
        configName: configName || video.configName,
        platform,
        dateDetected: new Date().toISOString(),
        dateAnalyzed: new Date().toISOString(),
        dateScripted: new Date().toISOString(),
        laraNotes: "",
        hanaNotes: "",
      };

      newViralIdeas.push(viralIdea);
    }

    // Save new viral ideas
    if (newViralIdeas.length > 0) {
      const existing = readViralIdeas();
      writeViralIdeas([...existing, ...newViralIdeas]);
    }

    return NextResponse.json({
      success: true,
      totalVideos: allVideos.length,
      viralFound: viralResults.length,
      newIdeas: newViralIdeas.length,
      ideas: newViralIdeas.map((i) => ({
        id: i.id,
        creator: i.creator,
        views: i.views,
        viralMultiplier: i.viralMultiplier,
        contentPillar: i.contentPillar,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Extract the original script components from the video analysis
 */
function extractOriginalScript(analysis: string): { hook: string; body: string; cta: string } {
  // Try to find HOOK section
  const hookMatch = analysis.match(/\*\*HOOK:\*\*[\s\S]*?(?=\*\*RETENTION|\*\*SCRIPT|$)/i);
  // Try to find SCRIPT section
  const scriptMatch = analysis.match(/\*\*SCRIPT:\*\*[\s\S]*?(?=$)/i);
  
  if (hookMatch && scriptMatch) {
    const fullScript = scriptMatch[0];
    const lines = fullScript.split('\n').filter(l => l.trim());
    
    // First 2-3 lines are usually the hook/intro
    const hook = lines.slice(0, Math.min(5, lines.length)).join('\n');
    // Middle is body
    const body = lines.slice(5, Math.max(5, lines.length - 2)).join('\n');
    // Last line is CTA
    const cta = lines.slice(-2).join('\n');
    
    return { hook, body, cta };
  }
  
  // Fallback: split by paragraphs
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
  
  // Try to find ## HOOK
  const hookMatch = newConcepts.match(/##\s*HOOK[\s\S]*?(?=##\s*(BODY|SCRIPT)|$)/i);
  // Try to find ## BODY or ## SCRIPT
  const bodyMatch = newConcepts.match(/##\s*(?:BODY|SCRIPT)[\s\S]*?(?=##\s*CTA|$)/i);
  // Try to find ## CTA
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
