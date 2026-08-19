import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = path.join(process.cwd(), "..", "data");
let _db: Database.Database | null = null;
let _schemaReady = false;

function getOrCreateDbPath(): string {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  return path.join(DATA_DIR, "content-studio.db");
}

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = getOrCreateDbPath();
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function ensureSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(SQL_SCHEMA);
  _schemaReady = true;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    _schemaReady = false;
  }
}

const SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Workspace',
  slug TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS configs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  configName TEXT,
  creatorsCategory TEXT,
  analysisInstruction TEXT,
  newConceptsInstruction TEXT
);

CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  username TEXT,
  category TEXT,
  profilePicUrl TEXT,
  followers INTEGER DEFAULT 0,
  reelsCount30d INTEGER DEFAULT 0,
  avgViews30d INTEGER DEFAULT 0,
  lastScrapedAt TEXT,
  isMainCompetitor INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  link TEXT,
  thumbnail TEXT,
  creator TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  analysis TEXT,
  newConcepts TEXT,
  datePosted TEXT,
  dateAdded TEXT,
  configName TEXT,
  starred INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  strategyName TEXT,
  configName TEXT,
  platforms TEXT DEFAULT '[]',
  contentPillars TEXT DEFAULT '[]',
  cadenceReels INTEGER DEFAULT 0,
  cadenceCarousels INTEGER DEFAULT 0,
  cadenceLinkedIn INTEGER DEFAULT 0,
  cadenceYouTube INTEGER DEFAULT 0,
  cadenceX INTEGER DEFAULT 0,
  brandVoice TEXT,
  monthlyTheme TEXT,
  targetAudience TEXT,
  postingTimes TEXT DEFAULT '{}',
  optimalDays TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT,
  platform TEXT,
  contentPillar TEXT,
  hook TEXT,
  body TEXT,
  cta TEXT,
  status TEXT DEFAULT 'generated',
  sourceVideoId TEXT,
  sourceCompetitor TEXT,
  strategyName TEXT,
  generatedAt TEXT,
  laraApprovedAt TEXT,
  laraNotes TEXT,
  hanaApprovedAt TEXT,
  hanaNotes TEXT,
  briefGeneratedAt TEXT,
  scheduledAt TEXT,
  filmedAt TEXT,
  postedAt TEXT,
  performanceViews INTEGER DEFAULT 0,
  performanceLikes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_briefs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  scriptId TEXT,
  location TEXT,
  props TEXT,
  brollNeeded TEXT,
  audioType TEXT,
  estimatedFilmingMinutes INTEGER DEFAULT 0,
  talent TEXT,
  shotList TEXT,
  notes TEXT,
  generatedAt TEXT
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  scriptId TEXT,
  title TEXT,
  platform TEXT,
  scheduledDate TEXT,
  scheduledTime TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS brand_voices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  strategyId TEXT,
  brandName TEXT,
  principles TEXT,
  communicationFramework TEXT,
  bannedWords TEXT,
  registerRules TEXT,
  voiceDescription TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT,
  slug TEXT,
  logoUrl TEXT,
  primaryColor TEXT,
  description TEXT,
  configName TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS social_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  brandId TEXT,
  platform TEXT,
  accountHandle TEXT,
  accountName TEXT,
  accessToken TEXT,
  refreshToken TEXT,
  tokenExpiresAt TEXT,
  scopes TEXT DEFAULT '[]',
  connectedAt TEXT,
  lastSyncedAt TEXT,
  isActive INTEGER DEFAULT 0,
  followerCount INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS platform_analytics (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  connectionId TEXT,
  platform TEXT,
  postId TEXT,
  postUrl TEXT,
  title TEXT,
  publishedAt TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagementRate REAL DEFAULT 0,
  fetchedAt TEXT
);

CREATE TABLE IF NOT EXISTS viral_ideas (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  videoId TEXT,
  creator TEXT,
  link TEXT,
  thumbnail TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  creatorAvgViews INTEGER DEFAULT 0,
  viralMultiplier REAL DEFAULT 0,
  originalScript TEXT,
  originalHook TEXT,
  originalBody TEXT,
  originalCTA TEXT,
  adaptedScript TEXT,
  adaptedHook TEXT,
  adaptedBody TEXT,
  adaptedCTA TEXT,
  sevenBricksAnalysis TEXT,
  contentPillar TEXT,
  status TEXT DEFAULT 'detected',
  configName TEXT,
  platform TEXT DEFAULT 'tiktok',
  dateDetected TEXT,
  dateAnalyzed TEXT,
  dateScripted TEXT,
  laraNotes TEXT,
  hanaNotes TEXT
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  service TEXT,
  keyValue TEXT,
  isValid INTEGER DEFAULT 0,
  lastValidatedAt TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS ai_settings (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),
  videoAnalysisProvider TEXT DEFAULT 'gemini',
  videoAnalysisModel TEXT DEFAULT 'gemini-2.0-flash',
  scriptProvider TEXT DEFAULT 'anthropic',
  scriptModel TEXT DEFAULT 'claude-sonnet-4-5-20250929'
);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  service TEXT,
  action TEXT,
  costEstimate REAL DEFAULT 0,
  status TEXT DEFAULT 'success',
  timestamp TEXT,
  details TEXT
);

-- Background scan jobs (e.g. "Scan Main Competitors"). Lets a slow scrape+AI
-- pipeline run past the Cloudflare/proxy request timeout: the POST route
-- creates a row and returns immediately, the actual work updates this row
-- as it progresses, and the frontend polls GET /scan-status/:id instead of
-- holding one long-lived request open.
CREATE TABLE IF NOT EXISTS scan_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  status TEXT NOT NULL DEFAULT 'running', -- running | done | failed
  configName TEXT,
  progressStep TEXT,
  progressCurrent INTEGER DEFAULT 0,
  progressTotal INTEGER DEFAULT 0,
  result TEXT,
  error TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;
