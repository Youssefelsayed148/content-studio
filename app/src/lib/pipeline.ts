import { v4 as uuid } from "uuid";
import { readConfigs, readCreators, readVideos, writeVideos, appendScript, readBrandVoices, readAiSettings } from "./csv";
import { scrapeReels } from "./apify";
import { processViralVideos } from "./process-viral";
import { downloadThumbnail } from "./thumbnail-cache";
import { getProviderForTask } from "./ai-providers/factory";
import type { PipelineParams, PipelineProgress, Video, ActiveTask } from "./types";

const VIDEO_CONCURRENCY = 3;
const APIFY_CONCURRENCY = 2; // Free tier memory limit — scrape max 2 creators at a time

interface ScrapedVideo {
  videoUrl: string;
  postUrl: string;
  views: number;
  likes: number;
  comments: number;
  username: string;
  thumbnail: string;
  datePosted: string;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

async function runWithConcurrencyResults<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      try {
        const value = await fn(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runPipeline(
  params: PipelineParams,
  onProgress: (progress: PipelineProgress) => void
): Promise<void> {
  const progress: PipelineProgress = {
    status: "running",
    phase: "scraping",
    activeTasks: [],
    creatorsCompleted: 0,
    creatorsTotal: 0,
    creatorsScraped: 0,
    videosAnalyzed: 0,
    videosTotal: 0,
    viralIdeasFound: 0,
    scriptsGenerated: 0,
    errors: [],
    log: [],
  };

  const emit = () => {
    onProgress({ ...progress, activeTasks: [...progress.activeTasks], log: [...progress.log], errors: [...progress.errors] });
  };

  const log = (msg: string) => {
    progress.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    emit();
  };

  const addTask = (task: ActiveTask) => {
    progress.activeTasks.push(task);
    emit();
  };

  const updateTask = (id: string, step: string) => {
    const t = progress.activeTasks.find((t) => t.id === id);
    if (t) { t.step = step; emit(); }
  };

  const removeTask = (id: string) => {
    progress.activeTasks = progress.activeTasks.filter((t) => t.id !== id);
    emit();
  };

  try {
    // Load config
    const configs = readConfigs();
    const config = configs.find((c) => c.configName === params.configName);
    if (!config) throw new Error(`Config "${params.configName}" not found`);

    log(`Loaded config: ${config.configName}`);

    // Load creators — prioritize main competitors
    const allCreators = readCreators();
    const creators = allCreators
      .filter((c) => c.category === config.creatorsCategory)
      .sort((a, b) => (b.isMainCompetitor ? 1 : 0) - (a.isMainCompetitor ? 1 : 0));
    if (creators.length === 0) throw new Error(`No creators found for category "${config.creatorsCategory}"`);

    const mainCount = creators.filter((c) => c.isMainCompetitor).length;
    progress.creatorsTotal = creators.length;
    log(`Found ${creators.length} creators (${mainCount} main competitors prioritized) — scraping all in parallel`);
    emit();

    // Phase 1: Scrape all creators in parallel
    progress.phase = "scraping";
    const cutoffDate = new Date(Date.now() - params.nDays * 24 * 60 * 60 * 1000);
    const allTopVideos: ScrapedVideo[] = [];

    const scrapeResults = await runWithConcurrencyResults(
      creators,
      APIFY_CONCURRENCY,
      async (creator) => {
        const taskId = `scrape-${creator.username}`;
        addTask({ id: taskId, creator: creator.username, step: "Scraping reels" });

        try {
          const reels = await scrapeReels(creator.username, params.maxVideos, params.nDays);
          updateTask(taskId, `Found ${reels.length} reels`);

          const videos = reels
            .filter((r) => r.videoUrl && r.timestamp)
            .map((r) => ({
              videoUrl: r.videoUrl,
              postUrl: r.url,
              views: r.videoPlayCount || 0,
              likes: r.likesCount || 0,
              comments: r.commentsCount || 0,
              username: r.ownerUsername || creator.username,
              thumbnail: r.displayUrl || r.images?.[0] || "",
              datePosted: r.timestamp?.split("T")[0] || "",
              timestamp: new Date(r.timestamp),
            }))
            .filter((v) => v.timestamp >= cutoffDate);

          videos.sort((a, b) => b.views - a.views);
          const topVideos = videos.slice(0, params.topK);

          updateTask(taskId, `Top ${topVideos.length} selected`);
          log(`@${creator.username}: ${reels.length} reels → top ${topVideos.length} selected`);

          removeTask(taskId);
          progress.creatorsScraped++;
          emit();

          return { creator: creator.username, videos: topVideos };
        } catch (err) {
          removeTask(taskId);
          throw err;
        }
      }
    );

    for (const result of scrapeResults) {
      if (result.status === "fulfilled") {
        for (const v of result.value.videos) {
          allTopVideos.push(v);
        }
        progress.creatorsCompleted++;
      } else {
        const msg = `Scraping error: ${result.reason instanceof Error ? result.reason.message : result.reason}`;
        progress.errors.push(msg);
        log(msg);
        progress.creatorsCompleted++;
      }
    }

    progress.videosTotal = allTopVideos.length;
    log(`Scraping done. ${allTopVideos.length} videos to analyze (${VIDEO_CONCURRENCY} workers)`);
    emit();

    // Phase 2: Process videos concurrently
    progress.phase = "analyzing";
    emit();

    // Load brand voice for this config (if any)
    const { readStrategies } = await import("./csv");
    const strategies = readStrategies();
    const strategy = strategies.find((s) => s.configName === params.configName);
    const brandVoices = readBrandVoices();
    const brandVoice = strategy
      ? brandVoices.find((bv) => bv.strategyId === strategy.id)
      : undefined;
    const brandVoiceText = brandVoice
      ? `${brandVoice.voiceDescription}\n\nPrinciples:\n${brandVoice.principles}\n\nBanned words: ${brandVoice.bannedWords}`
      : undefined;

    if (brandVoice) {
      log(`Loaded brand voice: ${brandVoice.brandName}`);
    }

    const newVideos: Video[] = [];
    const targetPlatform = params.platform || "tiktok";

    // Load AI provider settings
    const aiSettings = readAiSettings();
    const videoProvider = await getProviderForTask("video-analysis", aiSettings || undefined);
    const scriptProvider = await getProviderForTask("script-generation", aiSettings || undefined);

    log(`AI Providers — Video Analysis: ${videoProvider.displayName}, Script Generation: ${scriptProvider.displayName}`);
    emit();

    await runWithConcurrency(allTopVideos, VIDEO_CONCURRENCY, async (video) => {
      const taskId = `video-${uuid().slice(0, 8)}`;
      const label = `${video.views.toLocaleString()} views`;

      try {
        addTask({ id: taskId, creator: video.username, step: "Downloading", views: video.views });

        const videoResponse = await fetch(video.videoUrl);
        if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const contentType = videoResponse.headers.get("content-type") || "video/mp4";

        updateTask(taskId, `${videoProvider.displayName} analyzing video`);
        log(`@${video.username} (${label}): ${videoProvider.displayName} analyzing video`);

        const analysis = await videoProvider.analyzeVideo(
          videoBuffer,
          contentType,
          config.analysisInstruction
        );

        updateTask(taskId, `${scriptProvider.displayName} generating concepts`);
        log(`@${video.username} (${label}): ${scriptProvider.displayName} generating concepts`);

        const newConcepts = await scriptProvider.generateScript(analysis, config.newConceptsInstruction, brandVoiceText);

        const videoRecord: Video = {
          id: uuid(),
          link: video.postUrl,
          thumbnail: video.thumbnail,
          creator: video.username,
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          analysis,
          newConcepts,
          datePosted: video.datePosted,
          dateAdded: new Date().toISOString().slice(0, 10),
          configName: params.configName,
          starred: false,
        };

        newVideos.push(videoRecord);

        // Cache thumbnail immediately while URL is fresh
        if (video.thumbnail) {
          downloadThumbnail(video.thumbnail, videoRecord.id, video.postUrl).catch(() => {});
        }

        // Parse concepts into individual scripts
        const parsedScripts = parseConceptsIntoScripts(newConcepts, videoRecord.id, video.username, params.configName, targetPlatform);
        for (const script of parsedScripts) {
          appendScript(script);
        }
        log(`@${video.username} (${label}): ${parsedScripts.length} script(s) generated`);

        progress.videosAnalyzed++;
        removeTask(taskId);
        log(`@${video.username} (${label}): done`);
        emit();
      } catch (err) {
        removeTask(taskId);
        const msg = `@${video.username} (${label}): ${err instanceof Error ? err.message : err}`;
        progress.errors.push(msg);
        log(`Error — ${msg}`);
        emit();
      }
    });

    // Write all new videos at once
    if (newVideos.length > 0) {
      const existing = readVideos();
      writeVideos([...existing, ...newVideos]);
    }

    // Phase 3: Viral Detection & Deep Analysis
    if (newVideos.length > 0) {
      progress.phase = "viral_detection";
      log(`Starting viral detection on ${newVideos.length} videos...`);
      emit();

      try {
        const viralIdeas = await processViralVideos(
          newVideos,
          config,
          targetPlatform,
          brandVoiceText,
          (viralProgress) => {
            log(`Viral: ${viralProgress.currentStep}`);
            progress.viralIdeasFound = viralProgress.viralIdeasFound;
            progress.scriptsGenerated = viralProgress.completedIdeas;
            emit();
          }
        );

        if (viralIdeas.length > 0) {
          log(`Viral detection complete! ${viralIdeas.length} viral ideas found and scripted.`);
          progress.viralIdeasFound = viralIdeas.length;
          progress.scriptsGenerated = viralIdeas.length;
        } else {
          log("No viral outliers detected in this batch.");
        }
        emit();
      } catch (err) {
        const msg = `Viral detection error: ${err instanceof Error ? err.message : err}`;
        progress.errors.push(msg);
        log(msg);
        emit();
      }
    }

    progress.phase = "done";
    progress.status = "completed";
    log(`Pipeline complete! ${progress.videosAnalyzed}/${progress.videosTotal} videos analyzed, ${progress.viralIdeasFound} viral ideas found, ${progress.errors.length} errors.`);
    emit();
  } catch (err) {
    progress.status = "error";
    const msg = `Pipeline error: ${err instanceof Error ? err.message : err}`;
    progress.errors.push(msg);
    log(msg);
    emit();
  }
}

function parseConceptsIntoScripts(conceptsText: string, sourceVideoId: string, sourceCompetitor: string, strategyName: string, platform: string = "tiktok") {
  const scripts = [];
  const conceptBlocks = conceptsText.split(/# CONCEPT \d+/).filter(Boolean);

  for (let i = 0; i < conceptBlocks.length; i++) {
    const block = conceptBlocks[i];

    // Extract hook
    const hookMatch = block.match(/## HOOK\s*\n?([\s\S]*?)(?=\n## SCRIPT|\n## |$)/i);
    const hook = hookMatch ? hookMatch[1].trim().substring(0, 300) : "";

    // Extract script body
    const scriptMatch = block.match(/## SCRIPT\s*\n?([\s\S]*?)(?=\n## |\n# CONCEPT|$)/i);
    const body = scriptMatch ? scriptMatch[1].trim().substring(0, 2000) : block.substring(0, 2000);

    // Extract title/description (first few lines before ## HOOK)
    const descMatch = block.match(/^([\s\S]*?)(?=\n## HOOK|$)/i);
    const description = descMatch ? descMatch[1].trim().substring(0, 100) : `Concept ${i + 1}`;

    // Extract CTA (last paragraph or line with CTA)
    const lines = body.split("\n").filter((l) => l.trim());
    const cta = lines.length > 3 ? lines.slice(-2).join(" ").substring(0, 200) : "";

    // Detect content pillar from text
    let contentPillar = "General";
    const pillarKeywords: Record<string, string[]> = {
      "Bank Certificate Trap": ["certificate", "bank", "27%", "interest", "savings"],
      "Exit Mechanics": ["exit", "sell", "withdraw", "liquidity", "get out", "lock-up"],
      "First Investor Journey": ["first investor", "testimonial", "journey", "experience", "started"],
      "Azimut Credibility": ["azimut", "regulated", "FRA", "licensed", "institutional"],
      "EGP Devaluation": ["devaluation", "inflation", "EGP", "pound", "currency", "dollar"],
    };
    for (const [pillar, keywords] of Object.entries(pillarKeywords)) {
      if (keywords.some((k) => body.toLowerCase().includes(k))) {
        contentPillar = pillar;
        break;
      }
    }

    scripts.push({
      id: uuid(),
      title: description || `Script from @${sourceCompetitor}`,
      platform,
      contentPillar,
      hook,
      body,
      cta,
      status: "generated" as const,
      sourceVideoId,
      sourceCompetitor,
      strategyName,
      generatedAt: new Date().toISOString(),
      laraApprovedAt: "",
      laraNotes: "",
      hanaApprovedAt: "",
      hanaNotes: "",
      briefGeneratedAt: "",
      scheduledAt: "",
      filmedAt: "",
      postedAt: "",
      performanceViews: 0,
      performanceLikes: 0,
    });
  }

  // If no concepts parsed, create one from the whole text
  if (scripts.length === 0 && conceptsText.length > 50) {
    scripts.push({
      id: uuid(),
      title: `Script from @${sourceCompetitor}`,
      platform,
      contentPillar: "General",
      hook: conceptsText.substring(0, 200),
      body: conceptsText.substring(0, 1500),
      cta: "",
      status: "generated" as const,
      sourceVideoId,
      sourceCompetitor,
      strategyName,
      generatedAt: new Date().toISOString(),
      laraApprovedAt: "",
      laraNotes: "",
      hanaApprovedAt: "",
      hanaNotes: "",
      briefGeneratedAt: "",
      scheduledAt: "",
      filmedAt: "",
      postedAt: "",
      performanceViews: 0,
      performanceLikes: 0,
    });
  }

  return scripts;
}
