import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readBrandVoices, writeBrandVoices } from "@/lib/csv";
import type { BrandVoice } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const strategyId = searchParams.get("strategyId");
  let voices = readBrandVoices();
  if (strategyId) voices = voices.filter((v) => v.strategyId === strategyId);
  return NextResponse.json(voices);
}

export async function POST(request: Request) {
  const body = await request.json();
  const voices = readBrandVoices();
  const newVoice: BrandVoice = {
    id: uuid(),
    strategyId: body.strategyId || "",
    brandName: body.brandName || "",
    principles: body.principles || "",
    communicationFramework: body.communicationFramework || "",
    bannedWords: body.bannedWords || "",
    registerRules: body.registerRules || "",
    voiceDescription: body.voiceDescription || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  voices.push(newVoice);
  writeBrandVoices(voices);
  return NextResponse.json(newVoice, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const voices = readBrandVoices();
  const index = voices.findIndex((v) => v.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  voices[index] = { ...voices[index], ...body, updatedAt: new Date().toISOString() };
  writeBrandVoices(voices);
  return NextResponse.json(voices[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const voices = readBrandVoices();
  const filtered = voices.filter((v) => v.id !== id);
  writeBrandVoices(filtered);
  return NextResponse.json({ success: true });
}
