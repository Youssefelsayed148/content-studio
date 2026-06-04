import { NextResponse } from "next/server";
import { readVideos, readViralIdeas } from "@/lib/csv";
import { scrapePostsByUrls } from "@/lib/apify";
import { downloadThumbnail, getLocalThumbnailPath } from "@/lib/thumbnail-cache";
import type { Video } from "@/lib/types";

/**
 * Refresh thumbnails for existing videos by re-scraping their post URLs.
 * This gets fresh CDN URLs from Instagram via Apify, then downloads them locally.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoIds, limit = 50 } = body;

    // Get videos that need thumbnail refresh
    const allVideos = readVideos();
    const viralIdeas = readViralIdeas();
    const viralVideoIds = new Set(viralIdeas.map((v) => v.videoId));

    // Prioritize: 1) viral idea videos, 2) recently added, 3) rest
    let videosToRefresh = allVideos
      .filter((v) => {
        // Skip if already cached locally
        if (getLocalThumbnailPath(v.id)) return false;
        // If specific IDs requested, only include those
        if (videoIds && videoIds.length > 0) return videoIds.includes(v.id);
        return true;
      })
      .sort((a, b) => {
        // Prioritize viral videos
        const aViral = viralVideoIds.has(a.id) ? 1 : 0;
        const bViral = viralVideoIds.has(b.id) ? 1 : 0;
        if (aViral !== bViral) return bViral - aViral;
        // Then by date added (newest first)
        return (b.dateAdded || "").localeCompare(a.dateAdded || "");
      })
      .slice(0, limit);

    if (videosToRefresh.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All thumbnails already cached",
        refreshed: 0,
        failed: 0,
        details: [],
      });
    }

    // Scrape posts in batches of 10 (Apify handles multiple URLs)
    const batchSize = 10;
    const results: { videoId: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < videosToRefresh.length; i += batchSize) {
      const batch = videosToRefresh.slice(i, i + batchSize);
      // Deduplicate URLs — Apify rejects duplicates
      const urlSet = new Map<string, Video>();
      for (const v of batch) {
        if (v.link && !urlSet.has(v.link)) urlSet.set(v.link, v);
      }
      const uniqueBatch = Array.from(urlSet.values());
      const urls = uniqueBatch.map((v) => v.link);

      try {
        const scrapedPosts = await scrapePostsByUrls(urls);

        // Create a map of URL -> scraped post
        const postMap = new Map(scrapedPosts.map((p) => [p.url, p]));

        for (const video of uniqueBatch) {
          const post = postMap.get(video.link);
          const thumbnailUrl = post?.displayUrl || post?.images?.[0];
          if (thumbnailUrl) {
            const cached = await downloadThumbnail(thumbnailUrl, video.id, video.link);
            results.push({
              videoId: video.id,
              success: !!cached,
              error: cached ? undefined : "Download failed",
            });
          } else {
            results.push({
              videoId: video.id,
              success: false,
              error: "No thumbnail found in scraped data",
            });
          }
        }
      } catch (err) {
        for (const video of batch) {
          results.push({
            videoId: video.id,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `Refreshed ${successCount} of ${results.length} thumbnails`,
      refreshed: successCount,
      failed: failCount,
      details: results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Refresh failed",
        refreshed: 0,
        failed: 0,
        details: [],
      },
      { status: 500 }
    );
  }
}
