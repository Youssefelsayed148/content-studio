import { existsSync } from "fs";
import { v4 as uuid } from "uuid";
import { getDb, ensureSchema } from "./db";
import type {
  Config, Creator, Video, Strategy, Script, ProductionBrief,
  CalendarEvent, BrandVoice, Brand, SocialConnection, PlatformAnalytics,
  ViralIdea, UserApiKey, UsageRecord
} from "./types";

// Ensure schema exists — called lazily on first data access
const DEFAULT_WORKSPACE = "default";
let _initialized = false;
function ensureDb(): void {
  if (!_initialized) {
    ensureSchema();
    const db = getDb();
    const existing = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(DEFAULT_WORKSPACE);
    if (!existing) {
      db.prepare("INSERT INTO workspaces (id, name, slug, plan, status) VALUES (?, ?, ?, ?, ?)")
        .run(DEFAULT_WORKSPACE, "Default Workspace", "default", "free", "active");
    }
    _initialized = true;
  }
}

// ─────────────────────── Configs ───────────────────────

export function readConfigs(workspaceId?: string): Config[] {
  const db = getDb();
  if (workspaceId) {
    return db.prepare("SELECT * FROM configs WHERE workspace_id = ?").all(workspaceId) as Config[];
  }
  return db.prepare("SELECT * FROM configs").all() as Config[];
}

export function writeConfigs(configs: Config[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM configs WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO configs (id, workspace_id, configName, creatorsCategory, analysisInstruction, newConceptsInstruction) VALUES (?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const c of configs) {
      ins.run(c.id, workspaceId, c.configName, c.creatorsCategory, c.analysisInstruction, c.newConceptsInstruction);
    }
  });
  tx();
}

// ─────────────────────── Creators ───────────────────────

export function readCreators(workspaceId?: string): Creator[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM creators WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM creators").all();
  return (rows as any[]).map(r => ({
    ...r,
    followers: r.followers ?? 0,
    reelsCount30d: r.reelsCount30d ?? 0,
    avgViews30d: r.avgViews30d ?? 0,
    isMainCompetitor: Boolean(r.isMainCompetitor),
  }));
}

export function writeCreators(creators: Creator[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM creators WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO creators (id, workspace_id, username, category, profilePicUrl, followers, reelsCount30d, avgViews30d, lastScrapedAt, isMainCompetitor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const c of creators) {
      ins.run(c.id, workspaceId, c.username, c.category, c.profilePicUrl, c.followers, c.reelsCount30d, c.avgViews30d, c.lastScrapedAt, c.isMainCompetitor ? 1 : 0);
    }
  });
  tx();
}

// ─────────────────────── Videos ───────────────────────

export function readVideos(workspaceId?: string): Video[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM videos WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM videos").all();
  return (rows as any[]).map(r => ({
    ...r,
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    comments: r.comments ?? 0,
    starred: Boolean(r.starred),
  }));
}

export function writeVideos(videos: Video[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM videos WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO videos (id, workspace_id, link, thumbnail, creator, views, likes, comments, analysis, newConcepts, datePosted, dateAdded, configName, starred) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const v of videos) {
      ins.run(v.id, workspaceId, v.link, v.thumbnail, v.creator, v.views, v.likes, v.comments, v.analysis, v.newConcepts, v.datePosted, v.dateAdded, v.configName, v.starred ? 1 : 0);
    }
  });
  tx();
}

