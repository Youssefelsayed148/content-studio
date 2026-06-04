export interface ApifyReel {
  videoUrl: string;
  url: string;
  displayUrl: string;
  videoPlayCount: number;
  likesCount: number;
  commentsCount: number;
  ownerUsername: string;
  images: string[];
  timestamp: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  views?: number;
}

interface ApifyProfileResult {
  profilePicUrl: string;
  followersCount: number;
}

export interface CreatorStats {
  profilePicUrl: string;
  followers: number;
  reelsCount30d: number;
  avgViews30d: number;
}

import { getApiKey } from "./csv";

function getToken(): string {
  // Try user-provided key first, fall back to env var
  const userKey = getApiKey("apify");
  if (userKey) return userKey;
  const envToken = process.env.APIFY_API_TOKEN;
  if (envToken) return envToken;
  throw new Error("Apify API key not configured. Add your key in Settings > API Status.");
}

export async function scrapeReels(
  username: string,
  maxVideos: number,
  nDays: number
): Promise<ApifyReel[]> {
  const token = getToken();

  const sinceDate = new Date(Date.now() - nDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addParentData: false,
        directUrls: [`https://www.instagram.com/${username}/`],
        enhanceUserSearchWithFacebookPage: false,
        isUserReelFeedURL: false,
        isUserTaggedFeedURL: false,
        onlyPostsNewerThan: sinceDate,
        resultsLimit: maxVideos,
        resultsType: "posts",
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify error ${response.status}: ${text}`);
  }

  const data = await response.json();
  // Filter to only video posts (Reels / video posts have videoUrl)
  const videoPosts = (data as ApifyReel[]).filter(
    (item) => item.videoUrl && item.videoUrl.trim().length > 0
  );
  return videoPosts;
}

/**
 * Scrape specific Instagram posts by their direct URLs.
 * Returns post metadata including fresh thumbnail URLs.
 */
export async function scrapePostsByUrls(urls: string[]): Promise<ApifyReel[]> {
  if (urls.length === 0) return [];
  const token = getToken();

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addParentData: false,
        directUrls: urls,
        enhanceUserSearchWithFacebookPage: false,
        isUserReelFeedURL: false,
        isUserTaggedFeedURL: false,
        resultsLimit: urls.length,
        resultsType: "posts",
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const videoPosts = (data as ApifyReel[]).filter(
    (item) => item.videoUrl && item.videoUrl.trim().length > 0
  );
  return videoPosts;
}

/**
 * Scrape TikTok videos by their direct URLs.
 * Uses Apify's TikTok scraper actor.
 */
export async function scrapeTikTokVideosByUrls(urls: string[]): Promise<ApifyReel[]> {
  if (urls.length === 0) return [];
  const token = getToken();

  // Try multiple TikTok actors
  const actors = [
    "apify~tiktok-scraper",
    "clockworks~free-tiktok-scraper",
  ];

  let lastError = "";
  for (const actor of actors) {
    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startUrls: urls.map((url) => ({ url })),
            maxItemsPerSearch: urls.length,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        lastError = `Apify TikTok error ${response.status}: ${text}`;
        continue;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        lastError = "No TikTok data returned";
        continue;
      }

      // Map TikTok data to ApifyReel format
      return (data as any[]).map((item) => ({
        videoUrl: item.videoUrl || item.videoDownloadUrl || "",
        url: item.webVideoUrl || item.url || urls[0],
        displayUrl: item.coverThumbUrl || item.videoMeta?.coverUrl || item.video?.cover || "",
        videoPlayCount: item.playCount || item.stats?.playCount || item.videoMeta?.playCount || 0,
        likesCount: item.diggCount || item.stats?.diggCount || item.videoMeta?.diggCount || 0,
        commentsCount: item.commentCount || item.stats?.commentCount || item.videoMeta?.commentCount || 0,
        ownerUsername: item.authorMeta?.name || item.authorMeta?.nickName || item.author?.uniqueId || "unknown",
        images: [],
        timestamp: item.createTimeISO || item.createTime || new Date().toISOString(),
        caption: item.text || item.desc || "",
        hashtags: item.hashtags?.map((h: any) => h.name || h) || [],
        mentions: item.mentions || [],
        views: item.playCount || 0,
      }));
    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  throw new Error(lastError || "All TikTok scrapers failed");
}

export async function scrapeCreatorStats(username: string): Promise<CreatorStats> {
  const token = getToken();

  // 1. Get profile info (details mode)
  const profileRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "details",
        resultsLimit: 1,
      }),
    }
  );

  if (!profileRes.ok) {
    const text = await profileRes.text();
    throw new Error(`Apify profile error ${profileRes.status}: ${text}`);
  }

  const profileData = await profileRes.json() as ApifyProfileResult[];
  const profile = profileData[0] || {};
  const profilePicUrl = profile.profilePicUrl || "";
  const followers = profile.followersCount || 0;

  // 2. Get recent posts (last 30 days) to compute activity metrics
  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const postsRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit: 100,
        onlyPostsNewerThan: sinceDate,
        addParentData: false,
      }),
    }
  );

  if (!postsRes.ok) {
    const text = await postsRes.text();
    throw new Error(`Apify posts error ${postsRes.status}: ${text}`);
  }

  const posts = await postsRes.json() as ApifyReel[];

  // Filter to only video posts within 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentReels = posts.filter(
    (p) => p.videoUrl && p.timestamp && new Date(p.timestamp) >= cutoff
  );

  const reelsCount30d = recentReels.length;
  const avgViews30d = reelsCount30d > 0
    ? Math.round(recentReels.reduce((sum, r) => sum + (r.videoPlayCount || 0), 0) / reelsCount30d)
    : 0;

  return { profilePicUrl, followers, reelsCount30d, avgViews30d };
}
