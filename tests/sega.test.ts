import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractOgImage,
  extractPrizes,
  listSegaTitles,
  type SegaSearchDb,
  type SegaSearchDb2,
} from "../src/lib/scrapers/sega";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "fixtures", name), "utf-8");

const db = JSON.parse(fixture("sega-search-db.json")) as SegaSearchDb;
const db2 = JSON.parse(fixture("sega-search-db2.json")) as SegaSearchDb2;

describe("extractPrizes", () => {
  const apex = extractPrizes(db, db2, "apex-legends");

  it("スラッグ一致でプライズを抽出する", () => {
    expect(apex.length).toBeGreaterThan(0);
    const b121099 = apex.find((p) => p.sourceId === "B121099");
    expect(b121099).toBeDefined();
    expect(b121099!.name).toBe("Apex Legends™ 寝そべり ぬいぐるみ");
    expect(b121099!.itemUrl).toBe("https://segaplaza.jp/prize/B121099");
    expect(b121099!.releaseDateRaw).toBe("2024-11-29");
    expect(b121099!.releaseDate).toBe("2024-11-29");
    expect(b121099!.datePrecision).toBe("day");
  });

  it("存在しないスラッグは空配列", () => {
    expect(extractPrizes(db, db2, "no-such-slug")).toEqual([]);
  });
});

describe("listSegaTitles", () => {
  it("スラッグと表示名の対応を作る", () => {
    const titles = listSegaTitles(db, db2);
    expect(titles).toContainEqual({
      slug: "apex-legends",
      title: "Apex Legends",
    });
    expect(titles).toContainEqual({
      slug: "nierautomata-anime",
      title: "NieR:Automata Ver1.1a",
    });
  });
});

describe("extractOgImage", () => {
  it("商品ページから og:image を抜き出す", () => {
    expect(extractOgImage(fixture("sega-prize-page.html"))).toBe(
      "https://segaplaza.jp/images-v2/prize/B121099_99e388/large/B121099_01.webp",
    );
  });

  it("og:image が無ければ null", () => {
    expect(extractOgImage("<html><head></head></html>")).toBeNull();
  });
});
