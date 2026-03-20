import type { Equipment } from "../core/types";

export function hasEnchant(equipment: Equipment, id: string): boolean {
  return Object.values(equipment).some((i) =>
    i?.specialEnchantments?.some(
      (e: string) => e === id || e === `${id}:critical`,
    ),
  );
}

export function enchantMult(equipment: Equipment, id: string): number {
  return Object.values(equipment).some((i) =>
    i?.specialEnchantments?.includes(`${id}:critical`),
  )
    ? 2
    : 1;
}
