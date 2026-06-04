"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function DataBackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `content-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Backup downloaded successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setMessage(null);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Import failed");
      setMessage({ type: "success", text: result.message || "Data imported successfully. Refresh to see changes." });
      setImportFile(null);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bezel">
        <div className="bezel-inner p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Export Backup</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Download all your data (brands, configs, strategies, scripts, videos, calendar) as a single JSON file.
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0 gap-2 pressable"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Full Backup
          </Button>
        </div>
      </div>

      <div className="bezel">
        <div className="bezel-inner p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Import Backup</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Restore from a previously exported backup file. This will overwrite all current data.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-white/[0.05] file:px-4 file:py-2 file:text-xs file:font-medium hover:file:bg-white/[0.08]"
            />
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
              variant="outline"
              className="rounded-xl h-11 border-white/[0.08] hover:bg-white/[0.05] gap-2"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Restore from Backup
            </Button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border border-red-500/20 text-red-300"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
