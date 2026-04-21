import type { SaveSlot, ImaginalRegion } from "../../types";

/**
 * Registry of plateau souls. Each soul is a vignette: a position, a hook,
 * and (in soulArcs.ts) a multi-step arc the player resolves through verbs.
 *
 * Famous "shades" are NEVER named in dialog — only revealed in the lore log
 * once their arc is finished. The hook is the only on-screen tell.
 */

export type SoulId =
  | "cartographer"
  | "weeping_twin"
  | "drowned_poet"
  | "mirror_philosopher"
  | "collector"
  | "sleeper"
  | "walking_saint"
  | "composer"
  | "crowned_one"
  | "stonechild"
  | "lantern_mathematician"
  | "weighed_heart"
  | "lampkeeper_echo"
  // ===== ACT II EXPANSION SOULS =====
  /** Pools — a bride who keeps drifting away from her own vow. */
  | "drifting_bride"
  /** Pools — veiled mourner who cannot uncover what she lost. */
  | "veiled_mourner"
  /** Field — hoards every dawn into jars. */
  | "hoarder_of_dawns"
  /** Corridor — a sovereign who rules only paper. */
  | "paper_sovereign";

/** Visual archetype — which sprite renderer to use. */
export type SoulArchetype =
  | "robed"
  | "weeper"
  | "drowned"
  | "mirror"
  | "collector"
  | "sleeper"
  | "saint"
  | "composer"
  | "crowned"
  | "stonechild"
  | "mathematician"
  | "feather"
  | "echo";

export type SoulDef = {
  id: SoulId;
  region: ImaginalRegion | "all";
  archetype: SoulArchetype;
  /** Display name shown above their head when nearby. */
  name: string;
  /** Spawn position inside the region (world px). */
  x: number;
  y: number;
  /** Tagline shown in HUD when near. */
  hook: string;
  /** Lore id revealed (in the log) when the arc resolves — names the shade. */
  loreOnComplete?: string;
};

