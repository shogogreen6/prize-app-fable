import type { Prize } from "@/db/schema";

const SOURCE_LABEL: Record<Prize["source"], string> = {
  bsp: "バンプレスト",
  sega: "SEGA",
};

const SOURCE_BADGE: Record<Prize["source"], string> = {
  bsp: "bg-rose-600",
  sega: "bg-sky-600",
};

function formatDate(prize: Prize): string {
  if (!prize.releaseDate) return prize.releaseDateRaw || "時期不明";
  const [y, m, d] = prize.releaseDate.split("-").map(Number);
  return prize.datePrecision === "month"
    ? `${y}年${m}月`
    : `${y}年${m}月${d}日`;
}

export function PrizeCard({
  prize,
  animeName,
}: {
  prize: Prize;
  animeName: string;
}) {
  return (
    <a
      href={prize.itemUrl}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 hover:shadow-lg transition-shadow flex flex-col"
    >
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
        {prize.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prize.imageUrl}
            alt={prize.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-neutral-400">
            🧸
          </div>
        )}
        <span
          className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded ${SOURCE_BADGE[prize.source]}`}
        >
          {SOURCE_LABEL[prize.source]}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <span className="text-xs text-neutral-500 truncate">{animeName}</span>
        <span className="text-sm font-medium leading-snug line-clamp-3 group-hover:underline">
          {prize.name}
        </span>
        <span
          className="mt-auto pt-1 text-xs text-neutral-600 dark:text-neutral-400"
          title={prize.releaseDateRaw}
        >
          📅 {formatDate(prize)}
        </span>
      </div>
    </a>
  );
}
