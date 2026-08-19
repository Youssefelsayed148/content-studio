export interface Config {
  id: string;
  configName: string;
  creatorsCategory: string;
  analysisInstruction: string;
  newConceptsInstruction: string;
}

export interface Creator {
  id: string;
  username: string;
  category: string;
  profilePicUrl: string;
  followers: number;
  reelsCount30d: number;
  avgViews30d: number;
  lastScrapedAt: string;
  isMainCompetitor: boolean;
}

export interface Video {
  id: string;
  link: string;
  thumbnail: string;
  creator: string;
  views: number;
  likes: number;
  comments: number;
  analysis: string;
  newConcepts: string;
  datePosted: string;
  dateAdded: string;
  configName: string;
  starred: boolean;
}

export interface Strategy {
  id: string;
  strategyName: string;
  configName: string;
  platforms: string[];
  contentPillars: string[];
  cadenceReels: number;
  cadenceCarousels: number;
  cadenceLinkedIn: number;
  cadenceYouTube: number;
  cadenceX: number;
  brandVoice: string;
  monthlyTheme: string;
  targetAudience: string;
  postingTimes: Record<string, string[]>;
  optimalDays: Record<string, string[]>;
}

export interface Script {
  id: string;
  title: string;
  platform: string;
  contentPillar: string;
  hook: string;
  body: string;
  cta: string;
  status: "generated" | "lara_review" | "lara_approved" | "hana_review" | "hana_approved" | "brief_generated" | "scheduled" | "filmed" | "posted";
  sourceVideoId: string;
  sourceCompetitor: string;
  strategyName: string;
  generatedAt: string;
  laraApprovedAt: string;
  laraNotes: string;
  hanaApprovedAt: string;
  hanaNotes: string;
  briefGeneratedAt: string;
  scheduledAt: string;
  filmedAt: string;
  postedAt: string;
  performanceViews: number;
  performanceLikes: number;
}

export interface ProductionBrief {
  id: string;
  scriptId: string;
  location: string;
  props: string;
  brollNeeded: string;
  audioType: string;
  estimatedFilmingMinutes: number;
  talent: string;
  shotList: string;
  notes: string;
  generatedAt: string;
}

export interface CalendarEvent {
  id: string;
  scriptId: string;
  title: string;
  platform: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "scheduled" | "filming_ready" | "filmed" | "posted" | "cancelled";
  notes: string;
  createdAt: string;
}

export interface BrandVoice {
  id: string;
  strategyId: string;
  brandName: string;
  principles: string;
  communicationFramework: string;
  bannedWords: string;
  registerRules: string;
  voiceDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  description: string;
  configName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialConnection {
  id: string;
  brandId: string;
  platform: "tiktok" | "instagram" | "youtube" | "linkedin" | "x";
  accountHandle: string;
  accountName: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scopes: string[];
  connectedAt: string;
  lastSyncedAt: string;
  isActive: boolean;
  followerCount: number;
}

export interface PlatformAnalytics {
  id: string;
  connectionId: string;
  platform: string;
  postId: string;
  postUrl: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagementRate: number;
  fetchedAt: string;
}

export interface UserApiKey {
  id: string;
  service: "apify" | "gemini" | "anthropic" | "openai" | "openrouter" | "opencode";
  keyValue: string;
  isValid: boolean;
  lastValidatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type AIProviderType = "gemini" | "anthropic" | "openai" | "openrouter" | "opencode";

export type AITaskType = "video-analysis" | "script-generation";

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProviderType;
  description: string;
  supportsVideo: boolean;
  maxTokens: number;
}

export interface AIUserSettings {
  videoAnalysisProvider: AIProviderType;
  videoAnalysisModel: string;
  scriptProvider: AIProviderType;
  scriptModel: string;
}

export interface UsageRecord {
  id: string;
  service: string;
  action: string;
  costEstimate: number;
  status: "success" | "error";
  timestamp: string;
  details: string;
}

export interface PipelineParams {
  configName: string;
  maxVideos: number;
  topK: number;
  nDays: number;
  platform?: string;
}

export interface ActiveTask {
  id: string;
  creator: string;
  step: string;
  views?: number;
}

export interface PipelineProgress {
  status: "idle" | "running" | "completed" | "error";
  phase: "scraping" | "analyzing" | "viral_detection" | "scripting" | "done";
  activeTasks: ActiveTask[];
  creatorsCompleted: number;
  creatorsTotal: number;
  creatorsScraped: number;
  videosAnalyzed: number;
  videosTotal: number;
  viralIdeasFound: number;
  scriptsGenerated: number;
  errors: string[];
  log: string[];
}

export interface ViralIdea {
  id: string;
  videoId: string;
  creator: string;
  link: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  creatorAvgViews: number;
  viralMultiplier: number;
  // Original competitor content
  originalScript: string;
  originalHook: string;
  originalBody: string;
  originalCTA: string;
  // Adapted brand content
  adaptedScript: string;
  adaptedHook: string;
  adaptedBody: string;
  adaptedCTA: string;
  // Deep analysis
  sevenBricksAnalysis: string;
  contentPillar: string;
  status: "detected" | "analyzed" | "scripted" | "lara_review" | "lara_approved" | "hana_review" | "hana_approved" | "brief_generated" | "scheduled" | "posted";
  configName: string;
  platform: string;
  dateDetected: string;
  dateAnalyzed: string;
  dateScripted: string;
  laraNotes: string;
  hanaNotes: string;
}
