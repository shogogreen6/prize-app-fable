import { parseSegaDate, type DatePrecision } from "./dates";

export const SEGA_BASE = "https://segaplaza.jp";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrizeAggregator/1.0";

// search-db.json の prize 行: [id, 商品名, 検索用テキスト, キーワードidx, ?, 作品スラッグ, サブ]
export type SegaPrizeRow = [
  string,
  string,
  string,
  number[] | null,
  unknown,
  string,
  string,
  ...unknown[],
];

// search-db2.json の prize エントリ: [登場日, [作品名, 別名/キャラ名...], ビルドver]
export type SegaDb2Entry = [string, string[] | null, string];

export interface SegaSearchDb {
  prize: SegaPrizeRow[];
}

export interface SegaSearchDb2 {
  prize: Record<string, SegaDb2Entry>;
}

export interface ScrapedSegaPrize {
  sourceId: string;
  name: string;
  itemUrl: string;
  releaseDateRaw: string;
  releaseDate: string | null;
  datePrecision: DatePrecision;
}

export interface SegaTitle {
  slug: string;
  title: string;
}

export type SegaDbFetchResult =
  | { notModified: true }
  | {
      notModified: false;
      etag: string | null;
      db: SegaSearchDb;
      db2: SegaSearchDb2;
    };

/**
 * segaplaza の検索用静的 JSON 2本を取得する。
 * prevEtag を渡すと If-None-Match で条件付き GET し、未更新なら本体をダウンロードしない。
 */
export async function fetchSearchDbs(
  prevEtag?: string | null,
): Promise<SegaDbFetchResult> {
  const headers: Record<string, string> = { "user-agent": UA };
  if (prevEtag) headers["if-none-match"] = prevEtag;
  const res = await fetch(`${SEGA_BASE}/jsons/search-db.json`, {
    headers,
    cache: "no-store",
  });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) {
    throw new Error(`SEGA search-db.json -> HTTP ${res.status}`);
  }
  const etag = res.headers.get("etag");
  const db = (await res.json()) as SegaSearchDb;
  const res2 = await fetch(`${SEGA_BASE}/jsons/search-db2.json`, {
    headers: { "user-agent": UA },
    cache: "no-store",
  });
  if (!res2.ok) {
    throw new Error(`SEGA search-db2.json -> HTTP ${res2.status}`);
  }
  const db2 = (await res2.json()) as SegaSearchDb2;
  return { notModified: false, etag, db, db2 };
}

/** 指定した作品スラッグのプライズを抽出する（取り下げ品は除外） */
export function extractPrizes(
  db: SegaSearchDb,
  db2: SegaSearchDb2,
  slug: string,
): ScrapedSegaPrize[] {
  return db.prize
    .filter((r) => r[5] === slug)
    .filter((r) => !`${r[1]}${r[2]}`.includes("取り下げ"))
    .map((r) => {
      const id = r[0];
      const entry = db2.prize[id];
      const raw = entry?.[0] ?? "";
      const parsed = parseSegaDate(raw);
      return {
        sourceId: id,
        name: r[1].replace(/\s+/g, " ").trim(),
        itemUrl: `${SEGA_BASE}/prize/${id}`,
        releaseDateRaw: raw,
        releaseDate: parsed.iso,
        datePrecision: parsed.precision,
      };
    });
}

/** 登録時のサジェスト用に、プライズが存在する作品（スラッグ＋表示名）の一覧を作る */
export function listSegaTitles(
  db: SegaSearchDb,
  db2: SegaSearchDb2,
): SegaTitle[] {
  const bySlug = new Map<string, string>();
  for (const r of db.prize) {
    const slug = r[5];
    if (!slug || bySlug.has(slug)) continue;
    const title = db2.prize[r[0]]?.[1]?.[0];
    if (title) bySlug.set(slug, title);
  }
  return [...bySlug.entries()]
    .map(([slug, title]) => ({ slug, title }))
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));
}

/**
 * 商品ページ HTML から og:image を抜き出す。
 * 画像 URL のハッシュ部分は JS チャンク内マニフェスト依存で ID から導出できないため、
 * 新規アイテムに限り商品ページを1回だけ読んでキャッシュする方針。
 */
export function extractOgImage(html: string): string | null {
  const m =
    html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/,
    ) ??
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/,
    );
  return m ? m[1] : null;
}

export async function fetchOgImage(itemUrl: string): Promise<string | null> {
  const res = await fetch(itemUrl, {
    headers: { "user-agent": UA },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return extractOgImage(await res.text());
}
