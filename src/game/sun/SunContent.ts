/**
 * Sun Sphere — operations + the cracking question + trial-readiness check.
 *
 * Operations now declare a `mechanic` field so SunPlateauScene can route
 * each one to a real interaction (hold-to-light, margin compare, etc.)
 * instead of a single inquiry. The `prompt` and `options` remain so the
 * mechanic can still show framing dialogue and a closing reply.
 *
 * `aftermath` lines fire once on completion to make the room feel changed.
 */

import type { SaveSlot } from "../types";
import { SUN_FLAGS } from "./SunData";

export type SunOperationOption = {
  id: string;
  label: string;
  reply: string;
  good?: boolean;
};

export type SunOperationMechanic =
  | "hold_in_light"
  | "margin_compare"
  | "hold_contradiction"
  | "let_image_dim";

export type SunOperation = {
  id: string;
  zone: "testimony" | "archive" | "mirrors" | "warmth";
  title: string;
  mechanic: SunOperationMechanic;
  /** Steps for staged mechanics. Each is a quick prompt the player must hold or read through. */
  steps?: string[];
  prompt: { who: string; text: string };
  options: SunOperationOption[];
  doneFlag: string;
  aftermath: string;
};

export const SUN_OPERATIONS: SunOperation[] = [
  {
    id: "stand_in_light",
    zone: "testimony",
    title: "Stand in the Light",
    mechanic: "hold_in_light",
    steps: [
      "The light flatters. Hold position.",
      "The light begins to inspect. Hold position.",
      "The light becomes exact. Hold position.",
    ],
    prompt: {
      who: "?",
      text: "A beam of praise finds you. Stand in it long enough for admiration to burn off. Press A to hold; release any direction to step out.",
    },
    doneFlag: SUN_FLAGS.opLightDone,
    options: [
      {
        id: "light_pose",
        label: "Step out — the praise was enough.",
        reply: "The light approves of your exit. That is one reason not to trust it.",
      },
      {
        id: "light_stay",
        label: "Hold until the light turns exact.",
        reply: "Good. Admiration burns off. What remains has edges.",
        good: true,
      },
    ],
    aftermath:
      "The witness stand keeps a faint golden underline where you stood. The light no longer flatters that spot.",
  },
  {
    id: "read_margin",
    zone: "archive",
    title: "Read the Margin",
    mechanic: "margin_compare",
    steps: [
      "MAIN: 'It was a clean parting. No one was harmed.'",
      "MARGIN: 'I cried for a week. I think you knew.'",
      "MAIN: 'I acted decisively under pressure.'",
      "MARGIN: 'You panicked. The decisiveness came later, in the retelling.'",
    ],
    prompt: {
      who: "?",
      text: "The official text says one thing. The margin says another in smaller, ruder handwriting. Read both.",
    },
    doneFlag: SUN_FLAGS.opMarginDone,
    options: [
      {
        id: "margin_main",
        label: "Trust the main text.",
        reply: "Complete. Elegant. Very nearly true.",
      },
      {
        id: "margin_both",
        label: "Hold both as the record.",
        reply: "Better. Truth often arrives annotated by embarrassment.",
        good: true,
      },
      {
        id: "margin_ignore",
        label: "Strike the annotation.",
        reply: "Of course. The small correction is usually where the blood is.",
      },
    ],
    aftermath:
      "A new line appears in the margin in your own hand: 'Both, then.' The page accepts it without argument.",
  },
  {
    id: "hold_testimonies",
    zone: "mirrors",
    title: "Hold Two Testimonies Together",
    mechanic: "hold_contradiction",
    steps: [
      "MIRROR LEFT:  'You were generous to a fault.'",
      "MIRROR RIGHT: 'You were generous when it cost nothing.'",
      "Both reflections are yours. Choose how to carry them.",
    ],
    prompt: {
      who: "?",
      text: "Two descriptions conflict. Both are yours. The room is interested in whether you panic.",
    },
    doneFlag: SUN_FLAGS.opTestimonyDone,
    options: [
      {
        id: "testimony_choose_one",
        label: "Reconcile — pick the kinder one.",
        reply: "Mercy by deletion. Pleasant. Incomplete.",
      },
      {
        id: "testimony_choose_harsh",
        label: "Reconcile — pick the harsher one.",
        reply: "Severity is not automatically truth. It only dresses like it very convincingly.",
      },
      {
        id: "testimony_hold",
        label: "Refuse synthesis — hold both.",
        reply: "Good. Contradiction is not always error. Sometimes it is just adulthood.",
        good: true,
      },
    ],
    aftermath:
      "The mirrors steady. Their reflections stop competing for the better version of you.",
  },
  {
    id: "let_image_dim",
    zone: "warmth",
    title: "Let the Image Dim",
    mechanic: "let_image_dim",
    steps: [
      "The image brightens when admired. (Press A to feed it.)",
      "The image flickers when questioned. (Press DOWN to question.)",
      "The image fades when ignored. (Wait.)",
    ],
    prompt: {
      who: "?",
      text: "A beautiful version of you brightens when admired. You may feed it, question it, or simply let it lose light.",
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
    aftermath:
      "The hearth quiets. A folded letter appears on the bench, addressed to the version of you that did not require lighting.",
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
