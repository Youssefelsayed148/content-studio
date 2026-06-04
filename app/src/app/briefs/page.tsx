"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Clock, MapPin, Wand2, Camera, Mic, ListOrdered, User, Film } from "lucide-react";
import type { ProductionBrief, Script } from "@/lib/types";

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<ProductionBrief[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<ProductionBrief | null>(null);

  useEffect(() => {
    fetch("/api/briefs").then((r) => r.json()).then(setBriefs);
    fetch("/api/scripts").then((r) => r.json()).then(setScripts);
  }, []);

  const getScript = (scriptId: string) => scripts.find((s) => s.id === scriptId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Briefs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-generated filming instructions for Hana-approved scripts. Suliman uses these to shoot.
        </p>
      </div>

      <div className="grid gap-3">
        {briefs.map((brief) => {
          const script = getScript(brief.scriptId);
          return (
            <div
              key={brief.id}
              onClick={() => setSelectedBrief(brief)}
              className="glass rounded-2xl p-4 transition-all duration-200 hover:bg-white/[0.05] cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold truncate">{script?.title || "Untitled"}</h3>
                    <Badge variant="secondary" className="rounded-md text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      Brief Ready
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="capitalize">{script?.platform}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {brief.estimatedFilmingMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {brief.talent}
                    </span>
                  </div>
                </div>
                <Film className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-2" />
              </div>
            </div>
          );
        })}

        {briefs.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="mt-4 font-semibold">No briefs yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Hana-approved scripts automatically generate production briefs.
            </p>
          </div>
        )}
      </div>

      {/* Brief Detail Modal */}
      <Dialog open={!!selectedBrief} onOpenChange={(open) => { if (!open) setSelectedBrief(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl border-white/[0.08]">
          {selectedBrief && (
            <>
              <DialogHeader>
                <Badge variant="secondary" className="rounded-md text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 w-fit">
                  Production Brief
                </Badge>
                <DialogTitle className="text-lg mt-2">
                  {getScript(selectedBrief.scriptId)?.title || "Untitled"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <Clock className="mx-auto h-3.5 w-3.5 text-purple-400 mb-1" />
                    <p className="text-sm font-bold">{selectedBrief.estimatedFilmingMinutes}m</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Filming Time</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <User className="mx-auto h-3.5 w-3.5 text-indigo-400 mb-1" />
                    <p className="text-sm font-bold">{selectedBrief.talent}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Talent</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <MapPin className="mx-auto h-3.5 w-3.5 text-emerald-400 mb-1" />
                    <p className="text-sm font-bold truncate">{selectedBrief.location}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Location</p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-center">
                    <Mic className="mx-auto h-3.5 w-3.5 text-yellow-400 mb-1" />
                    <p className="text-sm font-bold truncate">{selectedBrief.audioType.split("+")[0].trim()}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Audio</p>
                  </div>
                </div>

                {/* Props */}
                <div>
                  <Label className="text-[10px] font-medium text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wand2 className="h-3 w-3" />
                    Props Needed
                  </Label>
                  <p className="mt-1.5 text-sm text-foreground/80">{selectedBrief.props}</p>
                </div>

                {/* B-Roll */}
                <div>
                  <Label className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-3 w-3" />
                    B-Roll Required
                  </Label>
                  <p className="mt-1.5 text-sm text-foreground/80">{selectedBrief.brollNeeded}</p>
                </div>

                {/* Shot List */}
                <div>
                  <Label className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListOrdered className="h-3 w-3" />
                    Shot List
                  </Label>
                  <div className="mt-1.5 space-y-1.5">
                    {selectedBrief.shotList.split("\n").map((shot, i) => (
                      <div key={i} className="rounded-xl bg-black/20 border border-white/[0.04] p-2.5 text-xs text-foreground/80">
                        {shot}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full Script */}
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Approved Script</Label>
                  <div className="mt-1.5 rounded-xl bg-black/20 border border-white/[0.04] p-3 space-y-2">
                    <p className="text-xs text-purple-300 font-medium">{getScript(selectedBrief.scriptId)?.hook}</p>
                    <p className="text-xs text-foreground/70 whitespace-pre-wrap">{getScript(selectedBrief.scriptId)?.body}</p>
                    <p className="text-xs text-emerald-300 font-medium">{getScript(selectedBrief.scriptId)?.cta}</p>
                  </div>
                </div>

                {selectedBrief.notes && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-xs text-muted-foreground">{selectedBrief.notes}</p>
                  </div>
                )}

                <Button asChild className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 border-0">
                  <a href={`/calendar?scriptId=${selectedBrief.scriptId}`}>
                    <Clock className="h-4 w-4" />
                    Schedule This Content
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${className}`}>{children}</p>;
}
