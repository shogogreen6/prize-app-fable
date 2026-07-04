import { describe, expect, it } from "vitest";
import {
  monthsAgoJst,
  parseBspDate,
  parseSegaDate,
  todayJst,
} from "../src/lib/scrapers/dates";

describe("parseBspDate", () => {
  it("日単位（曜日・順次登場予定つき）", () => {
    expect(parseBspDate("2026年7月29日（水）より順次登場予定")).toEqual({
      iso: "2026-07-29",
      precision: "day",
    });
  });

  it("月単位（登場予定）", () => {
    expect(parseBspDate("2026年9月登場予定")).toEqual({
      iso: "2026-09-01",
      precision: "month",
    });
  });

  it("プレミアムバンダイの発送予定", () => {
    expect(parseBspDate("2027年1月発送予定")).toEqual({
      iso: "2027-01-01",
      precision: "month",
    });
  });

  it("パース不能な文字列", () => {
    expect(parseBspDate("好評登場中")).toEqual({
      iso: null,
      precision: "unknown",
    });
  });
});

describe("parseSegaDate", () => {
  it("完全な日付", () => {
    expect(parseSegaDate("2024-05-24")).toEqual({
      iso: "2024-05-24",
      precision: "day",
    });
  });

  it("上旬・中旬・下旬（本家実装と同じ 1/11/21 日扱い）", () => {
    expect(parseSegaDate("2026-7-上旬").iso).toBe("2026-07-01");
    expect(parseSegaDate("2026-7-中旬").iso).toBe("2026-07-11");
    expect(parseSegaDate("2026-7-下旬").iso).toBe("2026-07-21");
    expect(parseSegaDate("2026-7-上旬").precision).toBe("month");
  });

  it("季節", () => {
    expect(parseSegaDate("2026-春")).toEqual({
      iso: "2026-04-01",
      precision: "month",
    });
  });

  it("月のみ", () => {
    expect(parseSegaDate("2026-11")).toEqual({
      iso: "2026-11-01",
      precision: "month",
    });
  });

  it("空文字・不正値", () => {
    expect(parseSegaDate("").precision).toBe("unknown");
    expect(parseSegaDate("未定").precision).toBe("unknown");
  });
});

describe("JST日付ヘルパー", () => {
  it("todayJst は YYYY-MM-DD 形式", () => {
    expect(todayJst()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("monthsAgoJst は今日より過去", () => {
    expect(monthsAgoJst(1) < todayJst()).toBe(true);
    expect(monthsAgoJst(3) < monthsAgoJst(1)).toBe(true);
  });
});
