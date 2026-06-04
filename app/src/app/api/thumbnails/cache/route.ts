import { NextResponse } from "next/server";
import { readVideos, readViralIdeas } from "@/lib/csv";
import { downloadThumbnail, getLocalThumbnailPath } from "@/lib/thumbnail-cache";

/**
 * Batch cache thumbnails for videos/viral ideas.
 * Call this after scraping to ensure thumbnails are stored locally.
 */
export async function POST() {
  const videos = readVideos();
  const viralIdeas = readViralIdeas();

  const results: { videoId: string; success: boolean; path: string | null }[] = [];

  // Cache thumbnails for viral ideas
  for (const idea of viralIdeas) {
    const localPath = getLocalThumbnailPath(idea.videoId);
    if (localPath) {
      results.push({ videoId: idea.videoId, success: true, path: localPath });
      continue;
    }
    if (idea.thumbnail) {
      const cached = await downloadThumbnail(idea.thumbnail, idea.videoId, idea.link);
      results.push({ videoId: idea.videoId, success: !!cached, path: cached });
    }
  }

  // Also cache for regular videos that aren't in viral ideas
  const viralVideoIds = new Set(viralIdeas.map((v) => v.videoId));
  for (const video of videos) {
    if (viralVideoIds.has(video.id)) continue;
    const localPath = getLocalThumbnailPath(video.id);
    if (localPath) continue;
    if (video.thumbnail) {
      await downloadThumbnail(video.thumbnail, video.id, video.link);
    }
  }

  const cached = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({ success: true, cached, failed, total: results.length });
}

/**
 * Check which thumbnails are cached.
 */
export async function GET() {
  const videos = readVideos();
  const viralIdeas = readViralIdeas();

  const allIds = new Set([...videos.map((v) => v.id), ...viralIdeas.map((v) => v.videoId)]);
  const cached: Record<string, boolean> = {};

  for (const id of allIds) {
    cached[id] = !!getLocalThumbnailPath(id);
  }

  return NextResponse.json({ cached, total: allIds.size });
}