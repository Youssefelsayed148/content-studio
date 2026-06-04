import { v4 as uuid } from "uuid";
import type { Script, ProductionBrief } from "./types";

export async function generateProductionBrief(script: Script): Promise<ProductionBrief> {
  // Determine talent based on platform and content
  let talent = "Nadeem";
  if (script.platform === "youtube" && script.contentPillar.includes("Property")) {
    talent = "Amged";
  } else if (script.platform === "tiktok" && script.contentPillar.includes("Investor")) {
    talent = "Creator";
  }

  // Determine location
  let location = "Divido office";
  if (script.contentPillar.includes("Property")) {
    location = "Property site / Driven listing";
  } else if (script.contentPillar.includes("Azimut")) {
    location = "Professional backdrop / Azimut branding";
  }

  // Determine audio
  let audioType = "Voiceover only, subtle background music";
  if (script.platform === "tiktok" || script.platform === "instagram") {
    audioType = "Trending audio + voiceover";
  } else if (script.platform === "linkedin") {
    audioType = "Voiceover only, no music";
  }

  // Generate shot list based on script structure
  const shots: string[] = [];
  shots.push(`Shot 1 (Hook): ${script.hook.substring(0, 80)}... — 3 seconds, close-up`);
  shots.push(`Shot 2 (Setup): Establish context — 5 seconds, medium shot`);
  shots.push(`Shot 3 (Body): Core message delivery — 25 seconds, multiple angles`);
  if (script.body.includes("calculator") || script.body.includes("chart") || script.body.includes("graph")) {
    shots.push(`Shot 4 (B-roll): Screen recording or graphic overlay — 10 seconds`);
  }
  if (script.body.includes("property") || script.body.includes("real estate")) {
    shots.push(`Shot 5 (B-roll): Property footage / drone — 8 seconds`);
  }
  shots.push(`Shot 6 (CTA): Call to action — 4 seconds, direct to camera`);

  // Estimate filming time
  const platformMultiplier = script.platform === "youtube" ? 3 : 1;
  const estimatedMinutes = 10 + platformMultiplier * 5;

  return {
    id: uuid(),
    scriptId: script.id,
    location,
    props: generateProps(script),
    brollNeeded: generateBroll(script),
    audioType,
    estimatedFilmingMinutes: estimatedMinutes,
    talent,
    shotList: shots.join("\n"),
    notes: `Platform: ${script.platform}. Content pillar: ${script.contentPillar}. Auto-generated brief.`,
    generatedAt: new Date().toISOString(),
  };
}

function generateProps(script: Script): string {
  const props: string[] = [];
  if (script.contentPillar.includes("Certificate")) props.push("Bank certificate (prop)", "Red marker/X overlay");
  if (script.contentPillar.includes("Exit")) props.push("Divido app screen", "Calendar visual");
  if (script.contentPillar.includes("Azimut")) props.push("Azimut logo card", "FRA license visual");
  if (script.contentPillar.includes("Devaluation")) props.push("EGP chart printout", "Calculator");
  if (script.contentPillar.includes("Investor")) props.push("Property deed (prop)", "Investment confirmation screenshot");
  if (props.length === 0) props.push("Phone with Divido app", "Branded backdrop");
  return props.join(", ");
}

function generateBroll(script: Script): string {
  const broll: string[] = [];
  if (script.contentPillar.includes("Property")) broll.push("Property exterior/interior footage", "Cairo skyline");
  if (script.contentPillar.includes("Certificate")) broll.push("Bank exterior footage", "Money counting B-roll");
  if (script.contentPillar.includes("Azimut")) broll.push("Azimut office footage", "FRA building exterior");
  if (script.contentPillar.includes("Devaluation")) broll.push("Exchange rate screens", "Inflation news clips");
  if (broll.length === 0) broll.push("Divido office B-roll", "Team working footage");
  return broll.join("; ");
}
