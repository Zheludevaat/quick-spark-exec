/**
 * Shades — the named ghosts summoned in Nigredo.
 *
 * A shade is a memory-figure that challenges Rowan with the worst version of
 * a shard. Each has a unique 4-option inquiry. The "right" answer (sit_with)
 * earns a black stone. "fled" loses 1 clarity. "destroyed" (over-confess to
 * the Inquisitor specifically, or cruelty) wastes the shard and registers
 * the salvage_a_shard quest.
 */
import type { ShardId, SaveSlot } from "../types";
import { hasChoice } from "../scenes/imaginal/soulRunner";

export type ShadeOutcome = "sat_with" | "fled" | "destroyed";

export type ShadeOption = {
  label: string;
  reply: string;
  outcome: ShadeOutcome;
};

export type Shade = {
  id: string;
  name: string;
  /** Opening one-liners spoken when this shade rises. ≤4 lines. */
  opening: { who: string; text: string }[];
  /** Inquiry prompt + 4 options. */
  prompt: { who: string; text: string };
  options: (save: SaveSlot) => ShadeOption[];
  /** Optional reaction line shown after sat_with — extra reactivity. */
  benediction?: (save: SaveSlot) => string | null;
};

export const SHADES: Record<string, Shade> = {
  // ===== THE MOTHER WHO DID HER BEST =====
  mother_who_did_her_best: {
    id: "mother_who_did_her_best",
    name: "MOTHER-WHO-DID-HER-BEST",
    opening: [
      { who: "MOTHER", text: "Look at the apron. Folded like I taught you." },
      { who: "MOTHER", text: "I did the best I could. With what I had." },
      { who: "MOTHER", text: "Say it. The way you say it when I'm not in the room." },
    ],
    prompt: { who: "MOTHER", text: "What did you tell them about me?" },
    options: () => [
      {
        label: "SHE DID HER BEST. AND IT WASN'T ENOUGH.",
        reply: "...the apron creases. Both things stay.",
        outcome: "sat_with",
      },
      {
        label: "NOTHING. SHE WAS PERFECT.",
        reply: "She nods, satisfied. The shame thickens.",
        outcome: "fled",
      },
      {
        label: "EVERYTHING. EVERY SMALL CRUELTY.",
        reply: "Too much. The figure flickers, looks small.",
        outcome: "fled",
      },
      {
        label: "(LET HER GO BEFORE ANSWERING.)",
        reply: "She watches you turn. The kitchen empties.",
        outcome: "fled",
      },
    ],
    benediction: (s) =>
      s.flags.gate_kitchen_read ? "She sets two cups down. Walks out." : null,
  },

  // ===== THE SELF WHO SAID YES =====
  self_who_said_yes: {
    id: "self_who_said_yes",
    name: "SELF-WHO-SAID-YES",
    opening: [
      { who: "ROWAN-THEN", text: "Hi. You don't recognize me — that's fair." },
      { who: "ROWAN-THEN", text: "I said yes to the thing. The big one." },
      { who: "ROWAN-THEN", text: "I want to know if you forgive me." },
    ],
    prompt: { who: "ROWAN-THEN", text: "Do you?" },
    options: () => [
      {
        label: "NO. AND I LOVE YOU ANYWAY.",
        reply: "She exhales. The room steadies.",
        outcome: "sat_with",
      },
      {
        label: "YES. OF COURSE. IT'S FINE.",
        reply: "She doesn't believe you. Neither do you.",
        outcome: "fled",
      },
      {
        label: "YOU SHOULD HAVE KNOWN.",
        reply: "She nods, smaller. The shard cracks badly.",
        outcome: "destroyed",
      },
      {
        label: "(SAY NOTHING. WAIT.)",
        reply: "She waits with you. A long minute. Then leaves.",
        outcome: "fled",
      },
    ],
  },

  // ===== THE INQUISITOR =====
  inquisitor: {
    id: "inquisitor",
    name: "INQUISITOR",
    opening: [
      { who: "INQUISITOR", text: "Sit. We have a list of charges." },
      { who: "INQUISITOR", text: "You are accused of being available for them." },
      { who: "INQUISITOR", text: "How do you plead?" },
    ],
    prompt: { who: "INQUISITOR", text: "Plead." },
    options: (save) => {
      const harsher = hasChoice(save, "walking_saint", "forced");
      return [
        {
          label: harsher
            ? "GUILTY. AND I FORCED THE SAINT TOO."
            : "GUILTY. ALSO BORED OF THE TRIAL.",
          reply: harsher
            ? "He nods. Reads it back without flourish."
            : "He nods. Sets the gavel down.",
          outcome: "sat_with",
        },
        {
          label: "NOT GUILTY.",
          reply: "He sighs. Adds a charge. The list grows.",
          outcome: "fled",
        },
        {
          label: "GUILTY OF EVERYTHING. HANG ME.",
          reply: "The shard burns through. The Inquisitor wins.",
          outcome: "destroyed",
        },
        {
          label: "WHO MADE YOU A JUDGE?",
          reply: "He smiles. 'You did, Rowan. Years ago.'",
          outcome: "fled",
        },
      ];
    },
  },
};

/** Pick the 3 shades to summon for this run. Currently: all 3, in order. */
export function pickShades(_save: SaveSlot, n: number): string[] {
  const ids = Object.keys(SHADES);
  return ids.slice(0, n);
}
