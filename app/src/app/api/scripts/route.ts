import { NextResponse } from "next/server";
import { readScripts, writeScripts, readBriefs, writeBriefs } from "@/lib/csv";
import { generateProductionBrief } from "@/lib/brief-generator";
import type { Script } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const strategyName = searchParams.get("strategyName");
  let scripts = readScripts();
  if (status) scripts = scripts.filter((s) => s.status === status);
  if (strategyName) scripts = scripts.filter((s) => s.strategyName === strategyName);
  return NextResponse.json(scripts);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const scripts = readScripts();
  const index = scripts.findIndex((s) => s.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prevStatus = scripts[index].status;
  scripts[index] = { ...scripts[index], ...body };

  // Auto-generate production brief when Hana approves
  if (prevStatus !== "hana_approved" && scripts[index].status === "hana_approved") {
    scripts[index].hanaApprovedAt = new Date().toISOString();
    scripts[index].briefGeneratedAt = new Date().toISOString();
    scripts[index].status = "brief_generated";

    const brief = await generateProductionBrief(scripts[index]);
    const briefs = readBriefs();
    briefs.push(brief);
    writeBriefs(briefs);
  }

  // Track Lara approval timestamp
  if (prevStatus !== "lara_approved" && scripts[index].status === "lara_approved") {
    scripts[index].laraApprovedAt = new Date().toISOString();
  }

  writeScripts(scripts);
  return NextResponse.json(scripts[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const scripts = readScripts();
  const filtered = scripts.filter((s) => s.id !== id);
  writeScripts(filtered);
  return NextResponse.json({ success: true });
}
