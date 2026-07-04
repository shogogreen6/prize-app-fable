import * as cheerio from "cheerio";
import { parseBspDate, type DatePrecision } from "./dates";

export const BSP_BASE = "https://bsp-prize.jp";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrizeAggregator/1.0";

export interface BspTitle {
  ipId: string;
  name: string;
}

export interface ScrapedPrize {
  sourceId: string;
  name: string;
  imageUrl: string | null;
  itemUrl: string;
  releaseDateRaw: string;
  releaseDate: string | null;
  datePrecision: DatePrecision;
}

/** /title/ の HTML から作品マスタ（IP ID と作品名）を抽出する */
export function parseTitleList(html: string): BspTitle[] {
  const $ = cheerio.load(html);
  const seen = new Map<string, string>();
  $('a[href^="/title/IP"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/title\/(IP\d+)\//);
    if (!m) return;
    const name = $(el).text().replace(/\s+/g, " ").trim();
    if (name && !seen.has(m[1])) {
      seen.set(m[1], name);
    }
  });
  return [...seen.entries()].map(([ipId, name]) => ({ ipId, name }));
}

/** /title/{IP}/ の HTML から商品一覧（最新15件のローリングウィンドウ）を抽出する */
export function parseTitleItems(html: string): ScrapedPrize[] {
  const $ = cheerio.load(html);
  const items: ScrapedPrize[] = [];
  $(".products_item").each((_, el) => {
    const $el = $(el);
    const href = $el.find("a").attr("href") ?? "";
    const m = href.match(/\/item\/(\d+)\//);
    if (!m) return;
    const imgSrc = $el.find(".products_img img").attr("src");
    const name = $el.find(".products_name").text().trim();
    const dateRaw = $el.find(".products_date").text().replace(/\s+/g, "").trim();
    if (!name) return;
    const parsed = parseBspDate(dateRaw);
    items.push({
      sourceId: m[1],
      name,
      imageUrl: imgSrc ? new URL(imgSrc, BSP_BASE).toString() : null,
      itemUrl: `${BSP_BASE}/item/${m[1]}/`,
      releaseDateRaw: dateRaw,
      releaseDate: parsed.iso,
      datePrecision: parsed.precision,
    });
  });
  return items;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`BSP fetch failed: ${url} -> HTTP ${res.status}`);
  }
  return res.text();
}

export async function fetchTitleList(): Promise<BspTitle[]> {
  return parseTitleList(await fetchHtml(`${BSP_BASE}/title/`));
}

export async function fetchTitleItems(ipId: string): Promise<ScrapedPrize[]> {
  return parseTitleItems(await fetchHtml(`${BSP_BASE}/title/${ipId}/`));
}
