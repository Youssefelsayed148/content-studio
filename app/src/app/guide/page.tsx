"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TikTokLogo,
  InstagramLogo,
  YouTubeLogo,
  LinkedInLogo,
  XLogo,
} from "@/components/platform-logos";
import {
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Terminal,
  ArrowRight,
} from "lucide-react";

interface PlatformGuide {
  id: string;
  name: string;
  Logo: React.FC<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  borderColor: string;
  docsUrl: string;
  devPortalUrl: string;
  envPrefix: string;
  steps: { title: string; details: string[] }[];
  commonIssues: string[];
}

const PLATFORMS: PlatformGuide[] = [
  {
    id: "tiktok",
    name: "TikTok",
    Logo: TikTokLogo,
    color: "text-white",
    bgColor: "bg-[#111111]",
    borderColor: "border-white/10",
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web/",
    devPortalUrl: "https://developers.tiktok.com/",
    envPrefix: "TIKTOK",
    steps: [
      {
        title: "Create a TikTok Developer App",
        details: [
          "Go to TikTok for Developers and sign in with your TikTok Business account",
          "Click 'Manage apps' then 'Connect an app'",
          "Fill in app name: 'Content Studio' and category: 'Analytics'",
          "Add redirect URI: http://localhost:3000/api/auth/tiktok/callback",
          "Click 'Create'",
        ],
      },
      {
        title: "Get Your API Credentials",
        details: [
          "From your app dashboard, copy the 'Client Key'",
          "Copy the 'Client Secret' (you may need to reveal it)",
          "Keep these safe — you will not be able to see the secret again",
        ],
      },
      {
        title: "Add to Your .env File",
        details: [
          "Open the .env file in the app/ folder",
          "Add the two lines shown in the code box below",
          "Save the file",
        ],
      },
      {
        title: "Connect in the Dashboard",
        details: [
          "Restart the app: npm run dev",
          "Go to the Connections page in the sidebar",
          "Click 'Connect TikTok' and authorize your account",
        ],
      },
    ],
    commonIssues: [
      "You need a TikTok Business account, not a personal account",
      "The redirect URI must match exactly — check for trailing slashes",
      "If you see 'Invalid redirect URI', double-check the URL in your TikTok app settings",
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    Logo: InstagramLogo,
    color: "text-pink-400",
    bgColor: "bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10",
    borderColor: "border-pink-500/20",
    docsUrl: "https://developers.facebook.com/docs/instagram-basic-display-api/",
    devPortalUrl: "https://developers.facebook.com/",
    envPrefix: "INSTAGRAM",
    steps: [
      {
        title: "Create a Facebook Developer App",
        details: [
          "Go to Facebook Developers and sign in",
          "Click 'My Apps' then 'Create App'",
          "Select 'Business' as the app type",
          "Name it 'Content Studio' and click 'Create'",
        ],
      },
      {
        title: "Add Instagram Product",
        details: [
          "In your app's left sidebar, click 'Add Product'",
          "Find 'Instagram Basic Display' and click 'Set Up'",
          "Scroll to 'User Token Generator' section",
          "Add your Instagram Business account",
        ],
      },
      {
        title: "Get Your API Credentials",
        details: [
          "From the app dashboard top section, copy the 'App ID'",
          "Click 'Show' next to App Secret and copy it",
          "You will need both values",
        ],
      },
      {
        title: "Add to .env and Connect",
        details: [
          "Add INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET to .env",
          "Restart the app",
          "Go to Connections and click 'Connect Instagram'",
        ],
      },
    ],
    commonIssues: [
      "You need an Instagram Business or Creator account (personal accounts won't work)",
      "Your Facebook account must be linked to the Instagram Business account",
      "If you see 'Invalid scope', make sure you requested 'instagram_basic' permission",
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    Logo: YouTubeLogo,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    docsUrl: "https://developers.google.com/youtube/v3/guides/authentication",
    devPortalUrl: "https://console.cloud.google.com/",
    envPrefix: "YOUTUBE",
    steps: [
      {
        title: "Create a Google Cloud Project",
        details: [
          "Go to Google Cloud Console",
          "Click the project dropdown (top left) then 'New Project'",
          "Name it 'Content Studio' and click 'Create'",
        ],
      },
      {
        title: "Enable the YouTube Data API",
        details: [
          "With your new project selected, go to 'APIs & Services > Library'",
          "Search for 'YouTube Data API v3'",
          "Click on it and then click 'Enable'",
        ],
      },
      {
        title: "Create OAuth Credentials",
        details: [
          "Go to 'Credentials' in the left sidebar",
          "Click 'Create Credentials > OAuth client ID'",
          "If asked to configure consent screen: choose 'External', fill in app name",
          "For Application type, choose 'Web application'",
          "Add redirect URI: http://localhost:3000/api/auth/youtube/callback",
          "Click 'Create'",
        ],
      },
      {
        title: "Add to .env and Connect",
        details: [
          "Copy the Client ID and Client Secret from the popup",
          "Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env",
          "Restart the app and click 'Connect YouTube'",
        ],
      },
    ],
    commonIssues: [
      "You MUST enable the YouTube Data API v3 — creating credentials alone is not enough",
      "The OAuth consent screen must be fully configured before creating credentials",
      "If you see 'App not verified', click 'Advanced' then 'Go to Content Studio'",
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    Logo: LinkedInLogo,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
    devPortalUrl: "https://developer.linkedin.com/",
    envPrefix: "LINKEDIN",
    steps: [
      {
        title: "Create a LinkedIn App",
        details: [
          "Go to LinkedIn Developers and sign in",
          "Click 'My Apps' then 'Create app'",
          "Fill in app name: 'Content Studio'",
          "Select your LinkedIn Company Page",
          "Add privacy policy URL: http://localhost:3000/privacy",
          "Upload any image as app logo",
        ],
      },
      {
        title: "Configure OAuth Settings",
        details: [
          "On your app page, go to the 'Auth' tab",
          "Under 'OAuth 2.0 settings', add redirect URL:",
          "http://localhost:3000/api/auth/linkedin/callback",
          "Save the settings",
        ],
      },
      {
        title: "Get Your API Credentials",
        details: [
          "Copy the 'Client ID' from the Auth tab",
          "Copy the 'Client Secret' (click to reveal)",
        ],
      },
      {
        title: "Add to .env and Connect",
        details: [
          "Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env",
          "Restart the app and click 'Connect LinkedIn'",
        ],
      },
    ],
    commonIssues: [
      "You need a LinkedIn Company Page, not just a personal profile",
      "For detailed analytics, apply for 'Marketing Developer Platform' access",
      "Basic analytics work immediately without Marketing Developer access",
    ],
  },
  {
    id: "x",
    name: "X / Twitter",
    Logo: XLogo,
    color: "text-white",
    bgColor: "bg-white/5",
    borderColor: "border-white/10",
    docsUrl: "https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code",
    devPortalUrl: "https://developer.twitter.com/en/portal/dashboard",
    envPrefix: "X",
    steps: [
      {
        title: "Create an X Developer Project",
        details: [
          "Go to X Developer Portal and sign in",
          "Click 'Projects & Apps' then 'Create Project'",
          "Name it 'Content Studio' and continue",
        ],
      },
      {
        title: "Create an App in the Project",
        details: [
          "Under the project, click 'Add app' then 'Production'",
          "Name the app: 'Content Studio App'",
        ],
      },
      {
        title: "Enable OAuth 2.0",
        details: [
          "Under 'User authentication settings', click 'Edit'",
          "Turn ON 'OAuth 2.0'",
          "Set App permissions to 'Read'",
          "Set Type of app to 'Web App'",
          "Add Callback URI: http://localhost:3000/api/auth/x/callback",
          "Add Website URL: http://localhost:3000",
          "Click 'Save'",
        ],
      },
      {
        title: "Get Your API Credentials",
        details: [
          "Go to 'Keys and Tokens' tab",
          "Copy 'Client ID' and 'Client Secret' under OAuth 2.0 section",
        ],
      },
      {
        title: "Add to .env and Connect",
        details: [
          "Add X_CLIENT_ID and X_CLIENT_SECRET to .env",
          "Restart the app and click 'Connect X'",
        ],
      },
    ],
    commonIssues: [
      "X requires a developer account (free but may take a few minutes to activate)",
      "Basic tier has rate limits: 1500 tweet reads per month",
      "Make sure you enable OAuth 2.0, not just OAuth 1.0a",
    ],
  },
];

function EnvCodeBlock({ prefix }: { prefix: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${prefix}_CLIENT_ID=your_client_id_here\n${prefix}_CLIENT_SECRET=your_client_secret_here`;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-3 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
        <span className="text-[10px] text-muted-foreground font-mono">.env</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
        >
          {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 font-mono text-[11px] text-foreground/70 leading-relaxed overflow-x-auto">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function PlatformSection({ platform }: { platform: PlatformGuide }) {
  const [isOpen, setIsOpen] = useState(false);
  const Logo = platform.Logo;

  return (
    <div className="bezel">
      <div className="bezel-inner overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.bgColor} border ${platform.borderColor}`}>
              <Logo className={platform.color} size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold">{platform.name}</h3>
              <p className="text-[11px] text-muted-foreground">{platform.steps.length} steps</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={platform.devPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
            >
              <Globe className="h-3 w-3" />
              Dev Portal
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {isOpen && (
          <div className="px-5 pb-5 space-y-5 border-t border-white/[0.04]">
            {/* Steps */}
            <div className="pt-4 space-y-4">
              {platform.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 text-[10px] font-bold text-purple-300">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5">{step.title}</h4>
                    <ul className="space-y-1.5">
                      {step.details.map((detail, j) => (
                        <li key={j} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                          <ArrowRight className="h-3 w-3 text-purple-400/50 shrink-0 mt-0.5" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Env Code Block */}
            <EnvCodeBlock prefix={platform.envPrefix} />

            {/* Common Issues */}
            {platform.commonIssues.length > 0 && (
              <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                  <h4 className="text-[11px] font-semibold text-yellow-400">Common Issues</h4>
                </div>
                <ul className="space-y-1.5">
                  {platform.commonIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-yellow-400/70 leading-relaxed">
                      <span className="shrink-0">-</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connection Guide</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step-by-step instructions for connecting each social platform to pull real analytics.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-3 md:grid-cols-5">
        {PLATFORMS.map((p) => {
          const Logo = p.Logo;
          return (
            <a
              key={p.id}
              href={`#${p.id}`}
              className={`bezel group transition-all duration-200 hover:border-white/[0.1]`}
            >
              <div className={`bezel-inner p-4 flex flex-col items-center text-center gap-2 ${p.bgColor}`}>
                <Logo className={p.color} size={24} />
                <span className="text-xs font-medium">{p.name}</span>
              </div>
            </a>
          );
        })}
      </div>

      {/* Required API Keys Notice */}
      <div className="bezel">
        <div className="bezel-inner p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Key className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Three Required API Keys</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Before connecting any social platform, you need these three keys for the dashboard to work at all. 
                Social connections are optional — these three are mandatory.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-lg bg-black/30 border border-white/[0.04] p-3">
                  <p className="text-[10px] font-medium text-purple-400 mb-1">Apify</p>
                  <p className="text-[10px] text-muted-foreground">Scrapes competitor content</p>
                  <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400/70 hover:text-purple-400 flex items-center gap-1 mt-1">
                    Get key <ExternalLink className="h-2 w-2" />
                  </a>
                </div>
                <div className="rounded-lg bg-black/30 border border-white/[0.04] p-3">
                  <p className="text-[10px] font-medium text-purple-400 mb-1">Google Gemini</p>
                  <p className="text-[10px] text-muted-foreground">AI video analysis</p>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400/70 hover:text-purple-400 flex items-center gap-1 mt-1">
                    Get key <ExternalLink className="h-2 w-2" />
                  </a>
                </div>
                <div className="rounded-lg bg-black/30 border border-white/[0.04] p-3">
                  <p className="text-[10px] font-medium text-purple-400 mb-1">Claude (Anthropic)</p>
                  <p className="text-[10px] text-muted-foreground">AI script generation</p>
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400/70 hover:text-purple-400 flex items-center gap-1 mt-1">
                    Get key <ExternalLink className="h-2 w-2" />
                  </a>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-black/30 border border-white/[0.04] p-3 font-mono text-[10px] text-muted-foreground">
                APIFY_API_TOKEN=your_token<br/>
                GEMINI_API_KEY=your_key<br/>
                ANTHROPIC_API_KEY=your_key
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Guides */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Platform Setup Guides</h2>
        <p className="text-xs text-muted-foreground">
          Click any platform to expand its step-by-step instructions. Each guide includes the exact developer portal link, credentials format, and common issues.
        </p>

        {PLATFORMS.map((platform) => (
          <div key={platform.id} id={platform.id}>
            <PlatformSection platform={platform} />
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="bezel">
        <div className="bezel-inner p-5">
          <h3 className="text-sm font-semibold mb-3">Quick Reference: All .env Variables</h3>
          <div className="rounded-lg bg-black/30 border border-white/[0.04] p-4 font-mono text-[10px] text-muted-foreground leading-relaxed overflow-x-auto">
            <code>
              # Required for dashboard to work<br/>
              APIFY_API_TOKEN=your_apify_token<br/>
              GEMINI_API_KEY=your_gemini_key<br/>
              ANTHROPIC_API_KEY=your_claude_key<br/>
              <br/>
              # Optional - for real analytics<br/>
              TIKTOK_CLIENT_ID=your_tiktok_key<br/>
              TIKTOK_CLIENT_SECRET=your_tiktok_secret<br/>
              <br/>
              INSTAGRAM_CLIENT_ID=your_instagram_id<br/>
              INSTAGRAM_CLIENT_SECRET=your_instagram_secret<br/>
              <br/>
              YOUTUBE_CLIENT_ID=your_youtube_id<br/>
              YOUTUBE_CLIENT_SECRET=your_youtube_secret<br/>
              <br/>
              LINKEDIN_CLIENT_ID=your_linkedin_id<br/>
              LINKEDIN_CLIENT_SECRET=your_linkedin_secret<br/>
              <br/>
              X_CLIENT_ID=your_x_id<br/>
              X_CLIENT_SECRET=your_x_secret
            </code>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[11px] text-muted-foreground">
          After adding credentials, restart the app with <code className="text-purple-300 bg-purple-500/10 px-1 rounded">npm run dev</code> and go to{" "}
          <span className="text-foreground/70">Connections</span> in the sidebar.
        </p>
      </div>
    </div>
  );
}
