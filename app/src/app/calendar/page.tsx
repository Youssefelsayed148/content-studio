"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, Wand2, CheckCircle2, Film, Trash2, ChevronLeft, ChevronRight, Smartphone, Camera, Play, Briefcase, MessageSquare, LayoutGrid, BarChart3, GripVertical, Sparkles, Plus } from "lucide-react";
import type { CalendarEvent, Script, Strategy } from "@/lib/types";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  tiktok: <Smartphone className="h-3 w-3" />,
  instagram: <Camera className="h-3 w-3" />,
  youtube: <Play className="h-3 w-3" />,
  linkedin: <Briefcase className="h-3 w-3" />,
  x: <MessageSquare className="h-3 w-3" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  instagram: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  youtube: "text-red-400 bg-red-500/10 border-red-500/20",
  linkedin: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  x: "text-sky-400 bg-sky-500/10 border-sky-500/20",
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [heatmapView, setHeatmapView] = useState(false);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = () => {
    fetch(`/api/calendar?month=${currentMonth}`).then((r) => r.json()).then(setEvents);
    fetch("/api/scripts").then((r) => r.json()).then(setScripts);
    fetch("/api/strategies").then((r) => r.json()).then(setStrategies);
  };

  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(parseInt(currentMonth.split("-")[0]), parseInt(currentMonth.split("-")[1]), 0).getDate();
  const firstDayOfWeek = new Date(currentMonth + "-01").getDay();

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.scheduledDate === dateStr);
  };

  const getScript = (scriptId: string) => scripts.find((s) => s.id === scriptId);

  const maxEventsInDay = useMemo(() => {
    let max = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const count = getEventsForDay(day).length;
      if (count > max) max = count;
    }
    return max;
  }, [events, currentMonth, daysInMonth]);

  const getHeatmapIntensity = (dayEvents: CalendarEvent[]) => {
    if (dayEvents.length === 0) return "bg-white/[0.02] border-white/[0.04]";
    if (maxEventsInDay === 0) return "bg-white/[0.02] border-white/[0.04]";
    const ratio = dayEvents.length / maxEventsInDay;
    if (ratio <= 0.25) return "bg-purple-500/5 border-purple-500/10";
    if (ratio <= 0.5) return "bg-purple-500/10 border-purple-500/15";
    if (ratio <= 0.75) return "bg-purple-500/15 border-purple-500/20";
    return "bg-purple-500/20 border-purple-500/30";
  };

  const autoSchedule = async () => {
    setLoading(true);
    try {
      const readyScripts = scripts.filter((s) => s.status === "brief_generated" || s.status === "scheduled");
      if (readyScripts.length === 0) {
        alert("No approved scripts ready to schedule. Hana needs to approve more scripts first.");
        setLoading(false);
        return;
      }

      const strategy = strategies[0];
      if (!strategy) {
        alert("No strategy found. Create a content strategy first.");
        setLoading(false);
        return;
      }

      const year = parseInt(currentMonth.split("-")[0]);
      const month = parseInt(currentMonth.split("-")[1]) - 1;
      const scheduled: CalendarEvent[] = [];
      let scriptIndex = 0;
      const platformCounts: Record<string, number> = {};

      for (let day = 1; day <= daysInMonth && scriptIndex < readyScripts.length; day++) {
        const date = new Date(year, month, day);
        const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
        const script = readyScripts[scriptIndex];
        const platform = script.platform || "tiktok";
        const optimalDays = strategy.optimalDays?.[platform === "instagram" ? "reels" : platform] || [];
        if (optimalDays.length > 0 && !optimalDays.includes(dayName)) continue;

        const cadenceMap: Record<string, number> = {
          tiktok: strategy.cadenceReels,
          instagram: strategy.cadenceReels,
          linkedin: strategy.cadenceLinkedIn,
          youtube: strategy.cadenceYouTube,
          x: strategy.cadenceX,
        };
        const maxPerWeek = cadenceMap[platform] || 7;
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        if (platformCounts[platform] > maxPerWeek) continue;

        const times = strategy.postingTimes?.[platform === "instagram" ? "reels" : platform] || ["09:00"];
        const time = times[scheduled.length % times.length] || "09:00";
        const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
        const newEvent: CalendarEvent = {
          id: crypto.randomUUID(),
          scriptId: script.id,
          title: script.title || `Script for ${script.platform}`,
          platform: script.platform,
          scheduledDate: dateStr,
          scheduledTime: time,
          status: "scheduled",
          notes: "Auto-scheduled by AI",
          createdAt: new Date().toISOString(),
        };

        await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEvent),
        });

        await fetch("/api/scripts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: script.id, status: "scheduled", scheduledAt: new Date().toISOString() }),
        });

        scheduled.push(newEvent);
        scriptIndex++;
      }

      loadData();
      alert(`Scheduled ${scheduled.length} scripts!`);
    } catch (err) {
      console.error(err);
      alert("Scheduling failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, newStatus: CalendarEvent["status"]) => {
    await fetch("/api/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId, status: newStatus }),
    });
    loadData();
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Remove from calendar?")) return;
    await fetch(`/api/calendar?id=${eventId}`, { method: "DELETE" });
    loadData();
  };

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.scheduledDate >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`));
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider mb-1.5">Schedule</p>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI schedules your approved scripts. Film on the green days, post on the blue days.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setHeatmapView(!heatmapView)}
            className="rounded-xl glass border-white/[0.08] gap-1.5 text-xs pressable"
          >
            {heatmapView ? <LayoutGrid className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
            {heatmapView ? "Grid View" : "Density Map"}
          </Button>
          <Button
            onClick={autoSchedule}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Auto-Schedule Scripts
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bezel">
        <div className="bezel-inner p-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => changeMonth(-1)} className="rounded-xl pressable h-9 w-9 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <Button variant="ghost" onClick={() => changeMonth(1)} className="rounded-xl pressable h-9 w-9 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bezel">
        <div className="bezel-inner p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-xl" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toISOString().slice(0, 10) === `${currentMonth}-${String(day).padStart(2, "0")}`;
              const hasEvents = dayEvents.length > 0;
              const heatmapClass = heatmapView ? getHeatmapIntensity(dayEvents) : "";

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-xl border p-2 flex flex-col gap-0.5 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isToday
                      ? "bg-purple-500/10 border-purple-500/30 glow-sm"
                      : heatmapView
                      ? heatmapClass
                      : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
                  } ${hasEvents && !heatmapView ? "glow-sm" : ""}`}
                >
                  <span className={`text-[10px] font-semibold ${isToday ? "text-purple-300" : "text-muted-foreground"}`}>
                    {day}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const platform = event.platform || getScript(event.scriptId)?.platform || "tiktok";
                      return (
                        <div
                          key={event.id}
                          draggable
                          onDragStart={() => setDraggedEventId(event.id)}
                          onDragEnd={() => setDraggedEventId(null)}
                          className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md truncate cursor-grab active:cursor-grabbing transition-all duration-200 ${
                            event.status === "posted"
                              ? "bg-green-500/10 text-green-300 border border-green-500/20"
                              : event.status === "filmed"
                              ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                              : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          } ${draggedEventId === event.id ? "opacity-50 scale-95" : "hover:brightness-110"}`}
                          title={event.title}
                        >
                          <span className="shrink-0">{PLATFORM_ICONS[platform] || PLATFORM_ICONS.tiktok}</span>
                          <span className="truncate">{event.scheduledTime}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-indigo-400/30 border border-indigo-400/40" />
          <span className="text-[10px] text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-teal-400/30 border border-teal-400/40" />
          <span className="text-[10px] text-muted-foreground">Filmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/30 border border-green-400/40" />
          <span className="text-[10px] text-muted-foreground">Posted</span>
        </div>
        {heatmapView && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-muted-foreground">Low</span>
            <div className="h-2.5 w-2.5 rounded-full bg-purple-500/5 border border-purple-500/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-purple-500/10 border border-purple-500/15" />
            <div className="h-2.5 w-2.5 rounded-full bg-purple-500/15 border border-purple-500/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-purple-500/20 border border-purple-500/30" />
            <span className="text-[10px] text-muted-foreground">High</span>
          </div>
        )}
      </div>

      {/* Upcoming List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">Upcoming</p>
          <span className="text-[10px] text-muted-foreground">{upcomingEvents.length} events</span>
        </div>
        <div className="space-y-2.5 stagger-children">
          {upcomingEvents.map((event) => {
            const script = getScript(event.scriptId);
            const platform = event.platform || script?.platform || "tiktok";
            return (
              <div
                key={event.id}
                className="bezel glass-hover cursor-pointer"
                style={{ animationDelay: "0ms" }}
              >
                <div className="bezel-inner p-4 flex items-center gap-4">
                  <div className="shrink-0 w-14 text-center">
                    <p className="text-lg font-bold">{new Date(event.scheduledDate).getDate()}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">{new Date(event.scheduledDate).toLocaleDateString("en-US", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold truncate">{event.title}</h4>
                      <Badge variant="secondary" className={`rounded-md text-[10px] capitalize gap-1 ${PLATFORM_COLORS[platform] || PLATFORM_COLORS.tiktok}`}>
                        {PLATFORM_ICONS[platform]}
                        {event.platform}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{event.scheduledTime} | {script?.contentPillar}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {event.status === "scheduled" && (
                      <Button size="sm" variant="ghost" onClick={() => updateEventStatus(event.id, "filming_ready")} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground pressable" title="Mark ready to film">
                        <Film className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {event.status === "filming_ready" && (
                      <Button size="sm" variant="ghost" onClick={() => updateEventStatus(event.id, "filmed")} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-400 pressable" title="Mark filmed">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {event.status === "filmed" && (
                      <Button size="sm" variant="ghost" onClick={() => updateEventStatus(event.id, "posted")} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-green-400 pressable" title="Mark posted">
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteEvent(event.id)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-400 pressable" title="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {upcomingEvents.length === 0 && (
          <div className="bezel">
            <div className="bezel-inner p-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <CalendarDays className="h-6 w-6 text-purple-400/60" />
              </div>
              <h3 className="text-sm font-semibold">No upcoming content</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Click Auto-Schedule to plan your week with AI, or add scripts to the pipeline first.
              </p>
              <Button
                onClick={autoSchedule}
                disabled={loading}
                className="mt-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 gap-1.5 pressable"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Auto-Schedule Scripts
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function changeMonth(delta: number) {
    const [y, m] = currentMonth.split("-").map(Number);
    const newDate = new Date(y, m - 1 + delta, 1);
    setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
  }
}
