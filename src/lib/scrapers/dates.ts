export type DatePrecision = "day" | "month" | "unknown";

export interface ParsedDate {
  iso: string | null;
  precision: DatePrecision;
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * BSP の登場日文字列をパースする。
 * 例: 「2026年7月29日（水）より順次登場予定」「2026年9月登場予定」「2027年1月発送予定」
 */
export function parseBspDate(raw: string): ParsedDate {
  const s = raw.replace(/\s+/g, "");
  const day = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (day) {
    return { iso: toIso(+day[1], +day[2], +day[3]), precision: "day" };
  }
  const month = s.match(/(\d{4})年(\d{1,2})月/);
  if (month) {
    return { iso: toIso(+month[1], +month[2], 1), precision: "month" };
  }
  return { iso: null, precision: "unknown" };
}

// 本家 segaplaza の検索コードは 上旬=1日 / 中旬=11日 / 下旬=21日 として扱っている
const SEGA_PART_OF_MONTH: Record<string, number> = { 上旬: 1, 中旬: 11, 下旬: 21 };
const SEGA_SEASON_MONTH: Record<string, number> = { 春: 4, 夏: 7, 秋: 10, 冬: 12 };

/**
 * SEGA (search-db2.json) の登場日文字列をパースする。
 * 例: 「2024-05-24」「2026-7-上旬」「2026-春」
 */
export function parseSegaDate(raw: string): ParsedDate {
  const parts = raw.split("-");
  const y = parseInt(parts[0], 10);
  if (!Number.isFinite(y) || parts.length < 2) {
    return { iso: null, precision: "unknown" };
  }
  if (parts[1] in SEGA_SEASON_MONTH) {
    return { iso: toIso(y, SEGA_SEASON_MONTH[parts[1]], 1), precision: "month" };
  }
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) {
    return { iso: null, precision: "unknown" };
  }
  if (parts.length < 3) {
    return { iso: toIso(y, m, 1), precision: "month" };
  }
  if (parts[2] in SEGA_PART_OF_MONTH) {
    return { iso: toIso(y, m, SEGA_PART_OF_MONTH[parts[2]]), precision: "month" };
  }
  const d = parseInt(parts[2], 10);
  if (!Number.isFinite(d) || d < 1 || d > 31) {
    return { iso: toIso(y, m, 1), precision: "month" };
  }
  return { iso: toIso(y, m, d), precision: "day" };
}

/** JST での今日の日付 (YYYY-MM-DD)。Vercel は UTC で動くため明示的に +9h する */
export function todayJst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** JST での「今日から n ヶ月前」の日付 (YYYY-MM-DD)。直近Nヶ月プリセットの下限に使う */
export function monthsAgoJst(n: number): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1 - n;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  const d = Math.min(now.getUTCDate(), daysInMonth(y, m));
  return toIso(y, m, d);
}
