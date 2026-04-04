// Load town config from JSON at startup, fall back to hardcoded data

import { TOWN_CONFIG, type TownConfig } from "../../data/TownConfigData";

let cachedConfig: TownConfig | null = null;

/** Load town config from JSON. Call once at startup. */
export async function loadTownConfig(): Promise<void> {
  const paths = ["/rd/town-config.json", "./town-config.json"];
  for (const url of paths) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        cachedConfig = await res.json();
        return;
      }
    } catch {
      /* try next path */
    }
  }
}

/** Get town config — loaded JSON or hardcoded fallback. */
export function getTownConfig(): TownConfig {
  return cachedConfig || TOWN_CONFIG;
}
