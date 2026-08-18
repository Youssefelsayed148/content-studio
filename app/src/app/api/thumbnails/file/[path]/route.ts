import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { THUMBNAIL_DIR } from "@/lib/thumbnail-cache";

/**
 * Serve cached thumbnail files from the persistent thumbnail directory.
 * Fronted by the /thumbnails/:path* rewrite in next.config.ts so the public
 * URL contract (/thumbnails/<uuid>.jpg) is unchanged.
 *
 * Filenames are always `<uuid>.jpg` — strictly validated to keep the reader
 * inside the thumbnail directory.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  const { path: file } = await params;

  if (!/^[0-9a-fA-F-]{36}\.jpg$/.test(file)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filepath = path.join(THUMBNAIL_DIR, file);
  if (!existsSync(filepath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const data = readFileSync(filepath);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "image/jpeg",
      // Content-addressed filenames — safe to cache immutably.
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Length": String(data.length),
    },
  });
}
