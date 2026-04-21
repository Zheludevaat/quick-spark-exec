/**
 * Act 3 — Athanor Threshold expansion content.
 *
 * Adds two layers of "the room remembers":
 *
 *   1. ATHANOR_VESSEL_LINES — stage-specific descriptions the vessel uses
 *      when inspected. Indexed by `thresholdStage` (0..4).
 *   2. ATHANOR_NODE_INSPECTABLES — one inspect per memory node, each
 *      gated by its operation's `op_*_done` flag and tied to the matching
 *      coordinate pre-baked into the scene's NODE_COLORS layout.
 *
 * The four node positions mirror the Athanor scene's existing orbit
 * layout (top, right, bottom, left at radius ~17 from the vessel).
 */
import type { ActInteraction } from "../../exploration/ActInteraction";
import type { SaveSlot } from "../../types";

export type AthanorHostScene = {
  save: SaveSlot;
  speak: (lines: { who: string; text: string }[], onDone?: () => void) => void;
};

export const ATHANOR_VESSEL_LINES: Record<0 | 1 | 2 | 3 | 4, { who: string; text: string }[]> = {
  0: [{ who: "VESSEL", text: "Empty. Not hungry. Ready." }],
  1: [
    { who: "VESSEL", text: "The black has been taken in." },
    { who: "VESSEL", text: "It does not erase. It exposes." },
  ],
  2: [
    { who: "VESSEL", text: "Something has been washed without being undone." },
    { who: "VESSEL", text: "What is clear is not necessarily innocent. Only clearer." },
  ],
  3: [
    { who: "VESSEL", text: "Meaning stains the glass gold." },
    { who: "VESSEL", text: "It gathered slowly. It is not a light switch." },
  ],
  4: [
    { who: "VESSEL", text: "The red has arrived. The red remains." },
    { who: "VESSEL", text: "Not triumph. Integration." },
  ],
};

// Vessel center matches AthanorThresholdScene: (GBC_W/2, GBC_H/2 + 8)
// = (80, 80) at GBC_W=160, GBC_H=144. Nodes orbit at radius 17:
// top (80, 63), right (97, 80), bottom (80, 97), left (63, 80).
export const ATHANOR_NODE_INSPECTABLES: ActInteraction<AthanorHostScene>[] = [
  {
    id: "node_nigredo_memory",
    zoneId: "vessel_orbit",
    x: 80,
    y: 63,
    radius: 8,
    kind: "memory",
    prompt: "A: REMEMBER NIGREDO",
    repeatPrompt: "A: REMEMBER AGAIN",
    onceFlag: "athanor_node_nigredo_seen",
    requiredFlags: ["op_nigredo_done"],
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      save.flags.athanor_node_nigredo_seen = true;
      scene.speak([
        { who: "NODE", text: "The black does not erase. It exposes." },
        { who: "NODE", text: "What you sat with is still here, made smaller by being named." },
      ]);
    },
  },
  {
    id: "node_albedo_memory",
    zoneId: "vessel_orbit",
    x: 97,
    y: 80,
    radius: 8,
    kind: "memory",
    prompt: "A: REMEMBER ALBEDO",
    repeatPrompt: "A: REMEMBER AGAIN",
    onceFlag: "athanor_node_albedo_seen",
    requiredFlags: ["op_albedo_done"],
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      save.flags.athanor_node_albedo_seen = true;
      scene.speak([
        { who: "NODE", text: "What is washed is not necessarily innocent. Only clearer." },
        { who: "NODE", text: "Clarity is not absolution. It is the room with the lights on." },
      ]);
    },
  },
  {
    id: "node_citrinitas_memory",
    zoneId: "vessel_orbit",
    x: 80,
    y: 97,
    radius: 8,
    kind: "memory",
    prompt: "A: REMEMBER CITRINITAS",
    repeatPrompt: "A: REMEMBER AGAIN",
    onceFlag: "athanor_node_citrinitas_seen",
    requiredFlags: ["op_citrinitas_done"],
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      save.flags.athanor_node_citrinitas_seen = true;
      scene.speak([
        { who: "NODE", text: "Meaning gathers slowly. It is not a light switch." },
        { who: "NODE", text: "What you understood here was already true. You only stopped refusing it." },
      ]);
    },
  },
  {
    id: "node_rubedo_memory",
    zoneId: "vessel_orbit",
    x: 63,
    y: 80,
    radius: 8,
    kind: "memory",
    prompt: "A: REMEMBER RUBEDO",
    repeatPrompt: "A: REMEMBER AGAIN",
    onceFlag: "athanor_node_rubedo_seen",
    requiredFlags: ["op_rubedo_done"],
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      save.flags.athanor_node_rubedo_seen = true;
      scene.speak([
        { who: "NODE", text: "The red seal is not triumph. It is integration." },
        { who: "NODE", text: "What was put in has become what carries you. Quietly. Without applause." },
      ]);
    },
  },
];

export const ATHANOR_VESSEL_INSPECT_FLAG = "athanor_vessel_inspected";
