export function calculateScore(
  level: number,
  floor: number,
  xp: number,
  turns: number,
  gold: number,
  difficulty: string,
): number {
  let score = xp + floor * 100 + level * 50 + gold;
  const diffMult: Record<string, number> = {
    normal: 1, intermediate: 1.5, hard: 2.5, nightmare: 4, impossible: 5,
  };
  score = Math.floor(score * (diffMult[difficulty] ?? 1));
  const efficiency = Math.max(0.5, 1 - turns / 10000);
  return Math.floor(score * efficiency);
}
