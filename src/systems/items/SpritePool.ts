// Sprite pool — assigns random sprites to items from configured pools

export interface SpriteEntry {
  layers: string[];
  uniqueOnly: boolean;
}

let pools: Record<string, SpriteEntry[]> = {};
let loaded = false;

/** Load sprite pool config. Call once at startup. */
export async function loadSpritePools(): Promise<void> {
  const paths = ["/rd/sprite-slots.json", "./sprite-slots.json"];
  for (const url of paths) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        pools = await res.json();
        loaded = true;
        return;
      }
    } catch {
      /* try next path */
    }
  }
}

/** Pick a random sprite for an item. Returns array of CSS class layers. */
export function pickItemSprite(
  itemId: string,
  isUnique: boolean = false,
): string[] {
  const pool = pools[itemId];
  if (!pool || pool.length === 0) return [];

  let candidates = isUnique
    ? pool.filter((e) => e.uniqueOnly)
    : pool.filter((e) => !e.uniqueOnly);

  if (candidates.length === 0) candidates = pool;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick.layers;
}

/** Check if pools are loaded */
export function spritePoolsLoaded(): boolean {
  return loaded;
}
