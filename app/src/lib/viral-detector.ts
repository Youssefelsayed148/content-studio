import { readVideos, readCreators } from "./csv";
import type { Video, Creator } from "./types";

export interface ViralDetectionResult {
  video: Video;
  creator: Creator;
  creatorAvgViews: number;
  viralMultiplier: number;
  isViral: boolean;
}

const DEFAULT_VIRAL_THRESHOLD = 2.0;

/**
 * Calculate a creator's average views from all historical videos.
 * Uses avgViews30d from creator profile as fallback if no video history exists.
 */
export function calculateCreatorAverage(creator: Creator, allVideos: Video[]): number {
  const creatorVideos = allVideos.filter((v) => v.creator === creator.username);
  
  if (creatorVideos.length > 0) {
    const totalViews = creatorVideos.reduce((sum, v) => sum + v.views, 0);
    return Math.round(totalViews / creatorVideos.length);
  }
  
  // Fallback to creator's 30-day average if available
  if (creator.avgViews30d > 0) {
    return creator.avgViews30d;
  }
  
  // Last resort: estimate from followers (typical engagement rate ~2-5%)
  return Math.round(creator.followers * 0.03);
}

/**
 * Detect viral videos from a batch of newly analyzed videos.
 * A video is viral if its views exceed the creator's average by the threshold multiplier.
 */
export function detectViralVideos(
  newVideos: Video[],
  allCreators: Creator[],
  allVideos: Video[],
  threshold: number = DEFAULT_VIRAL_THRESHOLD
): ViralDetectionResult[] {
  const results: ViralDetectionResult[] = [];
  
  for (const video of newVideos) {
    const creator = allCreators.find((c) => c.username === video.creator);
    if (!creator) continue;
    
    const creatorAvgViews = calculateCreatorAverage(creator, allVideos);
    const viralMultiplier = creatorAvgViews > 0 ? video.views / creatorAvgViews : 0;
    const isViral = viralMultiplier >= threshold;
    
    results.push({
      video,
      creator,
      creatorAvgViews,
      viralMultiplier,
      isViral,
    });
  }
  
  return results;
}

/**
 * Get a human-readable description of why a video went viral.
 */
export function explainVirality(result: ViralDetectionResult): string {
  const { video, creator, creatorAvgViews, viralMultiplier } = result;
  
  if (creatorAvgViews === 0) {
    return `@${creator.username}: ${video.views.toLocaleString()} views (no baseline data yet)`;
  }
  
  const percentAbove = Math.round((viralMultiplier - 1) * 100);
  return `@${creator.username}: ${video.views.toLocaleString()} views — ${percentAbove}% above their ${creatorAvgViews.toLocaleString()} average (${viralMultiplier.toFixed(1)}x)`;
}
