import { embedTexts } from "./ai.server";

export function normalizeDomain(raw: string): string {
  let value = raw.trim();
  if (!value) throw new Error("Please enter a website address.");
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  if (!url.hostname.includes(".")) throw new Error("That doesn't look like a website address.");
  return `${url.protocol}//${url.hostname}${url.pathname.replace(/\/$/, "")}`;
}

const SKIP_EXT = /\.(png|jpe?g|gif|svg|webp|ico|css|js|json|xml|pdf|zip|mp4|mp3|woff2?|ttf)$/i;

async function fetchText(url: string, timeoutMs = 12000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "HelixAI-Crawler/1.0 (+https://helix.ai)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!/text\/html|xml|text\/plain/i.test(type)) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)));
}

export function extractContent(html: string): { title: string; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]!).trim().slice(0, 200) : "";

  let body = html;
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (bodyMatch) body = bodyMatch[1]!;

  body = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(body)
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 1)
    .join("\n")
    .trim();

  return { title, text };
}

export function chunkText(
  text: string,
  wordsPerChunk = 400,
  overlap = 40,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks: string[] = [];
  const step = Math.max(1, wordsPerChunk - overlap);
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + wordsPerChunk);
    if (slice.length < 20 && chunks.length > 0) break;
    chunks.push(slice.join(" "));
    if (start + wordsPerChunk >= words.length) break;
  }
  return chunks;
}

async function urlsFromSitemap(origin: string, limit: number): Promise<string[]> {
  const found: string[] = [];
  const queue = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const seenSitemaps = new Set<string>();

  while (queue.length > 0 && found.length < limit) {
    const sitemapUrl = queue.shift()!;
    if (seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);

    const xml = await fetchText(sitemapUrl);
    if (!xml) continue;

    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]!);
    const isIndex = /<sitemapindex/i.test(xml);

    for (const loc of locs) {
      if (isIndex) {
        if (seenSitemaps.size + queue.length < 10) queue.push(loc);
        continue;
      }
      try {
        const url = new URL(loc);
        if (url.origin !== origin || SKIP_EXT.test(url.pathname)) continue;
        const clean = `${url.origin}${url.pathname}`;
        if (!found.includes(clean)) found.push(clean);
        if (found.length >= limit) break;
      } catch {
        // ignore malformed entries
      }
    }
  }

  return found;
}

export type CrawledPage = { url: string; title: string; text: string };

function extractMeta(html: string): string {
  const out = new Set<string>();
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (t) out.add(decodeEntities(t).trim());
  for (const m of html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:description|twitter:description)["'][^>]*content=["']([^"']+)["']/gi)) {
    out.add(decodeEntities(m[1]!).trim());
  }
  return [...out].filter(Boolean).join("\n");
}

async function fetchRendered(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: AbortSignal.timeout(30000),
      headers: { Accept: "text/plain", "X-Return-Format": "text" },
    });
    if (!res.ok) return null;
    const body = await res.text();
    if (/This page didn't load|Something went wrong/i.test(body) && body.length < 600) return null;
    return body.replace(/^(Title|URL Source|Markdown Content):.*$/gm, "").trim();
  } catch {
    return null;
  }
}

/** Crawls a site via sitemap.xml when available, otherwise by following internal links. */
export async function crawlSite(
  startUrl: string,
  maxPages: number,
  onProgress?: (count: number) => void,
): Promise<CrawledPage[]> {
  const origin = new URL(startUrl).origin;
  const pages: CrawledPage[] = [];
  const visited = new Set<string>();

  const sitemapUrls = await urlsFromSitemap(origin, maxPages);
  const queue: string[] = sitemapUrls.length > 0 ? [...sitemapUrls] : [startUrl];
  const followLinks = sitemapUrls.length === 0;

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchText(url);
    if (!html) continue;

    let { title, text } = extractContent(html);
    if (text.length < 200) {
      // Script-rendered site: ask a reader service to render the page.
      const rendered = await fetchRendered(url);
      if (rendered && rendered.length > text.length) text = rendered;
    }
    if (text.length < 200) {
      const meta = extractMeta(html);
      if (meta) text = [meta, text].filter(Boolean).join("\n");
    }
    if (text.length > 40) {
      pages.push({ url, title: title || url, text });
      onProgress?.(pages.length);
    }

    if (followLinks) {
      for (const match of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
        if (queue.length + pages.length > maxPages * 4) break;
        try {
          const next = new URL(match[1]!, url);
          if (next.origin !== origin || SKIP_EXT.test(next.pathname)) continue;
          const clean = `${next.origin}${next.pathname.replace(/\/$/, "")}`;
          if (!visited.has(clean) && !queue.includes(clean)) queue.push(clean);
        } catch {
          // ignore malformed links
        }
      }
    }
  }

  return pages;
}

export type ChunkRow = {
  bot_id: string;
  url: string;
  title: string;
  content: string;
  source: string;
  embedding: string;
};

/** Splits pages into overlapping chunks and embeds them. */
export async function buildChunkRows(botId: string, pages: CrawledPage[]): Promise<ChunkRow[]> {
  const pending: { url: string; title: string; content: string }[] = [];

  for (const page of pages) {
    for (const content of chunkText(page.text)) {
      pending.push({ url: page.url, title: page.title, content });
    }
  }

  const capped = pending.slice(0, 1200);
  if (capped.length === 0) return [];

  const embeddings = await embedTexts(capped.map((item) => item.content));

  return capped.map((item, index) => ({
    bot_id: botId,
    url: item.url,
    title: item.title,
    content: item.content,
    source: "crawl",
    embedding: JSON.stringify(embeddings[index] ?? []),
  }));
}
