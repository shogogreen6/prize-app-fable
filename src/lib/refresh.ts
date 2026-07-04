import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { animes, prizes } from "@/db/schema";
import { delMeta, getMeta, setMeta } from "./meta";
import { fetchTitleItems, type ScrapedPrize } from "./scrapers/bsp";
import {
  extractPrizes,
  fetchOgImage,
  fetchSearchDbs,
  listSegaTitles,
} from "./scrapers/sega";

const AUTO_COOLDOWN_MS = 15 * 60 * 1000;
const MANUAL_COOLDOWN_MS = 2 * 60 * 1000;
export const STALE_MS = 6 * 60 * 60 * 1000;
const OG_IMAGE_LIMIT_PER_RUN = 40;
const OG_IMAGE_CONCURRENCY = 5;
const BSP_DELAY_MS = 300;

export const META_LAST_REFRESH_AT = "lastRefreshAt";
export const META_LAST_REFRESH_RESULT = "lastRefreshResult";
export const META_SEGA_DB_ETAG = "segaDbEtag";
export const META_SEGA_TITLES = "segaTitles";
export const META_SEGA_TITLES_FETCHED_AT = "segaTitlesFetchedAt";

export interface RefreshResult {
  skipped: boolean;
  reason?: string;
  processed: number;
  imagesFetched: number;
  errors: string[];
  finishedAt: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function upsertPrizes(
  source: "bsp" | "sega",
  animeId: number,
  items: ScrapedPrize[],
  { updateImage }: { updateImage: boolean },
): Promise<number> {
  const now = new Date().toISOString();
  for (const item of items) {
    const common = {
      animeId,
      name: item.name,
      itemUrl: item.itemUrl,
      releaseDateRaw: item.releaseDateRaw,
      releaseDate: item.releaseDate,
      datePrecision: item.datePrecision,
      lastSeenAt: now,
    };
    await db
      .insert(prizes)
      .values({
        source,
        sourceId: item.sourceId,
        imageUrl: item.imageUrl ?? null,
        firstSeenAt: now,
        ...common,
      })
      .onConflictDoUpdate({
        target: [prizes.source, prizes.sourceId],
        // SEGA は抽出時に画像 URL を持たない（og:image を別途キャッシュ）ため、
        // 更新で null 上書きしないよう imageUrl は BSP のみ更新する
        set: updateImage ? { ...common, imageUrl: item.imageUrl ?? null } : common,
      });
  }
  return items.length;
}

async function refreshBsp(errors: string[]): Promise<number> {
  const targets = await db
    .select()
    .from(animes)
    .then((rows) => rows.filter((a) => a.bspIpId));
  let processed = 0;
  for (const anime of targets) {
    try {
      const items = await fetchTitleItems(anime.bspIpId!);
      processed += await upsertPrizes("bsp", anime.id, items, {
        updateImage: true,
      });
    } catch (e) {
      errors.push(`BSP ${anime.name}: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(BSP_DELAY_MS);
  }
  return processed;
}

async function refreshSega(errors: string[]): Promise<number> {
  const targets = await db
    .select()
    .from(animes)
    .then((rows) => rows.filter((a) => a.segaSlug));
  if (targets.length === 0) return 0;
  let processed = 0;
  try {
    const prevEtag = await getMeta(META_SEGA_DB_ETAG);
    const result = await fetchSearchDbs(prevEtag);
    if (result.notModified) return 0;
    for (const anime of targets) {
      const items = extractPrizes(result.db, result.db2, anime.segaSlug!).map(
        (p) => ({ ...p, imageUrl: null }),
      );
      processed += await upsertPrizes("sega", anime.id, items, {
        updateImage: false,
      });
    }
    // 登録サジェスト用の作品一覧もこのタイミングで更新しておく
    await setMeta(
      META_SEGA_TITLES,
      JSON.stringify(listSegaTitles(result.db, result.db2)),
    );
    await setMeta(META_SEGA_TITLES_FETCHED_AT, new Date().toISOString());
    if (result.etag) await setMeta(META_SEGA_DB_ETAG, result.etag);
  } catch (e) {
    errors.push(`SEGA: ${e instanceof Error ? e.message : e}`);
  }
  return processed;
}

/** SEGA プライズの画像 URL を商品ページの og:image から補完する（新規分のみ・件数上限つき） */
async function backfillSegaImages(errors: string[]): Promise<number> {
  const missing = await db
    .select({ id: prizes.id, itemUrl: prizes.itemUrl })
    .from(prizes)
    .where(and(eq(prizes.source, "sega"), isNull(prizes.imageUrl)))
    .limit(OG_IMAGE_LIMIT_PER_RUN);
  let fetched = 0;
  await mapPool(missing, OG_IMAGE_CONCURRENCY, async (row) => {
    try {
      const url = await fetchOgImage(row.itemUrl);
      if (url) {
        await db
          .update(prizes)
          .set({ imageUrl: url })
          .where(eq(prizes.id, row.id));
        fetched += 1;
      }
    } catch (e) {
      errors.push(`og:image ${row.itemUrl}: ${e instanceof Error ? e.message : e}`);
    }
  });
  return fetched;
}

/**
 * 両サイトからプライズ情報を取得して DB に upsert する。
 * 源泉サイト保護のためクールダウン（自動15分・手動2分）を持つ。
 */
export async function refreshAll({ manual = false } = {}): Promise<RefreshResult> {
  const cooldown = manual ? MANUAL_COOLDOWN_MS : AUTO_COOLDOWN_MS;
  const last = await getMeta(META_LAST_REFRESH_AT);
  if (last && Date.now() - Date.parse(last) < cooldown) {
    return {
      skipped: true,
      reason: "cooldown",
      processed: 0,
      imagesFetched: 0,
      errors: [],
      finishedAt: last,
    };
  }
  // 同時実行の二重取得をおおまかに防ぐため、開始時点で先に記録する
  await setMeta(META_LAST_REFRESH_AT, new Date().toISOString());

  const errors: string[] = [];
  const processed = (await refreshBsp(errors)) + (await refreshSega(errors));
  const imagesFetched = await backfillSegaImages(errors);

  const result: RefreshResult = {
    skipped: false,
    processed,
    imagesFetched,
    errors,
    finishedAt: new Date().toISOString(),
  };
  await setMeta(META_LAST_REFRESH_AT, result.finishedAt);
  await setMeta(META_LAST_REFRESH_RESULT, JSON.stringify(result));
  return result;
}

/** アニメの登録・対応付け変更時に呼ぶ。次回更新で SEGA の JSON を必ず再取得させる */
export async function invalidateSegaCache(): Promise<void> {
  await delMeta(META_SEGA_DB_ETAG);
}

/** データが古い（6時間超）かどうか */
export async function isStale(): Promise<boolean> {
  const last = await getMeta(META_LAST_REFRESH_AT);
  return !last || Date.now() - Date.parse(last) > STALE_MS;
}
