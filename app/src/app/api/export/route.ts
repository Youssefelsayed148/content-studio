import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";

const DATA_DIR = path.join(process.cwd(), "..", "data");
const DATA_FILES = [
  "configs.csv",
  "creators.csv",
  "videos.csv",
  "strategies.csv",
  "scripts.csv",
  "production_briefs.csv",
  "calendar_events.csv",
  "brand_voices.csv",
  "brands.csv",
];

export async function GET() {
  try {
    const exportData: Record<string, string> = {};

    for (const file of DATA_FILES) {
      const filepath = path.join(DATA_DIR, file);
      if (existsSync(filepath)) {
        exportData[file] = readFileSync(filepath, "utf-8");
      }
    }

    const json = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="content-studio-backup-${timestamp}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
