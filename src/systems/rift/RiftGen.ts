import type {
  GameState,
  Floor,
  RiftState,
  PlacedItem,
  Vector2,
} from "../../core/types";
import { generateFloor } from "../dungeon/generator";

const RIFT_TILESETS = ["mine", "fortress", "castle"] as const;
const ELEMENTS = ["fire", "cold", "lightning"] as const;

function hasRiftMod(rift: RiftState, id: string): boolean {
  return rift.modifiers.some((m) => m.id === id);
}

/** Generate a rift floor using random tileset, then apply modifier effects */
export function generateRiftFloor(
  rift: RiftState,
  state: GameState,
): { floor: Floor; playerStart: { x: number; y: number } } {
  let s = rift.seed + rift.currentFloor * 7919;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const tilesetIdx = Math.floor(rand() * RIFT_TILESETS.length);
  const dungeonId = RIFT_TILESETS[tilesetIdx];

  const depth = Math.max(1, state.town.deepestFloor || state.currentFloor);

  const hasStairsUp = rift.currentFloor > 1;
  const hasStairsDown = true; // always — last floor stairs act as exit portal

  const result = generateFloor(
    dungeonId,
    depth,
    rift.seed + rift.currentFloor,
    hasStairsUp,
    hasStairsDown,
    state.difficulty,
    state.ngPlusCount,
  );

  let { floor } = result;

  // ── brittle: halve monster HP ───────────────────────────
  if (hasRiftMod(rift, "brittle")) {
    floor = {
      ...floor,
      monsters: floor.monsters.map((m) => ({
        ...m,
        maxHp: Math.max(1, Math.floor(m.maxHp / 2)),
        hp: Math.max(1, Math.floor(m.hp / 2)),
      })),
    };
  }

  // ── swarm: double spawns, halve XP ─────────────────────
  if (hasRiftMod(rift, "swarm")) {
    const clones = floor.monsters.map((m) => {
      const off = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      let pos: Vector2 = m.position;
      for (const d of off) {
        const nx = m.position.x + d.x;
        const ny = m.position.y + d.y;
        if (
          ny >= 0 &&
          ny < floor.height &&
          nx >= 0 &&
          nx < floor.width &&
          floor.tiles[ny][nx].walkable
        ) {
          pos = { x: nx, y: ny };
          break;
        }
      }
      return {
        ...m,
        id: m.id + "-sw",
        position: pos,
        xpValue: Math.max(1, Math.floor(m.xpValue / 2)),
      };
    });
    floor = {
      ...floor,
      monsters: [
        ...floor.monsters.map((m) => ({
          ...m,
          xpValue: Math.max(1, Math.floor(m.xpValue / 2)),
        })),
        ...clones,
      ],
    };
  }

  // ── abundance: double items ─────────────────────────────
  if (hasRiftMod(rift, "abundance")) {
    let nextId = Date.now();
    const dupes: PlacedItem[] = floor.items.map((pi) => ({
      item: { ...pi.item, id: `rift-dup-${nextId++}` },
      position: { ...pi.position },
    }));
    floor = { ...floor, items: [...floor.items, ...dupes] };
  }

  // ── elemental-surge: add elemental ability to each monster
  if (hasRiftMod(rift, "elemental-surge")) {
    const elemIdx = Math.floor(rand() * ELEMENTS.length);
    const bolt = `cast-${ELEMENTS[elemIdx]}-bolt`;
    floor = {
      ...floor,
      monsters: floor.monsters.map((m) =>
        m.abilities.includes(bolt)
          ? m
          : { ...m, abilities: [...m.abilities, bolt] },
      ),
    };
  }

  return { floor, playerStart: result.playerStart };
}
