import { getMeta } from "./meta";

export const META_VIEW_PREFS = "viewPrefs";

export type PeriodPreset = "1m" | "2m" | "3m" | "all" | "custom";

export interface ViewPrefs {
  preset: PeriodPreset;
  from?: string; // preset === "custom" のときの下限 (YYYY-MM-DD)
  to?: string; // preset === "custom" のときの上限 (YYYY-MM-DD)
  sort: "asc" | "desc";
}

export const DEFAULT_VIEW_PREFS: ViewPrefs = { preset: "3m", sort: "desc" };

export async function getViewPrefs(): Promise<ViewPrefs> {
  const raw = await getMeta(META_VIEW_PREFS);
  if (!raw) return DEFAULT_VIEW_PREFS;
  try {
    return { ...DEFAULT_VIEW_PREFS, ...(JSON.parse(raw) as ViewPrefs) };
  } catch {
    return DEFAULT_VIEW_PREFS;
  }
}
