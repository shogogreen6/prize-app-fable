"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { animes } from "@/db/schema";
import { setMeta } from "@/lib/meta";
import { invalidateSegaCache, refreshAll, type RefreshResult } from "@/lib/refresh";
import { META_VIEW_PREFS, type ViewPrefs } from "@/lib/viewPrefs";

export interface AnimeInput {
  name: string;
  bspIpId: string | null;
  segaSlug: string | null;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/animes");
}

export async function createAnime(input: AnimeInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("作品名を入力してください");
  await db.insert(animes).values({
    name,
    bspIpId: input.bspIpId || null,
    segaSlug: input.segaSlug || null,
    createdAt: new Date().toISOString(),
  });
  if (input.segaSlug) await invalidateSegaCache();
  revalidateAll();
}

export async function updateAnime(id: number, input: AnimeInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("作品名を入力してください");
  await db
    .update(animes)
    .set({
      name,
      bspIpId: input.bspIpId || null,
      segaSlug: input.segaSlug || null,
    })
    .where(eq(animes.id, id));
  if (input.segaSlug) await invalidateSegaCache();
  revalidateAll();
}

export async function deleteAnime(id: number): Promise<void> {
  await db.delete(animes).where(eq(animes.id, id));
  revalidateAll();
}

export async function setAnimeVisible(
  id: number,
  visible: boolean,
): Promise<void> {
  await db.update(animes).set({ visible }).where(eq(animes.id, id));
  revalidatePath("/");
}

export async function refreshNow(): Promise<RefreshResult> {
  const result = await refreshAll({ manual: true });
  revalidateAll();
  return result;
}

export async function saveViewPrefs(prefs: ViewPrefs): Promise<void> {
  await setMeta(META_VIEW_PREFS, JSON.stringify(prefs));
  revalidatePath("/");
}
