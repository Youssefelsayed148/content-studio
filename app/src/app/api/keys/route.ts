import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readApiKeys, writeApiKeys } from "@/lib/csv";
import { validateProviderKey } from "@/lib/ai-providers/factory";
import type { UserApiKey, AIProviderType } from "@/lib/types";

export async function GET() {
  const keys = readApiKeys();
  // Return key values so the settings UI can populate input fields
  // Keys are stored locally on user's machine, not transmitted over network
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      service: k.service,
      keyValue: k.keyValue,
      isValid: k.isValid,
      lastValidatedAt: k.lastValidatedAt,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { service, keyValue } = body;

  if (!service || !keyValue) {
    return NextResponse.json({ error: "Service and keyValue required" }, { status: 400 });
  }

  // Validate the key using the provider-specific validator
  const provider = service as AIProviderType;
  let validation: { valid: boolean; error?: string };

  if (["gemini", "anthropic", "openai", "openrouter", "opencode"].includes(provider)) {
    validation = await validateProviderKey(provider, keyValue);
  } else if (service === "apify") {
    validation = await validateApifyKey(keyValue);
  } else {
    validation = { valid: false, error: "Unknown service" };
  }

  const keys = readApiKeys();
  // Remove existing key for this service
  const filtered = keys.filter((k) => k.service !== service);

  const newKey: UserApiKey = {
    id: uuid(),
    service: service as UserApiKey["service"],
    keyValue,
    isValid: validation.valid,
    lastValidatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  filtered.push(newKey);
  writeApiKeys(filtered);

  return NextResponse.json({
    success: true,
    valid: validation.valid,
    error: validation.error,
    key: {
      id: newKey.id,
      service: newKey.service,
      isValid: newKey.isValid,
      lastValidatedAt: newKey.lastValidatedAt,
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const keys = readApiKeys();
  const filtered = keys.filter((k) => k.id !== id);
  writeApiKeys(filtered);

  return NextResponse.json({ success: true });
}

async function validateApifyKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: ["https://www.instagram.com/nawyrealestate/"],
        resultsType: "details",
        resultsLimit: 1,
      }),
    });
    if (response.ok) return { valid: true };
    const text = await response.text();
    if (text.includes("token")) return { valid: false, error: "Invalid API token" };
    if (text.includes("quota") || text.includes("limit")) return { valid: true };
    return { valid: false, error: `Apify error: ${text.slice(0, 100)}` };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
