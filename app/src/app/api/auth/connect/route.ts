import { NextResponse } from "next/server";

const PLATFORM_CONFIGS: Record<string, { name: string; authUrl: string; docsUrl: string; scopes: string[]; setupSteps: string[] }> = {
  tiktok: {
    name: "TikTok",
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web/",
    scopes: ["user.info.basic", "video.list"],
    setupSteps: [
      "Go to TikTok for Developers and create an app",
      "Add your redirect URI: {origin}/api/auth/tiktok/callback",
      "Copy your Client Key and add it to .env as TIKTOK_CLIENT_ID",
      "Return here and click Connect",
    ],
  },
  instagram: {
    name: "Instagram",
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    docsUrl: "https://developers.facebook.com/docs/instagram-basic-display-api/",
    scopes: ["instagram_basic", "instagram_content_publish"],
    setupSteps: [
      "Go to Facebook Developers and create an app",
      "Add Instagram Basic Display product",
      "Add your redirect URI: {origin}/api/auth/instagram/callback",
      "Copy your App ID and add it to .env as INSTAGRAM_CLIENT_ID",
      "Return here and click Connect",
    ],
  },
  youtube: {
    name: "YouTube",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    docsUrl: "https://developers.google.com/youtube/v3/guides/authentication",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.force-ssl"],
    setupSteps: [
      "Go to Google Cloud Console and create a project",
      "Enable YouTube Data API v3",
      "Create OAuth 2.0 credentials",
      "Add your redirect URI: {origin}/api/auth/youtube/callback",
      "Copy your Client ID and add it to .env as YOUTUBE_CLIENT_ID",
      "Return here and click Connect",
    ],
  },
  linkedin: {
    name: "LinkedIn",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
    scopes: ["r_basicprofile", "r_organization_social", "r_ads_reporting"],
    setupSteps: [
      "Go to LinkedIn Developers and create an app",
      "Request Marketing Developer Platform access",
      "Add your redirect URI: {origin}/api/auth/linkedin/callback",
      "Copy your Client ID and add it to .env as LINKEDIN_CLIENT_ID",
      "Return here and click Connect",
    ],
  },
  x: {
    name: "X / Twitter",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    docsUrl: "https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code",
    scopes: ["tweet.read", "users.read", "offline.access"],
    setupSteps: [
      "Go to X Developer Portal and create a project",
      "Enable OAuth 2.0 in app settings",
      "Add your redirect URI: {origin}/api/auth/x/callback",
      "Copy your Client ID and add it to .env as X_CLIENT_ID",
      "Return here and click Connect",
    ],
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const origin = searchParams.get("origin") || "http://localhost:3000";

  if (!platform || !PLATFORM_CONFIGS[platform]) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const config = PLATFORM_CONFIGS[platform];

  return NextResponse.json({
    platform,
    ...config,
    setupSteps: config.setupSteps.map((step) => step.replace("{origin}", origin)),
  });
}
