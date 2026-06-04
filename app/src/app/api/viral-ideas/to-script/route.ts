import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readViralIdeas } from "@/lib/csv";
import { appendScript } from "@/lib/csv";
import type { Script } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { viralIdeaId, strategyName } = body;

    if (!viralIdeaId) {
      return NextResponse.json(
        { success: false, error: "viralIdeaId is required" },
        { status: 400 }
      );
    }

    // Read the viral idea
    const ideas = readViralIdeas();
    const idea = ideas.find((i) => i.id === viralIdeaId);

    if (!idea) {
      return NextResponse.json(
        { success: false, error: "Viral idea not found" },
        { status: 404 }
      );
    }

    // Sanitize competitor references from adapted content
    const sanitize = (text: string): string => {
      if (!text) return text;
      const replacements: [RegExp, string][] = [
        [/\bFabo\b/gi, "Divido"],
        [/\bFABODXB\b/gi, "Divido"],
        [/\bDubai\b/gi, "Cairo"],
        [/\bpenthouse\b/gi, "apartment"],
        [/\bhelicopter\b/gi, "car"],
        [/\bhelipad\b/gi, "rooftop"],
        [/\bBurj Khalifa\b/gi, "Cairo Tower"],
        [/\bDubai Marina\b/gi, "Zamalek"],
        [/\bPalm Jumeirah\b/gi, "New Cairo"],
        [/\bMarina\b/gi, "Downtown"],
        [/\bNawy\b/gi, "Divido"],
        [/\bget\.stake\b/gi, "Divido"],
        [/\bsmartcrowd\b/gi, "Divido"],
      ];
      for (const [pattern, replacement] of replacements) {
        text = text.replace(pattern, replacement);
      }
      return text;
    };

    // Create a Script from the viral idea's adapted content
    const now = new Date().toISOString();
    const newScript: Script = {
      id: uuid(),
      title: `Script from @${idea.creator}${idea.contentPillar ? ` — ${idea.contentPillar}` : ""}`,
      platform: idea.platform || "tiktok",
      contentPillar: idea.contentPillar || "",
      hook: sanitize(idea.adaptedHook || ""),
      body: sanitize(idea.adaptedBody || idea.adaptedScript || ""),
      cta: sanitize(idea.adaptedCTA || ""),
      status: "generated",
      sourceVideoId: idea.videoId || "",
      sourceCompetitor: idea.creator || "",
      strategyName: strategyName || idea.configName || "",
      generatedAt: now,
      laraApprovedAt: "",
      laraNotes: "",
      hanaApprovedAt: "",
      hanaNotes: "",
      briefGeneratedAt: "",
      scheduledAt: "",
      filmedAt: "",
      postedAt: "",
      performanceViews: 0,
      performanceLikes: 0,
    };

    appendScript(newScript);

    // Update viral idea status to scripted
    try {
      const { writeViralIdeas } = await import("@/lib/csv");
      ideas[ideas.indexOf(idea)] = { ...idea, status: "scripted", dateScripted: now };
      writeViralIdeas(ideas);
    } catch {
      // Non-critical — script was created regardless
    }

    return NextResponse.json({ success: true, script: newScript });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create script" },
      { status: 500 }
    );
  }
}
