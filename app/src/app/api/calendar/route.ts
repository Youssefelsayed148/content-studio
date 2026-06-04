import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readCalendar, writeCalendar } from "@/lib/csv";
import type { CalendarEvent } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const status = searchParams.get("status");
  let events = readCalendar();
  if (month) {
    events = events.filter((e) => e.scheduledDate.startsWith(month));
  }
  if (status) {
    events = events.filter((e) => e.status === status);
  }
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const body = await request.json();
  const events = readCalendar();
  const newEvent: CalendarEvent = {
    id: uuid(),
    scriptId: body.scriptId,
    title: body.title,
    platform: body.platform,
    scheduledDate: body.scheduledDate,
    scheduledTime: body.scheduledTime,
    status: body.status || "scheduled",
    notes: body.notes || "",
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  writeCalendar(events);
  return NextResponse.json(newEvent, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const events = readCalendar();
  const index = events.findIndex((e) => e.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  events[index] = { ...events[index], ...body };
  writeCalendar(events);
  return NextResponse.json(events[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const events = readCalendar();
  const filtered = events.filter((e) => e.id !== id);
  writeCalendar(filtered);
  return NextResponse.json({ success: true });
}
