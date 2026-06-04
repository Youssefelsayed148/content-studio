/**
 * ZERO-TOLERANCE competitor sanitization for Divido-branded content.
 * 
 * RULE: No competitor names. No competitor locations. No competitor branding.
 * Replace with Divido-native language or generic terms.
 * 
 * Apply to ALL "My Version" / adapted / newConcepts content before displaying.
 */
export function sanitizeForDivido(text: string): string {
  if (!text) return text;
  
  let clean = text;

  // === COMPETITOR NAMES (aggressive removal) ===
  // Individual names
  clean = clean.replace(/\bFabo\b/gi, "our agent");
  clean = clean.replace(/\bRyan[\s\-]?Serhant\b/gi, "our agent");
  clean = clean.replace(/\bMarcel[\s\-]?Remus\b/gi, "our agent");
  clean = clean.replace(/\bGrant[\s\-]?Cardone\b/gi, "our investor");
  clean = clean.replace(/\bRami[\s\-]?Tabbara\b/gi, "our director");
  clean = clean.replace(/\bFarida[\s\-]?Estate\b/gi, "our agent");
  clean = clean.replace(/\bFarida\b/gi, "our agent");
  clean = clean.replace(/\bNick[\s\-]?Saraev\b/gi, "our agent");
  clean = clean.replace(/\bNick\b/gi, "our agent");
  
  // Brand/platform names
  clean = clean.replace(/\bNawy\b/gi, "our platform");
  clean = clean.replace(/\bStake\b/gi, "our platform");
  clean = clean.replace(/\bSmartCrowd\b/gi, "our platform");
  clean = clean.replace(/\bFundrise\b/gi, "our platform");
  clean = clean.replace(/\bRepublic\.co\b/gi, "our platform");
  clean = clean.replace(/\bAqarchain\b/gi, "our platform");
  clean = clean.replace(/\bPropertyfinder\b/gi, "our platform");
  clean = clean.replace(/\bRealt\.co\b/gi, "our platform");
  clean = clean.replace(/\bWealthface\b/gi, "our platform");
  clean = clean.replace(/\bPropDoo\b/gi, "our platform");
  clean = clean.replace(/\bSeedance\b/gi, "our platform");

  // === LOCATION REPLACEMENTS ===
  clean = clean.replace(/\bDubai[\s\-]?Marina\b/gi, "New Cairo");
  clean = clean.replace(/\bPalm[\s\-]?Jumeirah\b/gi, "Sheikh Zayed");
  clean = clean.replace(/\bDowntown[\s\-]?Dubai\b/gi, "Downtown Cairo");
  clean = clean.replace(/\bBusiness[\s\-]?Bay\b/gi, "New Administrative Capital");
  clean = clean.replace(/\bJumeirah\b/gi, "Maadi");
  clean = clean.replace(/\bDubai\b/gi, "Cairo");
  clean = clean.replace(/\bUAE\b/g, "Egypt");
  clean = clean.replace(/\bEmirates\b/gi, "Egypt");
  clean = clean.replace(/\bAbu[\s\-]?Dhabi\b/gi, "Alexandria");
  clean = clean.replace(/\bBeverly Hills\b/gi, "Katameya Heights");
  clean = clean.replace(/\bCalifornia\b/gi, "North Coast");

  // === PROPERTY TYPE REPLACEMENTS ===
  clean = clean.replace(/\bpenthouse\b/gi, "luxury apartment");
  clean = clean.replace(/\bmansion\b/gi, "villa");

  // === CURRENCY REPLACEMENTS ===
  clean = clean.replace(/\$20[\s\-]?million\b/gi, "EGP 5 million");
  clean = clean.replace(/\$20M\b/gi, "EGP 5M");
  clean = clean.replace(/\$50[\s\-]?million\b/gi, "EGP 12.5 million");
  clean = clean.replace(/\$50M\b/gi, "EGP 12.5M");
  clean = clean.replace(/\$100[\s\-]?million\b/gi, "EGP 25 million");
  clean = clean.replace(/\$100M\b/gi, "EGP 25M");
  clean = clean.replace(/\$1[\s\-]?million\b/gi, "EGP 250,000");
  clean = clean.replace(/\$1M\b/gi, "EGP 250K");
  clean = clean.replace(/\$10[\s\-]?million\b/gi, "EGP 2.5 million");
  clean = clean.replace(/\$10M\b/gi, "EGP 2.5M");
  clean = clean.replace(/\$5[\s\-]?million\b/gi, "EGP 1.25 million");
  clean = clean.replace(/\$5M\b/gi, "EGP 1.25M");

  // === LIFESTYLE/OBJECT REPLACEMENTS ===
  clean = clean.replace(/\bhelicopter\b/gi, "car");
  clean = clean.replace(/\bprivate jet\b/gi, "car");
  clean = clean.replace(/\byacht\b/gi, "boat");
  clean = clean.replace(/\btailored suit\b/gi, "professional attire");
  clean = clean.replace(/\biPad\b/gi, "phone");

  // === ROLE REPLACEMENTS ===
  clean = clean.replace(/\bmy wealthy clients\b/gi, "our investors");
  clean = clean.replace(/\bwealthy clients\b/gi, "our investors");
  clean = clean.replace(/\bmy clients\b/gi, "our investors");
  clean = clean.replace(/\bhis clients\b/gi, "our investors");
  clean = clean.replace(/\bher clients\b/gi, "our investors");

  return clean;
}
