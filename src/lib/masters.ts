import { db } from "@/db/client";
import { bspTitles } from "@/db/schema";
import { getMeta, setMeta } from "./meta";
import {
  META_SEGA_TITLES,
  META_SEGA_TITLES_FETCHED_AT,
} from "./refresh";
import { fetchTitleList, type BspTitle } from "./scrapers/bsp";
import {
  fetchSearchDbs,
  listSegaTitles,
  type SegaTitle,
} from "./scrapers/sega";

const MASTER_TTL_MS = 24 * 3600 * 1000;

/** BSP 作品マスタ（サジェスト用）。DB キャッシュが24時間より古ければ再取得する */
export async function getBspTitleMaster(): Promise<BspTitle[]> {
  const rows = await db.select().from(bspTitles);
  const fresh =
    rows.length > 0 &&
    Date.now() - Date.parse(rows[0].fetchedAt) < MASTER_TTL_MS;
  const cached = rows.map((r) => ({ ipId: r.ipId, name: r.name }));
  if (fresh) return cached;
  try {
    const titles = await fetchTitleList();
    if (titles.length > 0) {
      const now = new Date().toISOString();
      await db.delete(bspTitles);
      await db
        .insert(bspTitles)
        .values(titles.map((t) => ({ ...t, fetchedAt: now })));
    }
    return titles;
  } catch {
    return cached; // 取得失敗時は古いキャッシュで凌ぐ
  }
}

/** SEGA 作品マスタ（サジェスト用）。meta のキャッシュが24時間より古ければ再取得する */
export async function getSegaTitleMaster(): Promise<SegaTitle[]> {
  const cached = await getMeta(META_SEGA_TITLES);
  const fetchedAt = await getMeta(META_SEGA_TITLES_FETCHED_AT);
  if (
    cached &&
    fetchedAt &&
    Date.now() - Date.parse(fetchedAt) < MASTER_TTL_MS
  ) {
    return JSON.parse(cached) as SegaTitle[];
  }
  try {
    const result = await fetchSearchDbs(null);
    if (!result.notModified) {
      const titles = listSegaTitles(result.db, result.db2);
      await setMeta(META_SEGA_TITLES, JSON.stringify(titles));
      await setMeta(META_SEGA_TITLES_FETCHED_AT, new Date().toISOString());
      return titles;
    }
  } catch {
    // 取得失敗時は古いキャッシュ（あれば）で凌ぐ
  }
  return cached ? (JSON.parse(cached) as SegaTitle[]) : [];
}
