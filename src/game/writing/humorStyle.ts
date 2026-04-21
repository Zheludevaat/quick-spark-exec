export type HumorEngine =
  | "metaphysical_literalism"
  | "exact_disproportion"
  | "sincere_undercut"
  | "category_collision"
  | "anti_self_importance";

export type SphereHumorProfile = {
  id:
    | "lastday"
    | "silver"
    | "imaginal"
    | "moon"
    | "mercury"
    | "venus"
    | "sun"
    | "mars"
    | "jupiter"
    | "saturn";
  engines: HumorEngine[];
  note: string;
};

export const HUMOR_BANNED_PATTERNS = [
  "paperwork",
  "permit",
  "permits",
  "queue",
  "queues",
  "committee",
  "committees",
  "office",
  "offices",
  "clerk",
  "clerks",
  "hr",
  "form",
  "forms",
  "administration",
  "bureaucracy",
  "bureaucratic",
] as const;

export const HUMOR_GLOBAL_RULES = {
  target:
    "Cosmic seriousness punctured by exact, lucid, emotionally intelligent absurd observation.",
  density:
    "Aim for roughly one humor-bearing line every four to six lines. Lower in grief-heavy scenes, higher in ambient and optional text.",
  doUse: [
    "abstractions treated concretely",
    "solemn setup with precise undercut",
    "beauty or truth behaving inconveniently",
    "rooms and concepts noticing the player accurately",
    "anti-pomp more than anti-holiness",
  ],
  avoid: [
    "bureaucratic humor",
    "modern meme diction",
    "snark for its own sake",
    "random zaniness",
    "mocking grief or reverence",
  ],
};

export const SPHERE_HUMOR_PROFILES: SphereHumorProfile[] = [
  {
    id: "lastday",
    engines: ["metaphysical_literalism", "sincere_undercut"],
    note: "Domestic metaphysics. Ordinary objects are already spiritually unreasonable.",
  },
  {
    id: "silver",
    engines: ["exact_disproportion", "anti_self_importance"],
    note: "Threshold solemnity punctured gently, never mocked flatly.",
  },
  {
    id: "imaginal",
    engines: ["category_collision", "exact_disproportion"],
    note: "Dream logic rendered with inappropriate precision.",
  },
  {
    id: "moon",
    engines: ["metaphysical_literalism", "sincere_undercut"],
    note: "Purification meeting embarrassment, shame, and human habit.",
  },
  {
    id: "mercury",
    engines: ["exact_disproportion", "anti_self_importance", "category_collision"],
    note: "Precision, overdefinition, elegant self-defeat, arguments too refined to touch life.",
  },
  {
    id: "venus",
    engines: ["sincere_undercut", "anti_self_importance", "exact_disproportion"],
    note: "Beauty, vanity, longing, curation, admiration, self-display.",
  },
  {
    id: "sun",
    engines: ["exact_disproportion", "sincere_undercut"],
    note: "Truth rendered clean, direct, and personally inconvenient.",
  },
  {
    id: "mars",
    engines: ["anti_self_importance", "sincere_undercut"],
    note: "Dry, severe, anti-theatrical humor.",
  },
  {
    id: "jupiter",
    engines: ["exact_disproportion", "category_collision"],
    note: "Measure and proportion revealing emotional nonsense.",
  },
  {
    id: "saturn",
    engines: ["sincere_undercut", "anti_self_importance"],
    note: "Subtraction, silence, finality, one-word undercuts.",
  },
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BUREAUCRATIC_REGEXES = HUMOR_BANNED_PATTERNS.map(
  (pattern) => new RegExp(`\\b${escapeRegExp(pattern)}\\b`, "i"),
);

export function containsBureaucraticHumor(line: string): boolean {
  return BUREAUCRATIC_REGEXES.some((rx) => rx.test(line));
}

export function findBureaucraticHumorMatches(line: string): string[] {
  return HUMOR_BANNED_PATTERNS.filter((_pattern, i) =>
    BUREAUCRATIC_REGEXES[i].test(line),
  );
}

export function assertHumorPolicy(
  lines: string[],
  options?: {
    fatal?: boolean;
    label?: string;
  },
): void {
  const fatal = options?.fatal ?? false;
  const label = options?.label ?? "humor";

  const violations = lines
    .map((line) => ({
      line,
      matches: findBureaucraticHumorMatches(line),
    }))
    .filter((v) => v.matches.length > 0);

  if (violations.length === 0) return;

  const message =
    `[${label}] Humor policy violation(s):\n` +
    violations
      .map((v) => `- ${v.matches.join(", ")} -> ${v.line}`)
      .join("\n");

  if (fatal) {
    throw new Error(message);
  }

  if (typeof console !== "undefined" && console.warn) {
    console.warn(message);
  }
}
