import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const animes = sqliteTable("animes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // 各サイトでの対応付け。片方しか無い作品は null のまま
  bspIpId: text("bsp_ip_id"),
  segaSlug: text("sega_slug"),
  // 一覧画面のチェックボックス状態（表示対象かどうか）を永続化
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const prizes = sqliteTable(
  "prizes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source", { enum: ["bsp", "sega"] }).notNull(),
    sourceId: text("source_id").notNull(),
    animeId: integer("anime_id")
      .notNull()
      .references(() => animes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    itemUrl: text("item_url").notNull(),
    releaseDateRaw: text("release_date_raw").notNull(),
    // ソート・期間絞り込み用の正規化日付（YYYY-MM-DD）。月精度は1日に丸める
    releaseDate: text("release_date"),
    datePrecision: text("date_precision", { enum: ["day", "month", "unknown"] })
      .notNull()
      .default("unknown"),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (t) => [uniqueIndex("prizes_source_source_id").on(t.source, t.sourceId)],
);

// lastRefreshAt / segaDbEtag / viewPrefs などのキーバリュー
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// BSP 作品マスタのキャッシュ（アニメ登録時のサジェスト用）
export const bspTitles = sqliteTable("bsp_titles", {
  ipId: text("ip_id").primaryKey(),
  name: text("name").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});

export type Anime = typeof animes.$inferSelect;
export type Prize = typeof prizes.$inferSelect;
export type PrizeSource = Prize["source"];
