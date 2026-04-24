// Google News RSS fetcher — no API key required.
// Google publishes search RSS at news.google.com/rss/search?q=...
// Returns a small, typed slice of each item so Pulse/Scout can feed it
// straight into Claude as context.

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
};

const GOOGLE_NEWS = "https://news.google.com/rss/search";

function unescapeXml(raw: string): string {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(html: string): string {
  return unescapeXml(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseItem(block: string): NewsItem | null {
  const grab = (tag: string): string => {
    const m = block.match(
      new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
    );
    if (!m) return "";
    const content = m[1] ?? "";
    return stripTags(
      content.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""),
    );
  };

  const title = grab("title");
  const link = grab("link");
  const pubDate = grab("pubDate");
  const description = grab("description");
  const source = grab("source");
  if (!title || !link) return null;

  return {
    title,
    link,
    source: source || "",
    pubDate: pubDate || "",
    snippet: description ? description.slice(0, 220) : "",
  };
}

// Fetches and parses a Google News RSS search for `query`. Returns up to
// `limit` items, newest first (Google already orders by recency).
export async function fetchGoogleNews(
  query: string,
  limit = 10,
): Promise<NewsItem[]> {
  const url = `${GOOGLE_NEWS}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "adfi-pulse/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Google News fetch failed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();

  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = parseItem(match[1] ?? "");
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

// Fetches multiple queries concurrently, dedupes by link, caps at `maxTotal`.
// Safe to call with an empty array — returns [].
export async function fetchNewsForQueries(
  queries: string[],
  perQuery = 5,
  maxTotal = 25,
): Promise<NewsItem[]> {
  if (queries.length === 0) return [];
  const results = await Promise.allSettled(
    queries.map((q) => fetchGoogleNews(q, perQuery)),
  );

  const byLink = new Map<string, NewsItem>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      if (!byLink.has(item.link)) byLink.set(item.link, item);
    }
  }

  return Array.from(byLink.values()).slice(0, maxTotal);
}
