"use client";

import { useMemo } from "react";
import { Flame, Hash } from "lucide-react";
import type { Video } from "@/lib/types";

interface TrendingTopicsProps {
  videos: Video[];
  onTopicClick?: (topic: string) => void;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can", "this", "that",
  "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
  "us", "them", "my", "your", "his", "its", "our", "their", "what", "which", "who",
  "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
  "too", "very", "just", "now", "then", "here", "there", "up", "out", "if", "about",
  "into", "through", "during", "before", "after", "above", "below", "between", "under",
  "again", "further", "once", "from", "down", "off", "over", "via", "using", "based",
  "also", "well", "one", "two", "first", "second", "new", "old", "good", "bad", "best",
  "way", "make", "made", "makes", "making", "take", "takes", "took", "taken", "get",
  "gets", "got", "getting", "use", "used", "uses", "using", "like", "likes", "liked",
  "know", "knew", "known", "knows", "see", "sees", "saw", "seen", "come", "came",
  "comes", "coming", "want", "wanted", "wants", "look", "looks", "looked", "looking",
  "think", "thinks", "thought", "thinking", "say", "says", "said", "saying", "give",
  "gives", "gave", "given", "giving", "work", "works", "worked", "working", "call",
  "calls", "called", "calling", "try", "tries", "tried", "trying", "need", "needs",
  "needed", "needing", "feel", "feels", "felt", "feeling", "become", "became", "becomes",
  "becoming", "leave", "leaves", "left", "leaving", "put", "puts", "putting", "mean",
  "means", "meant", "meaning", "keep", "keeps", "kept", "keeping", "let", "lets",
  "letting", "begin", "begins", "began", "begun", "beginning", "seem", "seems",
  "seemed", "seeming", "help", "helps", "helped", "helping", "show", "shows", "showed",
  "shown", "showing", "hear", "hears", "heard", "hearing", "play", "plays", "played",
  "playing", "run", "runs", "ran", "running", "move", "moves", "moved", "moving",
  "live", "lives", "lived", "living", "believe", "believes", "believed", "believing",
  "bring", "brings", "brought", "bringing", "happen", "happens", "happened",
  "happening", "write", "writes", "wrote", "written", "writing", "provide", "provides",
  "provided", "providing", "sit", "sits", "sat", "sitting", "stand", "stands", "stood",
  "standing", "lose", "loses", "lost", "losing", "pay", "pays", "paid", "paying",
  "meet", "meets", "met", "meeting", "include", "includes", "included", "including",
  "continue", "continues", "continued", "continuing", "set", "sets", "setting",
  "learn", "learns", "learned", "learning", "change", "changes", "changed", "changing",
  "lead", "leads", "led", "leading", "understand", "understands", "understood",
  "understanding", "watch", "watches", "watched", "watching", "follow", "follows",
  "followed", "following", "stop", "stops", "stopped", "stopping", "create", "creates",
  "created", "creating", "speak", "speaks", "spoke", "spoken", "speaking", "read",
  "reads", "reading", "allow", "allows", "allowed", "allowing", "add", "adds", "added",
  "adding", "spend", "spends", "spent", "spending", "grow", "grows", "grew", "grown",
  "growing", "open", "opens", "opened", "opening", "walk", "walks", "walked", "walking",
  "win", "wins", "won", "winning", "offer", "offers", "offered", "offering", "remember",
  "remembers", "remembered", "remembering", "love", "loves", "loved", "loving", "consider",
  "considers", "considered", "considering", "appear", "appears", "appeared", "appearing",
  "buy", "buys", "bought", "buying", "wait", "waits", "waited", "waiting", "serve",
  "serves", "served", "serving", "die", "dies", "died", "dying", "send", "sends",
  "sent", "sending", "expect", "expects", "expected", "expecting", "build", "builds",
  "built", "building", "stay", "stays", "stayed", "staying", "fall", "falls", "fell",
  "fallen", "falling", "cut", "cuts", "cutting", "reach", "reaches", "reached",
  "reaching", "kill", "kills", "killed", "killing", "remain", "remains", "remained",
  "remaining",
  // Competitor names and irrelevant terms that should not trend
  "fabo", "nawy", "stake", "smartcrowd", "remus", "marcel", "ryan", "serhant", "grant",
  "cardone", "propertyfinder", "realt", "wealthface", "fundrise", "republic", "aqar",
  "chain", "rami", "tabbara", "farida",
]);

function extractTopics(videos: Video[]): { topic: string; count: number }[] {
  const wordCounts = new Map<string, number>();

  videos.forEach((video) => {
    const text = (video.analysis || "") + " " + (video.newConcepts || "");
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  return Array.from(wordCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .filter((t) => t.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);
}

function getFireCount(count: number): number {
  if (count >= 8) return 3;
  if (count >= 4) return 2;
  return 1;
}

export function TrendingTopics({ videos, onTopicClick }: TrendingTopicsProps) {
  const topics = useMemo(() => extractTopics(videos), [videos]);

  if (topics.length === 0) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-2">
        <Hash className="h-3.5 w-3.5" />
        <span>No trending topics yet. Scrape more videos to detect patterns.</span>
      </div>
    );
  }

  const maxCount = topics[0]?.count || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3.5 w-3.5 text-rose-400" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Trending Topics
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {topics.map(({ topic, count }) => {
          const fireCount = getFireCount(count);
          const intensity = count / maxCount;
          return (
            <button
              key={topic}
              onClick={() => onTopicClick?.(topic)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] active:scale-[0.97] transition-all duration-200 group"
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
              title={`Mentioned ${count} times`}
            >
              <span className="text-[11px] font-medium capitalize">{topic}</span>
              <span className="flex items-center">
                {Array.from({ length: fireCount }, (_, i) => (
                  <Flame
                    key={i}
                    className={`h-3 w-3 transition-colors duration-200 ${
                      intensity > 0.7 ? "text-rose-400" : intensity > 0.4 ? "text-amber-400" : "text-orange-400/70"
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
