"use client";

import { useState, useTransition } from "react";
import {
  createAnime,
  deleteAnime,
  updateAnime,
  type AnimeInput,
} from "@/app/actions";
import type { Anime } from "@/db/schema";
import { normalizeForMatch } from "@/lib/normalize";

interface BspTitle {
  ipId: string;
  name: string;
}

interface SegaTitle {
  slug: string;
  title: string;
}

interface Props {
  animes: Anime[];
  bspMaster: BspTitle[];
  segaMaster: SegaTitle[];
}

function SiteCandidatePicker<T>({
  label,
  candidates,
  all,
  selected,
  selectedLabel,
  keyOf,
  labelOf,
  onSelect,
}: {
  label: string;
  candidates: T[];
  all: T[];
  selected: string | null;
  selectedLabel: string | null;
  keyOf: (t: T) => string;
  labelOf: (t: T) => string;
  onSelect: (key: string | null) => void;
}) {
  return (
    <div className="flex-1 min-w-60 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2">
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-neutral-500">
        選択中: {selectedLabel ?? "対応なし"}
      </div>
      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="radio"
          checked={selected === null}
          onChange={() => onSelect(null)}
          className="accent-emerald-600"
        />
        対応なし
      </label>
      {candidates.map((c) => (
        <label
          key={keyOf(c)}
          className="flex items-center gap-1.5 text-sm cursor-pointer"
        >
          <input
            type="radio"
            checked={selected === keyOf(c)}
            onChange={() => onSelect(keyOf(c))}
            className="accent-emerald-600"
          />
          {labelOf(c)}
        </label>
      ))}
      <details className="text-xs">
        <summary className="cursor-pointer text-neutral-500">
          全作品リストから選ぶ（{all.length}件）
        </summary>
        <select
          value={selected ?? ""}
          onChange={(e) => onSelect(e.target.value || null)}
          className="mt-1 w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm dark:bg-neutral-900"
        >
          <option value="">対応なし</option>
          {all.map((t) => (
            <option key={keyOf(t)} value={keyOf(t)}>
              {labelOf(t)}
            </option>
          ))}
        </select>
      </details>
    </div>
  );
}

function AnimeForm({
  initial,
  bspMaster,
  segaMaster,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Anime;
  bspMaster: BspTitle[];
  segaMaster: SegaTitle[];
  submitLabel: string;
  onSubmit: (input: AnimeInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [bspIpId, setBspIpId] = useState<string | null>(
    initial?.bspIpId ?? null,
  );
  const [segaSlug, setSegaSlug] = useState<string | null>(
    initial?.segaSlug ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = normalizeForMatch(name);
  const matches = (candidate: string) => {
    const n = normalizeForMatch(candidate);
    return n.includes(q) || q.includes(n);
  };
  const bspCandidates =
    q.length >= 2 ? bspMaster.filter((t) => matches(t.name)).slice(0, 8) : [];
  const segaCandidates =
    q.length >= 2 ? segaMaster.filter((t) => matches(t.title)).slice(0, 8) : [];

  const onNameChange = (value: string) => {
    setName(value);
    // 完全一致（正規化後）の候補があれば自動選択して手間を省く
    const nq = normalizeForMatch(value);
    if (nq.length >= 2) {
      const bspExact = bspMaster.find((t) => normalizeForMatch(t.name) === nq);
      if (bspExact) setBspIpId(bspExact.ipId);
      const segaExact = segaMaster.find(
        (t) => normalizeForMatch(t.title) === nq,
      );
      if (segaExact) setSegaSlug(segaExact.slug);
    }
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ name, bspIpId, segaSlug });
        if (!initial) {
          setName("");
          setBspIpId(null);
          setSegaSlug(null);
        }
        onCancel?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">作品名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="例: 呪術廻戦"
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
        />
      </label>
      <p className="text-xs text-neutral-500">
        作品名を入力すると各サイトの候補が表示されます。対応付けた作品のプライズが収集されます。
      </p>
      <div className="flex flex-wrap gap-3">
        <SiteCandidatePicker
          label="バンプレスト (bsp-prize.jp)"
          candidates={bspCandidates}
          all={bspMaster}
          selected={bspIpId}
          selectedLabel={
            bspIpId
              ? (bspMaster.find((t) => t.ipId === bspIpId)?.name ?? bspIpId)
              : null
          }
          keyOf={(t) => t.ipId}
          labelOf={(t) => t.name}
          onSelect={setBspIpId}
        />
        <SiteCandidatePicker
          label="SEGA (segaplaza.jp)"
          candidates={segaCandidates}
          all={segaMaster}
          selected={segaSlug}
          selectedLabel={
            segaSlug
              ? (segaMaster.find((t) => t.slug === segaSlug)?.title ?? segaSlug)
              : null
          }
          keyOf={(t) => t.slug}
          labelOf={(t) => t.title}
          onSelect={setSegaSlug}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending || name.trim().length === 0}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2"
        >
          {pending ? "保存中…" : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
}

export function AnimeManager({ animes, bspMaster, segaMaster }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const bspName = (ipId: string | null) =>
    ipId ? (bspMaster.find((t) => t.ipId === ipId)?.name ?? ipId) : null;
  const segaTitle = (slug: string | null) =>
    slug ? (segaMaster.find((t) => t.slug === slug)?.title ?? slug) : null;

  const remove = (anime: Anime) => {
    if (
      !window.confirm(
        `「${anime.name}」を削除しますか？収集済みのプライズ情報も削除されます。`,
      )
    ) {
      return;
    }
    startTransition(() => deleteAnime(anime.id));
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">新しい作品を登録</h2>
        <AnimeForm
          bspMaster={bspMaster}
          segaMaster={segaMaster}
          submitLabel="登録する"
          onSubmit={createAnime}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">登録済みの作品（{animes.length}）</h2>
        {animes.length === 0 && (
          <p className="text-sm text-neutral-500">
            まだ登録がありません。上のフォームから登録してください。
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {animes.map((anime) =>
            editingId === anime.id ? (
              <li key={anime.id}>
                <AnimeForm
                  initial={anime}
                  bspMaster={bspMaster}
                  segaMaster={segaMaster}
                  submitLabel="更新する"
                  onSubmit={(input) => updateAnime(anime.id, input)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={anime.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
              >
                <span className="font-semibold">{anime.name}</span>
                <span className="text-xs text-neutral-500">
                  バンプレスト: {bspName(anime.bspIpId) ?? "対応なし"}
                </span>
                <span className="text-xs text-neutral-500">
                  SEGA: {segaTitle(anime.segaSlug) ?? "対応なし"}
                </span>
                <span className="ml-auto flex gap-2">
                  <button
                    onClick={() => setEditingId(anime.id)}
                    className="text-sm px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => remove(anime)}
                    className="text-sm px-3 py-1 rounded border border-red-300 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    削除
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}
