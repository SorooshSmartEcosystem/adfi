// Research helper — uses Anthropic's server-side web_search tool to
// gather fresh, cited context before an agent composes structured
// output. Solves the "Echo wrote that bitcoin was $42k" class of bug
// where the model's training data is stale.
//
// Web search tool docs:
//   https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool
// Cost: $10 / 1k queries on top of normal token usage. We cap each
// research pass at 5 web searches to keep per-draft spend predictable.

import { anthropic, MODELS, recordAnthropicUsage } from "./anthropic";
import { Agent } from "@orb/db";

// Heuristic: when does a draft need fresh data? Long-form blog/article
// formats almost always benefit; short social posts usually don't (the
// brand voice + content pillars are enough). Hints that mention
// time-sensitive concepts force research on regardless of format.
const RESEARCH_HINT_RE =
  /\b(news|latest|recent|today|this week|this month|q[1-4]|quarterly|market|price|stock|crypto|bitcoin|ethereum|inflation|fed|fomc|cpi|gdp|earnings|report|analysis|statistic|data|trend|forecast|election|launch|announcement)\b/i;

export function shouldResearch(args: {
  format: string;
  hint?: string | null;
  businessDescription?: string | null;
}): boolean {
  if (args.format === "WEBSITE_ARTICLE") return true;
  if (args.hint && RESEARCH_HINT_RE.test(args.hint)) return true;
  // A finance/news-adjacent business benefits from research even for
  // short posts — they're commenting on the world.
  if (
    args.businessDescription &&
    RESEARCH_HINT_RE.test(args.businessDescription)
  ) {
    return true;
  }
  return false;
}

const RESEARCH_SYSTEM_PROMPT = `You are a research analyst. Your job is to gather a small number of up-to-date, cited facts that a content writer can use to draft a post or article.

RULES:
- Use the web_search tool to find current, sourced data. Don't trust your training data for anything time-sensitive (prices, statistics, news, recent launches).
- Prefer primary sources (official reports, exchange data, company filings) over aggregators.
- For numerical data (prices, percentages, totals), include the EXACT figure and the date it was observed.
- Return your findings as a markdown bullet list. Each bullet:
  • Starts with the fact (one short sentence)
  • Ends with the source URL in parentheses
  • Optionally adds (as of YYYY-MM-DD) when the fact is time-sensitive

NEVER:
- Make up numbers if a search doesn't return them. Say "data not found" instead.
- Pad the list. 3–8 bullets is enough.
- Add commentary or marketing copy. Just the facts the writer will use.`;

export type ResearchFindings = {
  bullets: string;
  citations: { url: string; title?: string }[];
};

// Returns fresh, cited facts for a topic. Wraps Anthropic's web_search
// tool. Capped at 5 searches per call. Best-effort — returns null on
// any failure so the caller can degrade to no-research mode rather
// than throw the whole draft.
export async function gatherFreshContext(args: {
  topic: string;
  businessDescription?: string | null;
  hint?: string | null;
  userId?: string;
}): Promise<ResearchFindings | null> {
  const userMessage = [
    `Topic: ${args.topic}`,
    args.businessDescription
      ? `Business context (so you research the right angle):\n${args.businessDescription}`
      : null,
    args.hint ? `Owner hint: ${args.hint}` : null,
    "\nResearch the up-to-date facts a writer would need to draft this. Cite each fact.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await anthropic().messages.create({
      model: MODELS.SONNET,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: RESEARCH_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ] as any,
    });

    if (args.userId) {
      void recordAnthropicUsage({
        userId: args.userId,
        agent: Agent.ECHO,
        eventType: "echo_research",
        response,
        meta: { topic: args.topic.slice(0, 200) },
      });
    }

    // Walk the response content. The web_search tool produces
    // server_tool_use + web_search_tool_result blocks; the model's
    // synthesis lives in text blocks. Concatenate the text and pull
    // out citation URLs from any text blocks that carry them.
    let bullets = "";
    const citations: { url: string; title?: string }[] = [];
    for (const block of response.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;
      if (b.type === "text" && typeof b.text === "string") {
        bullets += b.text;
        if (Array.isArray(b.citations)) {
          for (const c of b.citations) {
            if (c?.url) citations.push({ url: c.url, title: c.title });
          }
        }
      }
    }
    bullets = bullets.trim();
    if (!bullets) return null;
    return { bullets, citations };
  } catch (err) {
    console.warn("[research] gatherFreshContext failed:", err);
    return null;
  }
}
