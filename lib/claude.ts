import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const ATI_SYSTEM_PROMPT = `You are an investigative journalist specializing in Canadian government spending and communications. Please analyze the provided ATIP summaries. Identify patterns journalists are pursuing around taxpayer money, contracts, emails, memos, and internal comms. Generate 5-10 completely new, highly specific ATIP request ideas that would reveal fresh information. For each idea output: target institution, precise description of records sought (must be specific enough for ATIP), date range, and why it's new/valuable.`;

export const STORY_SYSTEM_PROMPT = `You are an experienced investigative journalist for a Canadian news outlet. Write a compelling, factual 500-800 word news story based on the provided ATIP disclosure summary.

Structure the story as:
1. Strong lede paragraph (most newsworthy angle)
2. Background and context (using known public information about the department/topic)
3. Key findings from the ATIP
4. Impact/implications for Canadians
5. Historical context if relevant

Use journalistic style: active voice, short paragraphs, no jargon. Do not fabricate quotes — note where quotes are needed.

End the story with a section titled "## Questions for Government" containing 5-8 specific, pointed questions that a journalist should send to the department's media relations contact to obtain quotes before publication. Format: numbered list.

Then add a section "## Media Relations Contact" with the department's known public communications contact info if available.`;

export async function generateATIRequests(csvSample: string): Promise<ATIRequest[]> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: ATI_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here are recent ATIP request summaries from open.canada.ca. Analyze these and generate 5-10 new, specific ATIP request ideas:\n\n${csvSample}\n\nRespond with a JSON array of objects with these exact fields: institution (string), institution_code (string, use standard govt abbreviation), description (string, detailed enough for actual ATIP submission), date_range (string, e.g. "January 1, 2023 to December 31, 2024"), reasoning (string, why this is newsworthy and novel). Return only the JSON array, no other text.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in response");

  return JSON.parse(jsonMatch[0]) as ATIRequest[];
}

export async function generateStory(
  headline: string,
  summary: string,
  institution: string,
  atipNumber: string
): Promise<{ story: string; questions: string }> {
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: STORY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `ATIP Disclosure Details:
- ATIP Number: ${atipNumber}
- Institution: ${institution}
- Headline: ${headline}
- Summary: ${summary}

Write the news story now.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const text = content.text;
  const questionsMatch = text.match(/## Questions for Government([\s\S]*?)(?:## |$)/);
  const questions = questionsMatch ? questionsMatch[1].trim() : "";
  const story = text.replace(/## Questions for Government[\s\S]*$/, "").trim();

  return { story, questions };
}

export async function generateHeadline(
  summary: string,
  institution: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Generate a punchy, journalistic headline (max 12 words) for this Canadian government ATIP disclosure from ${institution}:\n\n${summary}\n\nReturn only the headline text, nothing else.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return "New ATIP Disclosure";
  return content.text.trim().replace(/^["']|["']$/g, "");
}

export interface ATIRequest {
  institution: string;
  institution_code: string;
  description: string;
  date_range: string;
  reasoning: string;
}
