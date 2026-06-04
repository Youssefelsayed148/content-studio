import { NextResponse } from "next/server";
import { readAiSettings, writeAiSettings } from "@/lib/csv";
import type { AIUserSettings } from "@/lib/types";

export async function GET() {
  const settings = readAiSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const body = await request.json();

  const settings: AIUserSettings = {
    videoAnalysisProvider: body.videoAnalysisProvider || "gemini",
    videoAnalysisModel: body.videoAnalysisModel || "gemini-2.0-flash",
    scriptProvider: body.scriptProvider || "anthropic",
    scriptModel: body.scriptModel || "claude-sonnet-4-5-20250929",
  };

  writeAiSettings(settings);
  return NextResponse.json({ success: true, settings });
}
