import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readConnections, writeConnections } from "@/lib/csv";
import type { SocialConnection } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const connections = readConnections();
  if (brandId) {
    return NextResponse.json(connections.filter((c) => c.brandId === brandId));
  }
  return NextResponse.json(connections);
}

export async function POST(request: Request) {
  const body = await request.json();
  const connections = readConnections();
  const now = new Date().toISOString();
  const newConnection: SocialConnection = {
    id: uuid(),
    brandId: body.brandId || "",
    platform: body.platform,
    accountHandle: body.accountHandle || "",
    accountName: body.accountName || "",
    accessToken: body.accessToken || "",
    refreshToken: body.refreshToken || "",
    tokenExpiresAt: body.tokenExpiresAt || "",
    scopes: body.scopes || [],
    connectedAt: now,
    lastSyncedAt: "",
    isActive: true,
    followerCount: body.followerCount || 0,
  };
  connections.push(newConnection);
  writeConnections(connections);
  return NextResponse.json(newConnection, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const connections = readConnections();
  const index = connections.findIndex((c) => c.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  connections[index] = { ...connections[index], ...body };
  writeConnections(connections);
  return NextResponse.json(connections[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const connections = readConnections();
  const filtered = connections.filter((c) => c.id !== id);
  writeConnections(filtered);
  return NextResponse.json({ success: true });
}
