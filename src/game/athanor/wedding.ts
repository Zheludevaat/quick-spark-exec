/**
 * Wedding — the two pairings of Rubedo.
 *
 * The player is offered two unions (Black↔White, Yellow↔Red). For each,
 * Soryn pushes back with an arc-aware rebuttal. The player can HOLD their
 * pairing, YIELD to Soryn's alternative, or (if Soryn has been released)
 * walk it through alone.
 *
 * Counts: holds=2 → strong, yields=2 → gentle, mixed → fractured.
 *
 * If Soryn is released mid-scene, the second pairing's "yield" is replaced
 * by a solo "WALK ALONE" option that counts as a hold.
 */
import type { SaveSlot, WeddingType } from "../types";
import { hasChoice } from "../scenes/imaginal/soulRunner";

export type PairingResult = "hold" | "yield" | "alone";

export type Pairing = {
  id: "black_white" | "yellow_red";
  prompt: { who: string; text: string };
  hold: { label: string; reply: string };
  /** Soryn's rebuttal — varies with Act 1/2 history. */
  rebuttal: (save: SaveSlot) => { who: string; text: string };
  yield: { label: string; reply: string };
};

export const PAIRINGS: Pairing[] = [
  {
    id: "black_white",
    prompt: { who: "SORYN", text: "Black and white. Pair them?" },
    hold: {
      label: "HOLD: SHADOW WEDS PURITY",
      reply: "She presses. You hold. The wax does not break.",
    },
    rebuttal: (save) =>
      save.shadesEncountered["inquisitor"] === "sat_with"
        ? { who: "SORYN", text: "But the Inquisitor sat with you. Why marry him to anyone?" }
        : { who: "SORYN", text: "Shadow needs no bride. Let it stand alone." },
    yield: {
      label: "YIELD: LET THE SHADOW STAND",
      reply: "She nods. The pairing softens. Something stays unmarried.",
    },
  },
  {
    id: "yellow_red",
    prompt: { who: "SORYN", text: "Yellow and red. Mind and heart. Pair them?" },
    hold: {
      label: "HOLD: MIND WEDS HEART",
      reply: "Steady. The room warms.",
    },
    rebuttal: (save) => {
      if (hasChoice(save, "weighed_heart", "held")) {
        return { who: "SORYN", text: "You held the feather. You know what mind costs heart." };
      }
      if (Object.values(save.convictions).filter(Boolean).length >= 3) {
        return { who: "SORYN", text: "Three convictions and a wedding? Greedy." };
      }
      return { who: "SORYN", text: "Heart was always the senior partner. Don't wed them — let her speak." };
    },
    yield: {
      label: "YIELD: HEART SPEAKS, MIND LISTENS",
      reply: "She is pleased. Too pleased?",
    },
  },
];

export function tallyWedding(holds: number, yields: number, alones: number): WeddingType {
  const totalHold = holds + alones;
  if (totalHold >= 2 && yields === 0) return "strong";
  if (yields >= 2 && holds === 0 && alones === 0) return "gentle";
  return "fractured";
}
