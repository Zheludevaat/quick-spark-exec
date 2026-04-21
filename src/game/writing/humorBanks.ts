import type { PuzzleTheme } from "@/game/puzzles/types";
import { assertHumorPolicy } from "./humorStyle";

const PUZZLE_SOFT_FAIL: Record<PuzzleTheme, string[]> = {
  lunar_reflection: [
    "The basin remains dark. It has standards.",
    "Nothing answers. The moon is not being difficult. It is being exact.",
    "The chamber declines to agree with you just yet.",
  ],
  mercurial_naming: [
    "The name was wrong. The seal, which had hoped for better, dims.",
    "You named it badly. The room becomes more precise out of spite.",
    "Close, in the same way a ladder is close to a philosophy.",
  ],
  venusian_harmony: [
    "The tones refuse each other politely.",
    "Concord does not occur merely because it would be convenient.",
    "The chamber continues being more emotionally literate than most people.",
  ],
  solar_truth: [
    "You moved too soon. Truth is exacting in small ways first.",
    "The light passes through without argument.",
    "Almost. Which is one of the least useful distances in this kind of room.",
  ],
  martial_trial: [
    "The opening was false. So, unfortunately, was the confidence.",
    "Force was applied. Wisdom remained unconvinced.",
    "The chamber does not reward enthusiasm on its own.",
  ],
  jovial_measure: [
    "The measure is wrong. Equality and justice continue being different hobbies.",
    "The scales disagree with your arrangement and are annoyingly correct.",
    "Proportion remains elsewhere.",
  ],
  saturnine_release: [
    "You are still holding something. The room can tell.",
    "Release, rather rudely, continues to require release.",
    "The altar remains unconvinced by partial surrender.",
  ],
};

const PUZZLE_SOLVE_DEFAULT: Record<PuzzleTheme, string[]> = {
  lunar_reflection: [
    "The chamber settles into likeness.",
    "For one quiet moment, reflection and source stop quarreling.",
  ],
  mercurial_naming: [
    "The room accepts the name and stops pretending not to know it.",
    "Precision, for once, has been useful instead of decorative.",
  ],
  venusian_harmony: [
    "The tones meet without swallowing each other.",
    "Sympathy holds. The room becomes briefly more civilized than desire.",
  ],
  solar_truth: [
    "The light passes through without argument.",
    "What remained standing turns out to have been true.",
  ],
  martial_trial: [
    "The passage opens where discipline survived performance.",
    "Force, having finally behaved itself, is allowed through.",
  ],
  jovial_measure: [
    "The scales come level without becoming bland.",
    "Measure holds. The chamber stops correcting you.",
  ],
  saturnine_release: [
    "The unnecessary thing is gone.",
    "The room opens by becoming less.",
  ],
};

const ATTUNE_START_LINES = [
  "ATTUNE. Do not improve the moment. It was not asking.",
  "ATTUNE. Hold still long enough for meaning to stop performing.",
  "ATTUNE. The room is already saying something. Your job is mostly not to interrupt.",
];

const ATTUNE_BREAK_LINES = [
  "Attunement breaks the moment reaching begins.",
  "You hurried. Desire always claims it was helping.",
  "Broken. Wanting arrived and sat on the instrument.",
];

function pickCycled<T>(bank: readonly T[], index = 0): T {
  const safe = ((index % bank.length) + bank.length) % bank.length;
  return bank[safe];
}

assertHumorPolicy(
  [
    ...Object.values(PUZZLE_SOFT_FAIL).flat(),
    ...Object.values(PUZZLE_SOLVE_DEFAULT).flat(),
    ...ATTUNE_START_LINES,
    ...ATTUNE_BREAK_LINES,
  ],
  { fatal: false, label: "humorBanks" },
);

export function pickPuzzleSoftFail(theme: PuzzleTheme, index = 0): string {
  return pickCycled(PUZZLE_SOFT_FAIL[theme], index);
}

export function defaultPuzzleSolveLines(theme: PuzzleTheme): string[] {
  return PUZZLE_SOLVE_DEFAULT[theme];
}

export function pickAttuneStartLine(index = 0): string {
  return pickCycled(ATTUNE_START_LINES, index);
}

export function pickAttuneBreakLine(index = 0): string {
  return pickCycled(ATTUNE_BREAK_LINES, index);
}
