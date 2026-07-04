"use client";

import { useState, useTransition } from "react";
import { refreshNow } from "@/app/actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onClick = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await refreshNow();
        setMessage(
          result.skipped
            ? "クールダウン中です（少し待ってから再実行してください）"
            : `${result.processed}件を取得しました${result.errors.length > 0 ? `（エラー${result.errors.length}件）` : ""}`,
        );
      } catch {
        setMessage("更新に失敗しました");
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-neutral-500">{message}</span>}
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        {pending ? "更新中…" : "🔄 今すぐ更新"}
      </button>
    </div>
  );
}
