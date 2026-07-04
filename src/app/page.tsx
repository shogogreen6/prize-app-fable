import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import Link from "next/link";
import { after } from "next/server";
import { FilterBar } from "@/components/FilterBar";
import { PrizeCard } from "@/components/PrizeCard";
import { RefreshButton } from "@/components/RefreshButton";
import { db } from "@/db/client";
import { animes, prizes } from "@/db/schema";
import { getMeta } from "@/lib/meta";
import {
  isStale,
  META_LAST_REFRESH_AT,
  META_LAST_REFRESH_RESULT,
  refreshAll,
  type RefreshResult,
} from "@/lib/refresh";
import { monthsAgoJst } from "@/lib/scrapers/dates";
import { getViewPrefs } from "@/lib/viewPrefs";

export const dynamic = "force-dynamic";

function formatJst(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Home() {
  const allAnimes = await db
    .select()
    .from(animes)
    .orderBy(asc(animes.createdAt));
  const prefs = await getViewPrefs();

  let fromIso: string | undefined;
  let toIso: string | undefined;
  if (prefs.preset === "1m") fromIso = monthsAgoJst(1);
  else if (prefs.preset === "2m") fromIso = monthsAgoJst(2);
  else if (prefs.preset === "3m") fromIso = monthsAgoJst(3);
  else if (prefs.preset === "custom") {
    fromIso = prefs.from;
    toIso = prefs.to;
  }

  const visibleIds = allAnimes.filter((a) => a.visible).map((a) => a.id);
  const conds = [inArray(prizes.animeId, visibleIds)];
  if (fromIso) conds.push(gte(prizes.releaseDate, fromIso));
  if (toIso) conds.push(lte(prizes.releaseDate, toIso));

  const rows =
    visibleIds.length === 0
      ? []
      : await db
          .select({ prize: prizes, animeName: animes.name })
          .from(prizes)
          .innerJoin(animes, eq(prizes.animeId, animes.id))
          .where(and(...conds))
          .orderBy(
            sql`${prizes.releaseDate} is null`,
            prefs.sort === "asc"
              ? asc(prizes.releaseDate)
              : desc(prizes.releaseDate),
            desc(prizes.firstSeenAt),
          )
          .limit(500);

  const lastRefreshAt = await getMeta(META_LAST_REFRESH_AT);
  const lastResultRaw = await getMeta(META_LAST_REFRESH_RESULT);
  const lastErrors: string[] = lastResultRaw
    ? ((JSON.parse(lastResultRaw) as RefreshResult).errors ?? [])
    : [];

  const hasScrapeTargets = allAnimes.some((a) => a.bspIpId || a.segaSlug);
  const refreshInBackground = hasScrapeTargets && (await isStale());
  if (refreshInBackground) {
    after(() =>
      refreshAll().catch((e) => console.error("background refresh failed", e)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">プライズ一覧</h1>
          <p className="text-xs text-neutral-500">
            {lastRefreshAt
              ? `最終更新: ${formatJst(lastRefreshAt)}`
              : "まだ一度も更新されていません"}
          </p>
        </div>
        <RefreshButton />
      </div>

      {refreshInBackground && (
        <p className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-sm px-4 py-2">
          データが古いためバックグラウンドで更新を開始しました。1分ほどしてから再読み込みしてください。
        </p>
      )}

      {lastErrors.length > 0 && (
        <details className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-sm px-4 py-2">
          <summary>前回の更新でエラーが{lastErrors.length}件ありました</summary>
          <ul className="list-disc pl-5 pt-1">
            {lastErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <FilterBar
        animes={allAnimes.map(({ id, name, visible }) => ({
          id,
          name,
          visible,
        }))}
        prefs={prefs}
      />

      {allAnimes.length === 0 ? (
        <p className="text-center py-16 text-neutral-500">
          まずは{" "}
          <Link href="/animes" className="text-emerald-600 underline">
            アニメ管理
          </Link>{" "}
          から好きな作品を登録してください
        </p>
      ) : rows.length === 0 ? (
        <p className="text-center py-16 text-neutral-500">
          条件に合うプライズがありません。期間を広げるか「今すぐ更新」を試してください。
        </p>
      ) : (
        <>
          <p className="text-sm text-neutral-500">{rows.length}件</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rows.map(({ prize, animeName }) => (
              <PrizeCard key={prize.id} prize={prize} animeName={animeName} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
