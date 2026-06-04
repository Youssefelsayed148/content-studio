import { NextResponse } from "next/server";
import { readBriefs, writeBriefs } from "@/lib/csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scriptId = searchParams.get("scriptId");
  let briefs = readBriefs();
  if (scriptId) briefs = briefs.filter((b) => b.scriptId === scriptId);
  return NextResponse.json(briefs);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const briefs = readBriefs();
  const filtered = briefs.filter((b) => b.id !== id);
  writeBriefs(filtered);
  return NextResponse.json({ success: true });
}
