import { NextResponse } from "next/server";
import { scrapePostsByUrls, scrapeTikTokVideosByUrls } from "@/lib/apify";
import { getProviderForTask } from "@/lib/ai-providers/factory";
import { readConfigs, readBrandVoices, readStrategies } from "@/lib/csv";
import { downloadThumbnail } from "@/lib/thumbnail-cache";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const CONFIG_NAME = "projectdivido";
const TEMP_DIR = "/tmp/divido-analysis";

async function downloadVideo(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 10000) return false;
    writeFileSync(outputPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function analyzeWithGemini(videoBuffer: Buffer, analysisPrompt: string, videoProvider: any): Promise<string | null> {
  try {
    return await videoProvider.analyzeVideo(videoBuffer, "video/mp4", analysisPrompt);
  } catch (err: any) {
    if (err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("RESOURCE_EXHAUSTED")) {
      return null;
    }
    throw err;
  }
}

async function analyzeTextFallback(post: any, scriptProvider: any, config: any, platform: string): Promise<string> {
  const caption = post.caption || "";
  const hashtags = post.hashtags?.join(", ") || "";
  
  const textPrompt = `Analyze this ${platform} video based on its metadata and generate a 7 Bricks analysis.

POST METADATA:
- Caption: ${caption}
- Hashtags: ${hashtags}
- Views: ${post.videoPlayCount || post.views || "unknown"}
- Likes: ${post.likesCount || "unknown"}
- Comments: ${post.commentsCount || "unknown"}

${config.analysisInstruction}

Generate a complete 7 Bricks analysis based on this metadata. Make educated inferences about the video's content, hook, structure, and viral mechanics based on the caption, hashtags, and engagement metrics.`;

  return await scriptProvider.generateScript("", textPrompt, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    const isInstagram = url?.includes("instagram.com");
    const isTikTok = url?.includes("tiktok.com");
    const isValidUrl = isInstagram || isTikTok;
    
    if (!isValidUrl) {
      return NextResponse.json(
        { success: false, error: "Invalid URL. Please provide an Instagram or TikTok URL." },
        { status: 400 }
      );
    }

    if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

    // Load config
    const configs = readConfigs();
    const config = configs.find((c) => c.configName === CONFIG_NAME);
    if (!config) {
      return NextResponse.json(
        { success: false, error: `Config "${CONFIG_NAME}" not found` },
        { status: 500 }
      );
    }

    // Load AI providers
    const videoProvider = await getProviderForTask("video-analysis");
    const scriptProvider = await getProviderForTask("script-generation");

    const strategies = readStrategies();
    const strategy = strategies.find((s) => s.configName === CONFIG_NAME);
    const brandVoices = readBrandVoices();
    const brandVoice = strategy
      ? brandVoices.find((bv) => bv.strategyId === strategy.id)
      : undefined;
    const brandVoiceText = brandVoice
      ? `${brandVoice.voiceDescription}\n\nPrinciples:\n${brandVoice.principles}\n\nBanned words: ${brandVoice.bannedWords}`
      : undefined;

    // Scrape the post based on platform
    let scrapedPosts: any[] = [];
    let platform = isInstagram ? "Instagram" : "TikTok";
    
    if (isInstagram) {
      scrapedPosts = await scrapePostsByUrls([url]);
    } else if (isTikTok) {
      try {
        scrapedPosts = await scrapeTikTokVideosByUrls([url]);
      } catch (err: any) {
        // TikTok scraping failed - try to extract info from URL for text-based analysis
        console.log("TikTok scraping failed, using URL-based fallback:", err.message);
        
        // Extract username from TikTok URL
        const usernameMatch = url.match(/@([^/]+)/);
        const username = usernameMatch ? usernameMatch[1] : "unknown";
        
        scrapedPosts = [{
          url: url,
          videoUrl: "",
          displayUrl: "",
          videoPlayCount: 0,
          likesCount: 0,
          commentsCount: 0,
          ownerUsername: username,
          images: [],
          timestamp: new Date().toISOString(),
          caption: "",
          hashtags: [],
          mentions: [],
          views: 0,
        }];
      }
    }
    
    if (scrapedPosts.length === 0) {
      return NextResponse.json(
        { success: false, error: `Could not scrape ${platform} post. It may be private or unavailable.` },
        { status: 500 }
      );
    }

    const post = scrapedPosts[0];

    // Try video analysis
    let analysis: string | null = null;

    if (post.videoUrl) {
      try {
        const videoPath = path.join(TEMP_DIR, `video-${Date.now()}.mp4`);
        const downloaded = await downloadVideo(post.videoUrl, videoPath);
        
        if (downloaded) {
          const videoBuffer = readFileSync(videoPath);
          analysis = await analyzeWithGemini(videoBuffer, config.analysisInstruction, videoProvider);
        }
      } catch {
        // Fallback to text
      }
    }

    // Fallback to text-based analysis
    if (!analysis) {
      try {
        analysis = await analyzeTextFallback(post, scriptProvider, config, isInstagram ? "Instagram" : "TikTok");
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: `Analysis failed: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // Generate adapted script
    let newConcepts: string;
    try {
      const scriptPrompt = `${config.newConceptsInstruction}\n\n---\n\nVIDEO ANALYSIS:\n${analysis}\n\n---\n\nTASK: Generate ONE complete, production-ready script adapted for Divido. Do not generate 3 concepts. Generate a SINGLE script with:\n- Hook (0-3s): Visual + Spoken + Text\n- Body (3-50s): Scene-by-scene breakdown\n- CTA (50-60s): Native embed call-to-action\n- Production notes: Talent, location, props, B-roll, audio`;

      newConcepts = await scriptProvider.generateScript(analysis, scriptPrompt, brandVoiceText);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `Script generation failed: ${err.message}` },
        { status: 500 }
      );
    }

    // Cache thumbnail
    let thumbnailUrl = "";
    if (post.displayUrl || post.images?.[0]) {
      const thumbUrl = post.displayUrl || post.images[0];
      const cached = await downloadThumbnail(thumbUrl, `video-${Date.now()}`, url);
      if (cached) {
        thumbnailUrl = cached;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        url: post.url,
        creator: post.ownerUsername || "unknown",
        views: post.videoPlayCount || post.views || 0,
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        caption: post.caption || "",
        thumbnail: thumbnailUrl,
        analysis,
        newConcepts,
      },
    });

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
