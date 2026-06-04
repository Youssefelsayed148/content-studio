import { NextResponse } from "next/server";
import { readViralIdeas, writeViralIdeas } from "@/lib/csv";
import type { ViralIdea } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const configName = searchParams.get("configName");
  const status = searchParams.get("status");
  
  let ideas = readViralIdeas();
  
  if (configName) {
    ideas = ideas.filter((i) => i.configName === configName);
  }
  
  if (status) {
    ideas = ideas.filter((i) => i.status === status);
  }
  
  // Sort by viral multiplier descending
  ideas.sort((a, b) => b.viralMultiplier - a.viralMultiplier);
  
  return NextResponse.json(ideas);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, updates }: { id: string; updates: Partial<ViralIdea> } = body;
  
  const ideas = readViralIdeas();
  const idx = ideas.findIndex((i) => i.id === id);
  
  if (idx === -1) {
    return NextResponse.json({ error: "Viral idea not found" }, { status: 404 });
  }
  
  ideas[idx] = { ...ideas[idx], ...updates };
  writeViralIdeas(ideas);
  
  return NextResponse.json(ideas[idx]);
}
