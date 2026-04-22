/**
 * Act 2 — Athanor perimeter micro-scenes.
 *
 * Each completed operation leaves a small physical trace at the edge of
 * the chamber: a soot mark by the south wall (after Nigredo), a rinse
 * basin lit pale by the east wall (after Albedo), a yellow filament
 * threading the chains (after Citrinitas), a red seam in the floor tile
 * (after Rubedo).
 *
 * The traces are inspectable via the same `ActInteraction` plumbing the
 * vessel-orbit nodes use — gated on `op_*_done`, one-shot per save, and
 * narrated through the host scene's `speak()` shim. They make the
 * threshold feel like the same room across visits, the way the vessel
 * nodes do, but for the *room itself* rather than the apparatus.
 */
import type { ActInteraction } from "../../exploration/ActInteraction";
import type { AthanorHostScene } from "./AthanorExpandedContent";

// Coordinates picked to sit near the chamber's edges without overlapping
// doors (top), vessel (centre), or the Reflection portal (lower-left).
export const ATHANOR_PERIMETER_INSPECTABLES: ActInteraction<AthanorHostScene>[] = [
  {
    id: "perimeter_soot",
    zoneId: "perimeter",
    x: 60,
    y: 124,
    radius: 9,
    kind: "memory",
    prompt: "A: SOOT MARK",
    repeatPrompt: "A: REREAD SOOT",
    onceFlag: "athanor_perimeter_soot_seen",
    requiredFlags: ["op_nigredo_done"],
    onInteract: ({ scene, save }) => {
      save.flags.athanor_perimeter_soot_seen = true;
      scene.persist();
      scene.speak([
        { who: "FLOOR", text: "A black mark the size of your hand. The room kept it." },
        { who: "?", text: "What burned here did not leave the chamber. Only its disguise did." },
      ]);
    },
  },
  {
    id: "perimeter_basin",
    zoneId: "perimeter",
    x: 140,
    y: 78,
    radius: 9,
    kind: "memory",
    prompt: "A: RINSE BASIN",
    repeatPrompt: "A: REREAD BASIN",
    onceFlag: "athanor_perimeter_basin_seen",
    requiredFlags: ["op_albedo_done"],
    onInteract: ({ scene, save }) => {
      save.flags.athanor_perimeter_basin_seen = true;
      scene.persist();
      scene.speak([
        { who: "BASIN", text: "Pale water. Still. It does not pretend the dirt was never there." },
        { who: "?", text: "Cleanliness, here, means honest. Not blameless." },
      ]);
    },
  },
  {
    id: "perimeter_filament",
    zoneId: "perimeter",
    x: 36,
    y: 38,
    radius: 9,
    kind: "memory",
    prompt: "A: YELLOW FILAMENT",
    repeatPrompt: "A: REREAD FILAMENT",
    onceFlag: "athanor_perimeter_filament_seen",
    requiredFlags: ["op_citrinitas_done"],
    onInteract: ({ scene, save }) => {
      save.flags.athanor_perimeter_filament_seen = true;
      scene.persist();
      scene.speak([
        { who: "CHAIN", text: "A thread of citrine has wound itself through the chains." },
        { who: "?", text: "Meaning, when it arrives, attaches to whatever was holding the room up." },
      ]);
    },
  },
  {
    id: "perimeter_seam",
    zoneId: "perimeter",
    x: 124,
    y: 38,
    radius: 9,
    kind: "memory",
    prompt: "A: RED SEAM",
    repeatPrompt: "A: REREAD SEAM",
    onceFlag: "athanor_perimeter_seam_seen",
    requiredFlags: ["op_rubedo_done"],
    onInteract: ({ scene, save }) => {
      save.flags.athanor_perimeter_seam_seen = true;
      scene.persist();
      scene.speak([
        { who: "FLOOR", text: "A line of red runs from the vessel to the south door." },
        { who: "?", text: "Not blood. Not paint. The path the work takes when it leaves the room." },
      ]);
    },
  },
];