export const SOULS: SoulDef[] = [
  // ===== POOLS =====
  {
    id: "cartographer",
    region: "pools",
    archetype: "robed",
    name: "CARTOGRAPHER",
    x: 32,
    y: 64,
    hook: "HE IS MAPPING NOTHING.",
    loreOnComplete: "soul_cartographer",
  },
  {
    id: "weeping_twin",
    region: "pools",
    archetype: "weeper",
    name: "WEEPING TWIN",
    x: 64,
    y: 96,
    hook: "SHE WEEPS AT HER REFLECTION.",
    loreOnComplete: "soul_weeping_twin",
  },
  {
    id: "drowned_poet",
    region: "pools",
    archetype: "drowned",
    name: "ONE WHO SANG",
    x: 128,
    y: 96,
    hook: "A HALF-LINE. NO ONE FINISHED IT.",
    loreOnComplete: "soul_drowned_poet",
  },
  {
    id: "mirror_philosopher",
    region: "pools",
    archetype: "mirror",
    name: "ONE BY THE WATER",
    x: 112,
    y: 64,
    hook: "THE POOL, HE SAYS, IS THE TRUER WORLD.",
    loreOnComplete: "soul_mirror_philosopher",
  },

  // ===== FIELD =====
  {
    id: "collector",
    region: "field",
    archetype: "collector",
    name: "COLLECTOR",
    x: 30,
    y: 70,
    hook: "JAR OF MOTES. EYES TOO BRIGHT.",
    loreOnComplete: "soul_collector",
  },
  {
    id: "sleeper",
    region: "field",
    archetype: "sleeper",
    name: "SLEEPER",
    x: 110,
    y: 95,
    hook: "HE WILL NOT WAKE.",
    loreOnComplete: "soul_sleeper",
  },
  {
    id: "walking_saint",
    region: "field",
    archetype: "saint",
    name: "ONE WHO REFUSES",
    x: 60,
    y: 100,
    hook: "SHE THANKS YOU AND DECLINES.",
    loreOnComplete: "soul_walking_saint",
  },
  {
    id: "composer",
    region: "field",
    archetype: "composer",
    name: "ONE WHO LISTENS",
    x: 130,
    y: 64,
    hook: "IS THERE A TUNE HERE? HE CANNOT HEAR.",
    loreOnComplete: "soul_composer",
  },

  // ===== CORRIDOR =====
  {
    id: "crowned_one",
    region: "corridor",
    archetype: "crowned",
    name: "CROWNED ONE",
    x: 40,
    y: 70,
    hook: "ALREADY COMPOSED. FAINTLY SMUG.",
    loreOnComplete: "soul_crowned_one",
  },
  {
    id: "stonechild",
    region: "corridor",
    archetype: "stonechild",
    name: "STONECHILD",
    x: 120,
    y: 80,
    hook: "HE FORGOT HIS NAME. ASKS POLITELY.",
    loreOnComplete: "soul_stonechild",
  },
  {
    id: "lantern_mathematician",
    region: "corridor",
    archetype: "mathematician",
    name: "ONE COUNTING",
    x: 64,
    y: 96,
    hook: "COUNTING INFINITIES BY LAMPLIGHT.",
    loreOnComplete: "soul_lantern_mathematician",
  },
  {
    id: "weighed_heart",
    region: "corridor",
    archetype: "feather",
    name: "ONE WHO CARRIED A FEATHER",
    x: 100,
    y: 64,
    hook: "HOLD THIS. SHE IS TRYING TO REMEMBER.",
    loreOnComplete: "soul_weighed_heart",
  },

  // ===== WANDERER =====
  {
    id: "lampkeeper_echo",
    region: "all",
    archetype: "echo",
    name: "ECHO",
    x: 80,
    y: 56,
    hook: "A FAINT VERSION OF SOMEONE.",
    loreOnComplete: "soul_echo",
  },

  // ===== ACT II EXPANSION =====
  // Pools — drifting bride (mirror archetype, opposite shore from the twin).
  {
    id: "drifting_bride",
    region: "pools",
    archetype: "mirror",
    name: "DRIFTING BRIDE",
    x: 24,
    y: 96,
    hook: "SHE STILL DRIFTS TOWARD A VOW SHE CANNOT REACH.",
    loreOnComplete: "soul_drifting_bride",
  },
  // Pools — veiled mourner (weeper archetype, north shore).
  {
    id: "veiled_mourner",
    region: "pools",
    archetype: "weeper",
    name: "VEILED MOURNER",
    x: 96,
    y: 40,
    hook: "THE VEIL HIDES NOTHING. SHE WILL NOT LIFT IT.",
    loreOnComplete: "soul_veiled_mourner",
  },
  // Field — hoarder of dawns (collector archetype variant).
  {
    id: "hoarder_of_dawns",
    region: "field",
    archetype: "collector",
    name: "HOARDER OF DAWNS",
    x: 88,
    y: 44,
    hook: "EACH JAR HOLDS A MORNING NEVER LIVED.",
    loreOnComplete: "soul_hoarder_of_dawns",
  },
  // Corridor — paper sovereign (crowned archetype variant).
  {
    id: "paper_sovereign",
    region: "corridor",
    archetype: "crowned",
    name: "PAPER SOVEREIGN",
    x: 80,
    y: 100,
    hook: "HE RULES A KINGDOM CUT FROM ANNOUNCEMENTS.",
    loreOnComplete: "soul_paper_sovereign",
  },
];

export function soulState(save: SaveSlot, id: SoulId): number {
  return save.souls[id] ?? 0;
}
export function setSoulState(save: SaveSlot, id: SoulId, n: number): void {
  save.souls[id] = n;
}

/** Pick the wanderer's region — wherever the player has visited least. */
export function wandererRegion(save: SaveSlot): ImaginalRegion {
  const visited: Record<ImaginalRegion, number> = {
    pools: save.flags.intro_pools ? 1 : 0,
    field: save.flags.intro_field ? 1 : 0,
    corridor: save.flags.intro_corridor ? 1 : 0,
  };
  let best: ImaginalRegion = "pools";
  let bd = Infinity;
  (["pools", "field", "corridor"] as ImaginalRegion[]).forEach((r) => {
    if (visited[r] < bd) {
      bd = visited[r];
      best = r;
    }
  });
  return best;
}

/** Get all souls that should appear in this region right now. */
export function soulsForRegion(save: SaveSlot, region: ImaginalRegion): SoulDef[] {
  const fixed = SOULS.filter((s) => s.region === region);
  const wanderer = SOULS.find((s) => s.region === "all");
  if (wanderer && wandererRegion(save) === region) {
    return [...fixed, { ...wanderer, region }];
  }
  return fixed;
}
