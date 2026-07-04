import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meta } from "@/db/schema";

export async function getMeta(key: string): Promise<string | null> {
  const rows = await db.select().from(meta).where(eq(meta.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db
    .insert(meta)
    .values({ key, value })
    .onConflictDoUpdate({ target: meta.key, set: { value } });
}

export async function delMeta(key: string): Promise<void> {
  await db.delete(meta).where(eq(meta.key, key));
}
