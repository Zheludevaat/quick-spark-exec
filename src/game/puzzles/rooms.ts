/**
 * Canonical hermetic puzzle rooms — one exemplar per sphere.
 *
 * Coordinates are in 160x144 GBC space. Each room expresses one principle.
 */
import type { PuzzleRoomDef } from "./types";

export const PUZZLE_ROOMS: Record<string, PuzzleRoomDef> = {
  moon_reflection_01: {
    id: "moon_reflection_01",
    theme: "lunar_reflection",
    verbs: ["witness"],
    persistent: true,
    title: "REFLECTION CHAMBER",
    intro: [
      { who: "ROWAN", text: "A pale basin. Two mirrors, unaligned." } as unknown as string,
    ].map(() => "A pale basin. Two mirrors are unaligned.").slice(0, 1).concat([
      "WITNESS each mirror, then the basin.",
    ]),
    nodes: [
      { id: "mirror_a", kind: "mirror", x: 40, y: 56, state: false },
      { id: "mirror_b", kind: "mirror", x: 120, y: 56, state: false },
      { id: "basin", kind: "beam", x: 80, y: 38, state: false },
      { id: "gate", kind: "gate", x: 80, y: 110, state: false, label: "MOON GATE" },
    ],
    onSolveFlag: "puzzle_moon_reflection_01_solved",
    solveLines: [
      "The basin holds the moon whole.",
      "The gate unseals. Stillness keeps it open.",
    ],
  },

  mercury_name_01: {
    id: "mercury_name_01",
    theme: "mercurial_naming",
    verbs: ["name"],
    persistent: true,
    title: "HALL OF GLYPHS",
    intro: [
      "Three glyphs: two false, one true.",
      "NAME the true. Wrong names dim the seal.",
    ],
    nodes: [
      // data.true=true marks the correct glyph.
      { id: "glyph_1", kind: "name_glyph", x: 48, y: 50, state: false, data: { true: false } },
      { id: "glyph_2", kind: "name_glyph", x: 80, y: 50, state: false, data: { true: true } },
      { id: "glyph_3", kind: "name_glyph", x: 112, y: 50, state: false, data: { true: false } },
      { id: "seal", kind: "seal", x: 80, y: 96, state: false, label: "TRUE NAME" },
    ],
    onSolveFlag: "puzzle_mercury_name_01_solved",
    solveLines: [
      "The middle glyph kindles. The other two go quiet.",
      "The seal opens to whatever was always behind it.",
    ],
  },

  venus_attunement_01: {
    id: "venus_attunement_01",
    theme: "venusian_harmony",
    verbs: ["attune"],
    persistent: true,
    title: "CONCORD BRIDGE",
    intro: [
      "Two resonators, opposed.",
      "ATTUNE each one. The bridge appears in concord.",
    ],
    nodes: [
      { id: "pair_a", kind: "resonator", x: 44, y: 60, state: false },
      { id: "pair_b", kind: "resonator", x: 116, y: 60, state: false },
      { id: "bridge", kind: "gate", x: 80, y: 102, state: false, label: "BRIDGE" },
    ],
    onSolveFlag: "puzzle_venus_attunement_01_solved",
    solveLines: [
      "Both tones meet without overruling each other.",
      "The bridge stands. Sympathy held.",
    ],
  },

  sun_stand_01: {
    id: "sun_stand_01",
    theme: "solar_truth",
    verbs: ["stand"],
    persistent: true,
    title: "TRUTH CIRCLE",
    intro: [
      "One column of light. One circle that names the truthful.",
      "STAND. Hold. Do not flinch.",
    ],
    nodes: [
      { id: "circle", kind: "witness_circle", x: 80, y: 78, state: false },
      { id: "column", kind: "beam", x: 80, y: 44, state: false },
      { id: "gate", kind: "gate", x: 80, y: 112, state: false, label: "INTELLECT" },
    ],
    onSolveFlag: "puzzle_sun_stand_01_solved",
    solveLines: [
      "The light passes through without bending.",
      "What stood is what was true.",
    ],
  },

  jupiter_weigh_01: {
    id: "jupiter_weigh_01",
    theme: "jovial_measure",
    verbs: ["weigh"],
    persistent: true,
    title: "MEASURE GATE",
    intro: ["Two plates. One law.", "WEIGH rightly, not equally."],
    nodes: [
      { id: "plate_l", kind: "scale", x: 56, y: 78, state: 0 },
      { id: "plate_r", kind: "scale", x: 104, y: 78, state: 0 },
      { id: "gate", kind: "gate", x: 80, y: 112, state: false, label: "MEASURE" },
    ],
    onSolveFlag: "puzzle_jupiter_weigh_01_solved",
  },

  saturn_release_01: {
    id: "saturn_release_01",
    theme: "saturnine_release",
    verbs: ["release"],
    persistent: true,
    title: "RELEASE ALTAR",
    intro: ["The altar takes only what you stop holding."],
    nodes: [
      { id: "altar", kind: "release_altar", x: 80, y: 70, state: false },
      { id: "gate", kind: "gate", x: 80, y: 112, state: false, label: "RELEASE" },
    ],
    onSolveFlag: "puzzle_saturn_release_01_solved",
  },
};

export function getPuzzleRoom(id: string): PuzzleRoomDef | null {
  return PUZZLE_ROOMS[id] ?? null;
}
