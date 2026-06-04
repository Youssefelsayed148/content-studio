import { NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "Invalid import data" }, { status: 400 });
    }

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    let importedCount = 0;
    for (const [filename, content] of Object.entries(body.data)) {
      if (typeof content === "string" && filename.endsWith(".csv")) {
        const filepath = path.join(DATA_DIR, filename);
        writeFileSync(filepath, content, "utf-8");
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedFiles: importedCount,
      message: `Successfully imported ${importedCount} data files. Refresh to see changes.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
