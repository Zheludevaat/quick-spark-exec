import type { SaveSlot, ImaginalRegion } from "../../types";

/**
 * Skeleton registry of plateau souls. Phase D will hook these into ImaginalRealmScene
 * with sprites, dialogues, and per-arc effects. For Phase A we only commit the data
 * shape so save migrations and HUD code can rely on it.
 *
 * Tone rule: every soul is fundamentally absurd-comic underneath the melancholy.
 * Even the Weeping Twin has a punchline.
 */

export type SoulId =
  | "cartographer"
  | "weeping_twin"
  | "collector"
  | "sleeper"
  | "crowned_one"
  | "stonechild"
  | "lampkeeper_echo";

export type SoulDef = {
  id: SoulId;
  region: ImaginalRegion | "all";
  /** Display name shown above their head when nearby. */
  name: string;
  /** Spawn position inside the region (world px). */
  x: number;
  y: number;
  /** Tagline shown in HUD when near. */
  hook: string;
};

export const SOULS: SoulDef[] = [
  {
    id: "cartographer",
    region: "pools",
    name: "CARTOGRAPHER",
    x: 130,
    y: 70,
    hook: "HE IS MAPPING NOTHING.",
  },
  {
    id: "weeping_twin",
    region: "pools",
    name: "WEEPING TWIN",
    x: 60,
    y: 90,
    hook: "SHE WEEPS AT HER REFLECTION.",
  },
  {
    id: "collector",
    region: "field",
    name: "COLLECTOR",
    x: 30,
    y: 70,
    hook: "JAR OF MOTES. EYES TOO BRIGHT.",
  },
  { id: "sleeper", region: "field", name: "SLEEPER", x: 110, y: 95, hook: "HE WILL NOT WAKE." },
  {
    id: "crowned_one",
    region: "corridor",
    name: "CROWNED ONE",
    x: 40,
    y: 70,
    hook: "ALREADY COMPOSED. FAINTLY SMUG.",
  },
  {
    id: "stonechild",
    region: "corridor",
    name: "STONECHILD",
    x: 120,
    y: 80,
    hook: "HE FORGOT HIS NAME. ASKS POLITELY.",
  },
  {
    id: "lampkeeper_echo",
    region: "all",
    name: "ECHO",
    x: 80,
    y: 60,
    hook: "A FAINT VERSION OF SOMEONE.",
  },
];

export function soulState(save: SaveSlot, id: SoulId): number {
  return save.souls[id] ?? 0;
}
export function setSoulState(save: SaveSlot, id: SoulId, n: number): void {
  save.souls[id] = n;
}