export function appendVideo(video: Video, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const ins = db.prepare("INSERT INTO videos (id, workspace_id, link, thumbnail, creator, views, likes, comments, analysis, newConcepts, datePosted, dateAdded, configName, starred) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  ins.run(video.id, workspaceId, video.link, video.thumbnail, video.creator, video.views, video.likes, video.comments, video.analysis, video.newConcepts, video.datePosted, video.dateAdded, video.configName, video.starred ? 1 : 0);
}

/**
 * Patch just the `analysis` field for a single video, in place.
 * Used after scraping, once the original-video AI analysis (hook/body/CTA
 * source material) comes back — avoids a full readVideos()/writeVideos()
 * round trip for every video in a scan.
 */
export function updateVideoAnalysis(videoId: string, analysis: string, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  db.prepare("UPDATE videos SET analysis = ? WHERE id = ? AND workspace_id = ?").run(analysis, videoId, workspaceId);
}

// ─────────────────────── Strategies ───────────────────────

export function readStrategies(workspaceId?: string): Strategy[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM strategies WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM strategies").all();
  return (rows as any[]).map(r => ({
    ...r,
    platforms: safeJsonParse(r.platforms, []),
    contentPillars: safeJsonParse(r.contentPillars, []),
    cadenceReels: r.cadenceReels ?? 0,
    cadenceCarousels: r.cadenceCarousels ?? 0,
    cadenceLinkedIn: r.cadenceLinkedIn ?? 0,
    cadenceYouTube: r.cadenceYouTube ?? 0,
    cadenceX: r.cadenceX ?? 0,
    postingTimes: safeJsonParse(r.postingTimes, {}),
    optimalDays: safeJsonParse(r.optimalDays, {}),
  }));
}

export function writeStrategies(strategies: Strategy[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM strategies WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO strategies (id, workspace_id, strategyName, configName, platforms, contentPillars, cadenceReels, cadenceCarousels, cadenceLinkedIn, cadenceYouTube, cadenceX, brandVoice, monthlyTheme, targetAudience, postingTimes, optimalDays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const s of strategies) {
      ins.run(s.id, workspaceId, s.strategyName, s.configName, JSON.stringify(s.platforms), JSON.stringify(s.contentPillars), s.cadenceReels, s.cadenceCarousels, s.cadenceLinkedIn, s.cadenceYouTube, s.cadenceX, s.brandVoice, s.monthlyTheme, s.targetAudience, JSON.stringify(s.postingTimes), JSON.stringify(s.optimalDays));
    }
  });
  tx();
}

// ─────────────────────── Scripts ───────────────────────

export function readScripts(workspaceId?: string): Script[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM scripts WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM scripts").all();
  return (rows as any[]).map(r => ({
    ...r,
    performanceViews: r.performanceViews ?? 0,
    performanceLikes: r.performanceLikes ?? 0,
  }));
}

