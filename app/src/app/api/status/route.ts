import { NextResponse } from "next/server";
import { readApiKeys } from "@/lib/csv";

export async function GET() {
  const userKeys = readApiKeys();
  const userKeyMap: Record<string, boolean> = {};
  for (const k of userKeys) {
    if (k.isValid) userKeyMap[k.service] = true;
  }

  const statuses = {
    apify: {
      configured: userKeyMap.apify || !!process.env.APIFY_API_TOKEN,
      message: userKeyMap.apify
        ? "User API key configured"
        : process.env.APIFY_API_TOKEN
        ? "Environment API token configured"
        : "APIFY_API_TOKEN not set",
    },
    gemini: {
      configured: userKeyMap.gemini || !!process.env.GEMINI_API_KEY,
      message: userKeyMap.gemini
        ? "User API key configured"
        : process.env.GEMINI_API_KEY
        ? "Environment API key configured"
        : "GEMINI_API_KEY not set",
    },
    anthropic: {
      configured: userKeyMap.anthropic || !!process.env.ANTHROPIC_API_KEY,
      message: userKeyMap.anthropic
        ? "User API key configured"
        : process.env.ANTHROPIC_API_KEY
        ? "Environment API key configured"
        : "ANTHROPIC_API_KEY not set",
    },
    openai: {
      configured: userKeyMap.openai || !!process.env.OPENAI_API_KEY,
      message: userKeyMap.openai
        ? "User API key configured"
        : process.env.OPENAI_API_KEY
        ? "Environment API key configured"
        : "OPENAI_API_KEY not set",
    },
    openrouter: {
      configured: userKeyMap.openrouter || !!process.env.OPENROUTER_API_KEY,
      message: userKeyMap.openrouter
        ? "User API key configured"
        : process.env.OPENROUTER_API_KEY
        ? "Environment API key configured"
        : "OPENROUTER_API_KEY not set",
    },
  };

  return NextResponse.json(statuses);
}
