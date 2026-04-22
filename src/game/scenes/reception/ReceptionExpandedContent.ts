/**
 * Act 1 — Silver Threshold expansion content.
 *
 * Three optional threshold-life interactions that deepen Reception
 * without altering the four-guardian backbone. They unlock progressively
 * as the player meets more elements:
 *
 *   - LINTEL: always available; reframes the room from "judgment" to
 *     "reception" and is meant as the first optional read.
 *   - BIRD: unlocked after meeting Air — a small post-witness presence
 *     that only alights once breath has been released.
 *   - QUIET COMPLETION: unlocked only after all four guardians have been
 *     met. A hidden fifth gesture that feeds `daimonBond`.
 *
 * Coordinates are picked to sit just outside the four guardian rings so
 * proximity hints don't fight the main encounter prompts.
 */
import type { ActInteraction } from "../../exploration/ActInteraction";
import type { SaveSlot } from "../../types";

export type ReceptionHostScene = {
  save: SaveSlot;
  speak: (lines: { who: string; text: string }[], onDone?: () => void) => void;
};

export const RECEPTION_OPTIONAL_INTERACTIONS: ActInteraction<ReceptionHostScene>[] = [
  {
    id: "threshold_lintel",
    zoneId: "threshold",
    x: 80,
    y: 16,
    radius: 12,
    kind: "inspect",
    prompt: "A: READ LINTEL",
    repeatPrompt: "A: READ AGAIN",
    onceFlag: "threshold_lintel_seen",
    onInteract: ({ scene, save }) => {
      const second = !!save.flags.threshold_lintel_seen;
      save.flags.threshold_lintel_seen = true;
      const lines = second
        ? [{ who: "LINTEL", text: "Not judged. Received. The verb has not changed." }]
        : [
            { who: "LINTEL", text: "Above the threshold, in a hand older than the room:" },
            { who: "LINTEL", text: '"NOT JUDGED. RECEIVED."' },
          ];
      scene.speak(lines);
    },
  },
  {
    id: "threshold_bird",
    zoneId: "threshold",
    x: 132,
    y: 32,
    radius: 11,
    kind: "inspect",
    prompt: "A: WATCH BIRD",
    onceFlag: "threshold_bird_seen",
    hiddenUntilFlags: ["elem_air"],
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      save.flags.threshold_bird_seen = true;
      scene.speak([
        { who: "?", text: "A small bird settles on the high stone." },
        { who: "?", text: "It alights only after something has been released into air." },
      ]);
    },
  },
  {
    id: "quiet_completion",
    zoneId: "threshold",
    x: 80,
    y: 86,
    radius: 10,
    kind: "ritual",
    prompt: "A: BE STILL",
    onceFlag: "threshold_quiet_completion",
    singleUse: true,
    hiddenUntilFlags: ["elem_air", "elem_fire", "elem_water", "elem_earth"],
    aftermathStyle: "tone_shift",
    onInteract: ({ scene, save }) => {
      if (save.flags.threshold_quiet_completion) return;
      save.flags.threshold_quiet_completion = true;
      save.daimonBond = Math.min(10, save.daimonBond + 1);
      scene.speak([
        { who: "?", text: "You stand at the centre and offer no fifth element." },
        { who: "?", text: "The room accepts your stillness as the gesture it was waiting for." },
      ]);
    },
  },
];
