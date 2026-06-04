import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readStrategies, writeStrategies } from "@/lib/csv";
import type { Strategy } from "@/lib/types";

export async function GET() {
  const strategies = readStrategies();
  return NextResponse.json(strategies);
}

export async function POST(request: Request) {
  const body = await request.json();
  const strategies = readStrategies();
  const newStrategy: Strategy = {
    id: uuid(),
    strategyName: body.strategyName,
    configName: body.configName,
    platforms: body.platforms || [],
    contentPillars: body.contentPillars || [],
    cadenceReels: body.cadenceReels || 7,
    cadenceCarousels: body.cadenceCarousels || 2,
    cadenceLinkedIn: body.cadenceLinkedIn || 2,
    cadenceYouTube: body.cadenceYouTube || 1,
    cadenceX: body.cadenceX || 5,
    brandVoice: body.brandVoice || "",
    monthlyTheme: body.monthlyTheme || "",
    targetAudience: body.targetAudience || "",
    postingTimes: body.postingTimes || {},
    optimalDays: body.optimalDays || {},
  };
  strategies.push(newStrategy);
  writeStrategies(strategies);
  return NextResponse.json(newStrategy, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const strategies = readStrategies();
  const index = strategies.findIndex((s) => s.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  strategies[index] = { ...strategies[index], ...body };
  writeStrategies(strategies);
  return NextResponse.json(strategies[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const strategies = readStrategies();
  const filtered = strategies.filter((s) => s.id !== id);
  writeStrategies(filtered);
  return NextResponse.json({ success: true });
}
