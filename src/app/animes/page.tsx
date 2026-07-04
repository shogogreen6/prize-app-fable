import { asc } from "drizzle-orm";
import { AnimeManager } from "@/components/AnimeManager";
import { db } from "@/db/client";
import { animes } from "@/db/schema";
import { getBspTitleMaster, getSegaTitleMaster } from "@/lib/masters";

export const dynamic = "force-dynamic";

export default async function AnimesPage() {
  const [rows, bspMaster, segaMaster] = await Promise.all([
    db.select().from(animes).orderBy(asc(animes.createdAt)),
    getBspTitleMaster(),
    getSegaTitleMaster(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">アニメ管理</h1>
        <p className="text-sm text-neutral-500">
          プライズ情報を集めたい作品を登録します。各サイトの作品マスタ（バンプレスト
          {bspMaster.length}件 / SEGA {segaMaster.length}
          件）との対応付けもここで行います。
        </p>
      </div>
      <AnimeManager
        animes={rows}
        bspMaster={bspMaster}
        segaMaster={segaMaster}
      />
    </div>
  );
}
