import Anthropic from "@anthropic-ai/sdk";
import { getApiKey as getUserApiKey } from "./csv";

export async function generateNewConcepts(
  videoAnalysis: string,
  newConceptsPrompt: string,
  brandVoice?: string
): Promise<string> {
  const userKey = getUserApiKey("anthropic");
  const apiKey = userKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Claude API key not configured. Add your key in Settings > API Status.");

  const client = new Anthropic({ apiKey });

  const brandVoiceSection = brandVoice
    ? `\n# BRAND VOICE (STRICT — ALL OUTPUT MUST FOLLOW THIS)\n------\n${brandVoice}\n------\n`
    : "";

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `# ROLE
You're an expert in creating viral Reels on Instagram.

# OBJECTIVE
Take as input viral video from my competitor and based on it generate new concepts for me. Adapt this reference for me.

# REFERENCE VIDEO DESCRIPTION
------
${videoAnalysis}
------

# MY INSTRUCTIONS FOR NEW CONCEPTS
------
${newConceptsPrompt}
------
${brandVoiceSection}
# BEGIN YOUR WORK`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}
