import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readBrands, writeBrands } from "@/lib/csv";
import type { Brand } from "@/lib/types";

export async function GET() {
  const brands = readBrands();
  return NextResponse.json(brands);
}

export async function POST(request: Request) {
  const body = await request.json();
  const brands = readBrands();
  const now = new Date().toISOString();
  const newBrand: Brand = {
    id: uuid(),
    name: body.name,
    slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"),
    logoUrl: body.logoUrl || "",
    primaryColor: body.primaryColor || "#6366f1",
    description: body.description || "",
    configName: body.configName || "",
    createdAt: now,
    updatedAt: now,
  };
  brands.push(newBrand);
  writeBrands(brands);
  return NextResponse.json(newBrand, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const brands = readBrands();
  const index = brands.findIndex((b) => b.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  brands[index] = { ...brands[index], ...body, updatedAt: new Date().toISOString() };
  writeBrands(brands);
  return NextResponse.json(brands[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const brands = readBrands();
  const filtered = brands.filter((b) => b.id !== id);
  writeBrands(filtered);
  return NextResponse.json({ success: true });
}
