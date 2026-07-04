import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTitleItems, parseTitleList } from "../src/lib/scrapers/bsp";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "fixtures", name), "utf-8");

describe("parseTitleList (/title/ 作品マスタ)", () => {
  const titles = parseTitleList(fixture("bsp-title-list.html"));

  it("全作品を抽出する（取得時点で367件）", () => {
    expect(titles.length).toBe(367);
  });

  it("IP ID と作品名が対応している", () => {
    expect(titles).toContainEqual({ ipId: "IP00002080", name: "呪術廻戦" });
    expect(titles).toContainEqual({ ipId: "IP00002025", name: "ワンピース" });
  });
});

describe("parseTitleItems (/title/{IP}/ 商品一覧)", () => {
  const items = parseTitleItems(fixture("bsp-title-items.html"));

  it("15件のローリングウィンドウを抽出する", () => {
    expect(items.length).toBe(15);
  });

  it("各フィールドが正しく取れている", () => {
    for (const item of items) {
      expect(item.sourceId).toMatch(/^\d+$/);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.itemUrl).toMatch(/^https:\/\/bsp-prize\.jp\/item\/\d+\/$/);
      expect(item.imageUrl).toMatch(/^https:\/\/bsp-prize\.jp\//);
    }
  });

  it("月単位の日付をパースできる（先頭アイテム: 2026年9月）", () => {
    expect(items[0].releaseDate).toBe("2026-09-01");
    expect(items[0].datePrecision).toBe("month");
  });

  it("日単位の日付をパースできる", () => {
    const daily = items.filter((i) => i.datePrecision === "day");
    expect(daily.length).toBeGreaterThan(0);
    expect(daily[0].releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