export function writeScripts(scripts: Script[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM scripts WHERE workspace_id = ?");
  const ins = db.prepare(`INSERT OR REPLACE INTO scripts
    (id, workspace_id, title, platform, contentPillar, hook, body, cta, status,
     sourceVideoId, sourceCompetitor, strategyName, generatedAt, laraApprovedAt, laraNotes,
     hanaApprovedAt, hanaNotes, briefGeneratedAt, scheduledAt, filmedAt, postedAt,
     performanceViews, performanceLikes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const s of scripts) {
      ins.run(s.id, workspaceId, s.title, s.platform, s.contentPillar, s.hook, s.body, s.cta, s.status,
        s.sourceVideoId, s.sourceCompetitor, s.strategyName, s.generatedAt, s.laraApprovedAt, s.laraNotes,
        s.hanaApprovedAt, s.hanaNotes, s.briefGeneratedAt, s.scheduledAt, s.filmedAt, s.postedAt,
        s.performanceViews, s.performanceLikes);
    }
  });
  tx();
}

export function appendScript(script: Script, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const ins = db.prepare(`INSERT INTO scripts
    (id, workspace_id, title, platform, contentPillar, hook, body, cta, status,
     sourceVideoId, sourceCompetitor, strategyName, generatedAt, laraApprovedAt, laraNotes,
     hanaApprovedAt, hanaNotes, briefGeneratedAt, scheduledAt, filmedAt, postedAt,
     performanceViews, performanceLikes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  ins.run(script.id, workspaceId, script.title, script.platform, script.contentPillar, script.hook, script.body, script.cta, script.status,
    script.sourceVideoId, script.sourceCompetitor, script.strategyName, script.generatedAt, script.laraApprovedAt, script.laraNotes,
    script.hanaApprovedAt, script.hanaNotes, script.briefGeneratedAt, script.scheduledAt, script.filmedAt, script.postedAt,
    script.performanceViews, script.performanceLikes);
}

// ─────────────────────── Production Briefs ───────────────────────

export function readBriefs(workspaceId?: string): ProductionBrief[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM production_briefs WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM production_briefs").all();
  return (rows as any[]).map(r => ({
    ...r,
    estimatedFilmingMinutes: r.estimatedFilmingMinutes ?? 0,
  }));
}

export function writeBriefs(briefs: ProductionBrief[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM production_briefs WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO production_briefs (id, workspace_id, scriptId, location, props, brollNeeded, audioType, estimatedFilmingMinutes, talent, shotList, notes, generatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const b of briefs) {
      ins.run(b.id, workspaceId, b.scriptId, b.location, b.props, b.brollNeeded, b.audioType, b.estimatedFilmingMinutes, b.talent, b.shotList, b.notes, b.generatedAt);
    }
  });
  tx();
}

export function appendBrief(brief: ProductionBrief, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const ins = db.prepare("INSERT INTO production_briefs (id, workspace_id, scriptId, location, props, brollNeeded, audioType, estimatedFilmingMinutes, talent, shotList, notes, generatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  ins.run(brief.id, workspaceId, brief.scriptId, brief.location, brief.props, brief.brollNeeded, brief.audioType, brief.estimatedFilmingMinutes, brief.talent, brief.shotList, brief.notes, brief.generatedAt);
}

// ─────────────────────── Calendar Events ───────────────────────

export function readCalendar(workspaceId?: string): CalendarEvent[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM calendar_events WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM calendar_events").all();
  return rows as CalendarEvent[];
}

export function writeCalendar(events: CalendarEvent[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM calendar_events WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO calendar_events (id, workspace_id, scriptId, title, platform, scheduledDate, scheduledTime, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const e of events) {
      ins.run(e.id, workspaceId, e.scriptId, e.title, e.platform, e.scheduledDate, e.scheduledTime, e.status, e.notes, e.createdAt);
    }
  });
  tx();
}

export function appendCalendarEvent(event: CalendarEvent, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const ins = db.prepare("INSERT INTO calendar_events (id, workspace_id, scriptId, title, platform, scheduledDate, scheduledTime, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  ins.run(event.id, workspaceId, event.scriptId, event.title, event.platform, event.scheduledDate, event.scheduledTime, event.status, event.notes, event.createdAt);
}

// ─────────────────────── Brand Voices ───────────────────────

export function readBrandVoices(workspaceId?: string): BrandVoice[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM brand_voices WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM brand_voices").all();
  return rows as BrandVoice[];
}

export function writeBrandVoices(voices: BrandVoice[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM brand_voices WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO brand_voices (id, workspace_id, strategyId, brandName, principles, communicationFramework, bannedWords, registerRules, voiceDescription, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const v of voices) {
      ins.run(v.id, workspaceId, v.strategyId, v.brandName, v.principles, v.communicationFramework, v.bannedWords, v.registerRules, v.voiceDescription, v.createdAt, v.updatedAt);
    }
  });
  tx();
}

// ─────────────────────── Brands ───────────────────────

export function readBrands(workspaceId?: string): Brand[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM brands WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM brands").all();
  return rows as Brand[];
}

export function writeBrands(brands: Brand[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM brands WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO brands (id, workspace_id, name, slug, logoUrl, primaryColor, description, configName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const b of brands) {
      ins.run(b.id, workspaceId, b.name, b.slug, b.logoUrl, b.primaryColor, b.description, b.configName, b.createdAt, b.updatedAt);
    }
  });
  tx();
}

// ─────────────────────── Social Connections ───────────────────────

export function readConnections(workspaceId?: string): SocialConnection[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM social_connections WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM social_connections").all();
  return (rows as any[]).map(r => ({
    ...r,
    scopes: safeJsonParse(r.scopes, []),
    isActive: Boolean(r.isActive),
    followerCount: r.followerCount ?? 0,
  }));
}

export function writeConnections(connections: SocialConnection[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM social_connections WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO social_connections (id, workspace_id, brandId, platform, accountHandle, accountName, accessToken, refreshToken, tokenExpiresAt, scopes, connectedAt, lastSyncedAt, isActive, followerCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const c of connections) {
      ins.run(c.id, workspaceId, c.brandId, c.platform, c.accountHandle, c.accountName, c.accessToken, c.refreshToken, c.tokenExpiresAt, JSON.stringify(c.scopes), c.connectedAt, c.lastSyncedAt, c.isActive ? 1 : 0, c.followerCount);
    }
  });
  tx();
}

