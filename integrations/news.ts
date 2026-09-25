import { XMLParser } from "fast-xml-parser";
import config from "../config/integrations.json";

export type FeedArticle = {
  url: string;
  publisher: string;
  published_at: string;
  retrieved_at: string;
  text: string;
};

export async function collectFeeds(
  since: string,
  until: string,
  feeds = config.feeds,
) {
  const start = Date.parse(since),
    end = Date.parse(until);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end)
    throw Error("Invalid feed time window");
  const articles: FeedArticle[] = [],
    errors: string[] = [];
  const parser = new XMLParser({ ignoreAttributes: false });
  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const xml = parser.parse(await response.text());
      const raw = xml.rss?.channel?.item ?? xml.feed?.entry ?? [];
      for (const item of Array.isArray(raw) ? raw : [raw]) {
        const at = Date.parse(item.pubDate ?? item.published ?? item.updated);
        const url =
          typeof item.link === "string" ? item.link : item.link?.["@_href"];
        if (!url || !Number.isFinite(at) || at < start || at > end) continue;
        articles.push({
          url,
          publisher: feed.publisher,
          published_at: new Date(at).toISOString(),
          retrieved_at: new Date().toISOString(),
          text:
            String(item.title ?? "") +
            "\n" +
            String(item.description ?? item.summary ?? "").replace(
              /<[^>]*>/g,
              " ",
            ),
        });
      }
    } catch {
      errors.push(`${feed.publisher}: feed unavailable`);
    }
  }
  return { articles, errors };
}
