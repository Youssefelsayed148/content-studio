import { NextResponse } from "next/server";
import { validateProviderKey } from "@/lib/ai-providers/factory";
import type { AIProviderType } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { provider, key } = body;

  if (!provider || !key) {
    return NextResponse.json({ error: "Provider and key required" }, { status: 400 });
  }

  const result = await validateProviderKey(provider as AIProviderType, key);

  return NextResponse.json(result);
}