// ─────────────────────── Platform Analytics ───────────────────────

export function readAnalytics(workspaceId?: string): PlatformAnalytics[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM platform_analytics WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM platform_analytics").all();
  return rows as PlatformAnalytics[];
}

export function writeAnalytics(analytics: PlatformAnalytics[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  // analytics uses append pattern usually
  const ins = db.prepare("INSERT OR REPLACE INTO platform_analytics (id, workspace_id, connectionId, platform, postId, postUrl, title, publishedAt, views, likes, comments, shares, saves, reach, engagementRate, fetchedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    for (const a of analytics) {
      ins.run(a.id, workspaceId, a.connectionId, a.platform, a.postId, a.postUrl, a.title, a.publishedAt, a.views, a.likes, a.comments, a.shares, a.saves, a.reach, a.engagementRate, a.fetchedAt);
    }
  });
  tx();
}

// ─────────────────────── Viral Ideas ───────────────────────

export function readViralIdeas(workspaceId?: string): ViralIdea[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM viral_ideas WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM viral_ideas").all();
  return (rows as any[]).map(r => ({
    ...r,
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    comments: r.comments ?? 0,
    creatorAvgViews: r.creatorAvgViews ?? 0,
    viralMultiplier: r.viralMultiplier ?? 0,
  }));
}

