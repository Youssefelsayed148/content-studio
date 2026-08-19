import { getDb, ensureSchema } from "./db";
import { v4 as uuid } from "uuid";

const DEFAULT_WORKSPACE = "default";

export type ScanJobStatus = "running" | "done" | "failed";

export interface ScanJob {
  id: string;
  status: ScanJobStatus;
  configName: string | null;
  progressStep: string | null;
  progressCurrent: number;
  progressTotal: number;
  result: unknown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToJob(row: any): ScanJob {
  return {
    id: row.id,
    status: row.status,
    configName: row.configName,
    progressStep: row.progressStep,
    progressCurrent: row.progressCurrent ?? 0,
    progressTotal: row.progressTotal ?? 0,
    result: row.result ? JSON.parse(row.result) : null,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createScanJob(configName: string | undefined, workspaceId = DEFAULT_WORKSPACE): string {
  ensureSchema();
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO scan_jobs (id, workspace_id, status, configName, progressStep, progressCurrent, progressTotal, createdAt, updatedAt)
     VALUES (?, ?, 'running', ?, 'Starting scan...', 0, 0, ?, ?)`
  ).run(id, workspaceId, configName || null, now, now);
  return id;
}

export function updateScanJobProgress(
  id: string,
  progress: { step?: string; current?: number; total?: number }
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT * FROM scan_jobs WHERE id = ?").get(id) as any;
  if (!existing) return;
  db.prepare(
    `UPDATE scan_jobs SET progressStep = ?, progressCurrent = ?, progressTotal = ?, updatedAt = ? WHERE id = ?`
  ).run(
    progress.step ?? existing.progressStep,
    progress.current ?? existing.progressCurrent,
    progress.total ?? existing.progressTotal,
    now,
    id
  );
}

export function completeScanJob(id: string, result: unknown): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE scan_jobs SET status = 'done', result = ?, progressStep = 'Complete', updatedAt = ? WHERE id = ?`
  ).run(JSON.stringify(result), now, id);
}

export function failScanJob(id: string, error: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE scan_jobs SET status = 'failed', error = ?, updatedAt = ? WHERE id = ?`
  ).run(error, now, id);
}

export function getScanJob(id: string): ScanJob | null {
  ensureSchema();
  const db = getDb();
  const row = db.prepare("SELECT * FROM scan_jobs WHERE id = ?").get(id);
  return row ? rowToJob(row) : null;
}

/** Best-effort cleanup so scan_jobs doesn't grow forever — call occasionally, not on every request. */
export function pruneOldScanJobs(olderThanHours = 48): void {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM scan_jobs WHERE createdAt < ?").run(cutoff);
}
