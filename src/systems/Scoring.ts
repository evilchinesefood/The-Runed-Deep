export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  floor: number;
  turns: number;
  difficulty: string;
  causeOfDeath: string;
  timestamp: number;
}

const LEADERBOARD_KEY = "rd-leaderboard";
const MAX_ENTRIES = 10;

export function calculateScore(
  level: number,
  floor: number,
  xp: number,
  turns: number,
  copper: number,
  difficulty: string,
): number {
  let score = xp + floor * 100 + level * 50 + copper;
  const diffMult: Record<string, number> = {
    easy: 1,
    intermediate: 1.5,
    hard: 2.5,
    impossible: 5,
  };
  score = Math.floor(score * (diffMult[difficulty] ?? 1));
  const efficiency = Math.max(0.5, 1 - turns / 10000);
  score = Math.floor(score * efficiency);
  return score;
}

export function getLeaderboard(): ScoreEntry[] {
  try {
    const json = localStorage.getItem(LEADERBOARD_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function addToLeaderboard(entry: ScoreEntry): number {
  const board = getLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, MAX_ENTRIES);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  const rank = trimmed.findIndex(
    (e) =>
      e.name === entry.name &&
      e.score === entry.score &&
      e.timestamp === entry.timestamp,
  );
  return rank >= 0 ? rank + 1 : 0;
}

export function clearLeaderboard(): void {
  localStorage.removeItem(LEADERBOARD_KEY);
}