export function writeViralIdeas(ideas: ViralIdea[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM viral_ideas WHERE workspace_id = ?");
  const ins = db.prepare(`INSERT OR REPLACE INTO viral_ideas
    (id, workspace_id, videoId, creator, link, thumbnail, views, likes, comments,
     creatorAvgViews, viralMultiplier, originalScript, originalHook, originalBody, originalCTA,
     adaptedScript, adaptedHook, adaptedBody, adaptedCTA, sevenBricksAnalysis,
     contentPillar, status, configName, platform, dateDetected, dateAnalyzed, dateScripted, laraNotes, hanaNotes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const idea of ideas) {
      ins.run(idea.id, workspaceId, idea.videoId, idea.creator, idea.link, idea.thumbnail,
        idea.views, idea.likes, idea.comments, idea.creatorAvgViews, idea.viralMultiplier,
        idea.originalScript, idea.originalHook, idea.originalBody, idea.originalCTA,
        idea.adaptedScript, idea.adaptedHook, idea.adaptedBody, idea.adaptedCTA, idea.sevenBricksAnalysis,
        idea.contentPillar, idea.status, idea.configName, idea.platform,
        idea.dateDetected, idea.dateAnalyzed, idea.dateScripted, idea.laraNotes, idea.hanaNotes);
    }
  });
  tx();
}

export function appendViralIdea(idea: ViralIdea, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const ins = db.prepare(`INSERT INTO viral_ideas
    (id, workspace_id, videoId, creator, link, thumbnail, views, likes, comments,
     creatorAvgViews, viralMultiplier, originalScript, originalHook, originalBody, originalCTA,
     adaptedScript, adaptedHook, adaptedBody, adaptedCTA, sevenBricksAnalysis,
     contentPillar, status, configName, platform, dateDetected, dateAnalyzed, dateScripted, laraNotes, hanaNotes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  ins.run(idea.id, workspaceId, idea.videoId, idea.creator, idea.link, idea.thumbnail,
    idea.views, idea.likes, idea.comments, idea.creatorAvgViews, idea.viralMultiplier,
    idea.originalScript, idea.originalHook, idea.originalBody, idea.originalCTA,
    idea.adaptedScript, idea.adaptedHook, idea.adaptedBody, idea.adaptedCTA, idea.sevenBricksAnalysis,
    idea.contentPillar, idea.status, idea.configName, idea.platform,
    idea.dateDetected, idea.dateAnalyzed, idea.dateScripted, idea.laraNotes, idea.hanaNotes);
}

// ─────────────────────── API Keys ───────────────────────

export function readApiKeys(workspaceId?: string): UserApiKey[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM api_keys WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM api_keys").all();
  return (rows as any[]).map(r => ({
    ...r,
    isValid: Boolean(r.isValid),
  }));
}

export function writeApiKeys(keys: UserApiKey[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM api_keys WHERE workspace_id = ?");
  const ins = db.prepare("INSERT OR REPLACE INTO api_keys (id, workspace_id, service, keyValue, isValid, lastValidatedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    del.run(workspaceId);
    for (const k of keys) {
      ins.run(k.id, workspaceId, k.service, k.keyValue, k.isValid ? 1 : 0, k.lastValidatedAt, k.createdAt, k.updatedAt);
    }
  });
  tx();
}

export function getApiKey(service: UserApiKey["service"], workspaceId?: string): string | undefined {
  const db = getDb();
  const row: any = workspaceId
    ? db.prepare("SELECT keyValue FROM api_keys WHERE service = ? AND isValid = 1 AND workspace_id = ?").get(service, workspaceId)
    : db.prepare("SELECT keyValue FROM api_keys WHERE service = ? AND isValid = 1").get(service);
  return row?.keyValue;
}

// ─────────────────────── AI Settings ───────────────────────

export function readAiSettings(workspaceId?: string): import("./types").AIUserSettings | null {
  const db = getDb();
  const row: any = workspaceId
    ? db.prepare("SELECT * FROM ai_settings WHERE workspace_id = ?").get(workspaceId)
    : db.prepare("SELECT * FROM ai_settings LIMIT 1").get();
  if (!row) return null;
  const validProviders = ["gemini", "anthropic", "openai", "openrouter", "opencode"] as const;
  const parseProvider = (p: string): import("./types").AIProviderType => {
    return validProviders.includes(p as import("./types").AIProviderType) ? (p as import("./types").AIProviderType) : "gemini";
  };
  return {
    videoAnalysisProvider: parseProvider(row.videoAnalysisProvider || "gemini"),
    videoAnalysisModel: row.videoAnalysisModel || "gemini-2.0-flash",
    scriptProvider: parseProvider(row.scriptProvider || "anthropic"),
    scriptModel: row.scriptModel || "claude-sonnet-4-5-20250929",
  };
}

export function writeAiSettings(settings: import("./types").AIUserSettings, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO ai_settings (workspace_id, videoAnalysisProvider, videoAnalysisModel, scriptProvider, scriptModel)
    VALUES (?, ?, ?, ?, ?)`)
    .run(workspaceId, settings.videoAnalysisProvider, settings.videoAnalysisModel, settings.scriptProvider, settings.scriptModel);
}

// ─────────────────────── Usage Records ───────────────────────

export function readUsage(workspaceId?: string): UsageRecord[] {
  const db = getDb();
  const rows = workspaceId
    ? db.prepare("SELECT * FROM usage_records WHERE workspace_id = ?").all(workspaceId)
    : db.prepare("SELECT * FROM usage_records").all();
  return rows as UsageRecord[];
}

export function writeUsage(records: UsageRecord[], workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  const ins = db.prepare("INSERT OR REPLACE INTO usage_records (id, workspace_id, service, action, costEstimate, status, timestamp, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const tx = db.transaction(() => {
    for (const r of records) {
      ins.run(r.id, workspaceId, r.service, r.action, r.costEstimate, r.status, r.timestamp, r.details);
    }
  });
  tx();
}

export function appendUsage(record: UsageRecord, workspaceId = DEFAULT_WORKSPACE): void {
  const db = getDb();
  db.prepare("INSERT INTO usage_records (id, workspace_id, service, action, costEstimate, status, timestamp, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(record.id, workspaceId, record.service, record.action, record.costEstimate, record.status, record.timestamp, record.details);
}

// ─────────────────────── Helpers ───────────────────────

function safeJsonParse<T>(str: string | undefined | null, fallback: T): T {
  try {
    if (!str || str === "undefined") return fallback;
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
