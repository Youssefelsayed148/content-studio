import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const THUMBNAIL_DIR = path.join(process.cwd(), "public", "thumbnails");

// Ensure directory exists
if (!existsSync(THUMBNAIL_DIR)) {
  mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

/**
 * Extract Instagram shortcode from a Reel URL.
 */
function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch a fresh thumbnail URL from an Instagram post page's Open Graph meta tag.
 */
async function fetchFreshThumbnailUrl(instagramUrl: string): Promise<string | null> {
  const shortcode = extractShortcode(instagramUrl);
  if (!shortcode) return null;

  try {
    const response = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogMatch && ogMatch[1]) {
      return ogMatch[1].replace(/&amp;/g, "&");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Download a thumbnail image from a URL and save it locally.
 * If the direct URL fails (expired CDN), tries to fetch a fresh URL from the Instagram post page.
 * Returns the local path (relative to public/) or null if failed.
 */
export async function downloadThumbnail(
  url: string,
  videoId: string,
  instagramUrl?: string
): Promise<string | null> {
  if (!url || !videoId) return null;

  const filename = `${videoId}.jpg`;
  const filepath = path.join(THUMBNAIL_DIR, filename);
  const publicPath = `/thumbnails/${filename}`;

  // Already cached
  if (existsSync(filepath)) return publicPath;

  const imageUrls = [url];

  // If direct URL fails, try to get fresh URL from Instagram post page
  if (instagramUrl) {
    const freshUrl = await fetchFreshThumbnailUrl(instagramUrl);
    if (freshUrl && freshUrl !== url) {
      imageUrls.push(freshUrl);
    }
  }

  for (const imageUrl of imageUrls) {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
          "Referer": "https://www.instagram.com/",
        },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 1000) continue; // Too small, probably an error page

      writeFileSync(filepath, Buffer.from(buffer));
      return publicPath;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Get the local thumbnail path for a video.
 */
export function getLocalThumbnailPath(videoId: string): string | null {
  const filepath = path.join(THUMBNAIL_DIR, `${videoId}.jpg`);
  if (existsSync(filepath)) return `/thumbnails/${videoId}.jpg`;
  return null;
}