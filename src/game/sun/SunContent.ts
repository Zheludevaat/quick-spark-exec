/**
 * Sun Sphere — operations + the cracking question + trial-readiness check.
 *
 * Operations are short inquiries that occur in specific sub-zones. The
 * cracking question is the final gate before SunTrial. `sunTrialReady`
 * is a pure read of save flags so callers don't duplicate the rule.
 */

import type { SaveSlot } from "../types";
import { SUN_FLAGS } from "./SunData";

export type SunOperationOption = {
  id: string;
  label: string;
  reply: string;
  /** Marks the philosophically "right" answer (for future scoring). */
  good?: boolean;
};

export type SunOperation = {
  id: string;
  zone: "testimony" | "archive" | "mirrors" | "warmth";
  title: string;
  prompt: { who: string; text: string };
  options: SunOperationOption[];
  doneFlag: string;
};

export const SUN_OPERATIONS: SunOperation[] = [
  {
    id: "stand_in_light",
    zone: "testimony",
    title: "Stand in the Light",
    prompt: {
      who: "?",
      text: "A beam of praise finds you. You may stand in it, pose for it, or remain long enough for the flattering parts to tire.",
    },
    doneFlag: SUN_FLAGS.opLightDone,
    options: [
      {
        id: "light_pose",
        label: "Pose for it.",
        reply: "The light approves immediately. That is one reason not to trust it.",
      },
      {
        id: "light_stay",
        label: "Remain until the light turns exact.",
        reply: "Good. Admiration burns off. What remains has edges.",
        good: true,
      },
      {
        id: "light_step_out",
        label: "Step out before it names me.",
        reply: "Avoidance is also a posture, just less photogenic.",
      },
    ],
  },
  {
    id: "read_margin",
    zone: "archive",
    title: "Read the Margin",
    prompt: {
      who: "?",
      text: "The official text says one thing. The margin says another in smaller, ruder handwriting.",
    },
    doneFlag: SUN_FLAGS.opMarginDone,
    options: [
      {
        id: "margin_main",
        label: "Read the main text.",
        reply: "Complete. Elegant. Very nearly true.",
      },
      {
        id: "margin_both",
        label: "Read both together.",
        reply: "Better. Truth often arrives annotated by embarrassment.",
        good: true,
      },
      {
        id: "margin_ignore",
        label: "Ignore the annotation.",
        reply: "Of course. The small correction is usually where the blood is.",
      },
    ],
  },
  {
    id: "hold_testimonies",
    zone: "mirrors",
    title: "Hold Two Testimonies Together",
    prompt: {
      who: "?",
      text: "Two descriptions conflict. Both are yours. The room is interested in whether you panic.",
    },
    doneFlag: SUN_FLAGS.opTestimonyDone,
    options: [
      {
        id: "testimony_choose_one",
        label: "Choose the kinder one.",
        reply: "Mercy by deletion. Pleasant. Incomplete.",
      },
      {
        id: "testimony_choose_harsh",
        label: "Choose the harsher one.",
        reply: "Severity is not automatically truth. It only dresses like it very convincingly.",
      },
      {
        id: "testimony_hold",
        label: "Hold both without synthesis.",
        reply: "Good. Contradiction is not always error. Sometimes it is just adulthood.",
        good: true,
      },
    ],
  },
  {
    id: "let_image_dim",
    zone: "warmth",
    title: "Let the Image Dim",
    prompt: {
      who: "?",
      text: "A beautiful version of you brightens when admired. You may feed it, question it, or let it lose light.",
    },
    doneFlag: SUN_FLAGS.opDimDone,
    options: [
      {
        id: "dim_feed",
        label: "Feed it.",
        reply: "Immediate radiance. Appalling long-term character.",
      },
      {
        id: "dim_question",
        label: "Question it.",
        reply: "It flickers, offended. Good.",
      },
      {
        id: "dim_let",
        label: "Let it dim.",
        reply: "There. Less beautiful, more durable.",
        good: true,
      },
    ],
  },
];

export function sunCrackingQuestion(_save: SaveSlot) {
  return {
    prompt: {
      who: "HELION",
      text: "What remains true when admiration is removed?",
    },
    options: [
      {
        id: "crack_need",
        label: "The need I kept dressing as composure.",
        reply: "Yes. Need survives the collapse of style quite stubbornly.",
        good: true,
      },
      {
        id: "crack_love",
        label: "The love that was not improved by being seen beautifully.",
        reply: "Yes. Good. Love occasionally survives curation.",
        good: true,
      },
      {
        id: "crack_grief",
        label: "The grief that looked worse under bright light and remained anyway.",
        reply: "Yes. What remains after ugliness is usually worth more than admiration.",
        good: true,
      },
      {
        id: "crack_nothing",
        label: "Nothing. Admiration was the proof.",
        reply: "Then you have mistaken applause for ontology.",
      },
    ],
  };
}

/** True iff every required gate is set. The trial may be entered. */
export function sunTrialReady(save: SaveSlot): boolean {
  return [
    save.flags[SUN_FLAGS.biographerDone],
    save.flags[SUN_FLAGS.betrayedDone],
    save.flags[SUN_FLAGS.accompliceDone],
    save.flags[SUN_FLAGS.opLightDone],
    save.flags[SUN_FLAGS.opMarginDone],
    save.flags[SUN_FLAGS.opTestimonyDone],
    save.flags[SUN_FLAGS.opDimDone],
    save.flags[SUN_FLAGS.crackingQuestionDone],
  ].every(Boolean);
}
