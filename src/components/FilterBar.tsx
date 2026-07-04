"use client";

import { useState, useTransition } from "react";
import { saveViewPrefs, setAnimeVisible } from "@/app/actions";
import type { PeriodPreset, ViewPrefs } from "@/lib/viewPrefs";

interface AnimeItem {
  id: number;
  name: string;
  visible: boolean;
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "1m", label: "直近1ヶ月〜" },
  { value: "2m", label: "直近2ヶ月〜" },
  { value: "3m", label: "直近3ヶ月〜" },
  { value: "all", label: "すべて" },
  { value: "custom", label: "期間指定" },
];

export function FilterBar({
  animes,
  prefs,
}: {
  animes: AnimeItem[];
  prefs: ViewPrefs;
}) {
  const [, startTransition] = useTransition();
  // サーバー反映を待たずに即時表示を切り替えるためのローカル状態
  const [checked, setChecked] = useState<Record<number, boolean>>(
    Object.fromEntries(animes.map((a) => [a.id, a.visible])),
  );
  const [preset, setPreset] = useState<PeriodPreset>(prefs.preset);
  const [from, setFrom] = useState(prefs.from ?? "");
  const [to, setTo] = useState(prefs.to ?? "");

  const savePrefs = (next: Partial<ViewPrefs>) => {
    startTransition(() =>
      saveViewPrefs({
        preset,
        sort: prefs.sort,
        from: from || undefined,
        to: to || undefined,
        ...next,
      }),
    );
  };

  const toggleAnime = (id: number, value: boolean) => {
    setChecked((prev) => ({ ...prev, [id]: value }));
    startTransition(() => setAnimeVisible(id, value));
  };

  const changePreset = (value: PeriodPreset) => {
    setPreset(value);
    if (value !== "custom") savePrefs({ preset: value });
  };

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-semibold shrink-0">表示する作品:</span>
        {animes.length === 0 && (
          <span className="text-sm text-neutral-500">
            まだ作品が登録されていません
          </span>
        )}
        {animes.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={checked[a.id] ?? true}
              onChange={(e) => toggleAnime(a.id, e.target.checked)}
              className="size-4 accent-emerald-600"
            />
            {a.name}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-semibold shrink-0">登場日:</span>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => changePreset(p.value)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                preset === p.value
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
            />
            <span>〜</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
            />
            <button
              onClick={() => savePrefs({ preset: "custom" })}
              className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1"
            >
              適用
            </button>
          </div>
        )}
        <button
          onClick={() =>
            savePrefs({ sort: prefs.sort === "desc" ? "asc" : "desc" })
          }
          className="ml-auto text-sm px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title="登場日の並び順を切り替え"
        >
          登場日 {prefs.sort === "desc" ? "新しい順 ▼" : "古い順 ▲"}
        </button>
      </div>
    </section>
  );
}
