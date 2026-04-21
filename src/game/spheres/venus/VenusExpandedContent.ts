/**
 * Phase 5 — Venus thickening content pack.
 *
 * Adds:
 *   - 3 side guests placed across the Biennale's main rooms. They are
 *     ambient-class (no quest gating) but reactive: their barks shift
 *     after the player has cleared the corresponding main quest in the
 *     same zone. They give the rooms social density without adding to
 *     the main-quest checklist.
 *   - 2 extra ATTUNE micro-targets, placed in already-built zones, that
 *     reward the verb without unlocking new gates. They simply give
 *     ATTUNE more places to be used, which is what Venus's verb wants.
 *   - A "softening" schedule: the room's tone overlay alpha and motes
 *     gradually quiet as the main quests resolve. Computed centrally so
 *     the scene can call one helper per zone load.
 *
 * Save policy: additive boolean flags only, all prefixed `venus_side_`
 * or `venus_attune_extra_`. No schema changes.
 */
import type { VenusZoneId } from "./VenusData";
import type { SaveSlot } from "../../types";
import { VENUS_FLAGS } from "./VenusData";

export type VenusSideGuest = {
  id: string;
  zone: VenusZoneId;
  name: string;
  /** Anchor on the GBC canvas. */
  x: number;
  y: number;
  color: number;
  /** Default barks, played before the zone's main quest resolves. */
  barksBefore: string[];
  /** Barks played once the zone's "soft" condition is met. */
  barksAfter: string[];
  /** Save flag whose truth flips before→after. */
  softFlag: keyof typeof VENUS_FLAGS;
  /** Once-per-save listened flag. */
  listenedFlag: string;
};

export const VENUS_SIDE_GUESTS: VenusSideGuest[] = [
  {
    id: "failed_restorer",
    zone: "gallery",
    name: "FAILED RESTORER",
    x: 50,
    y: 90,
    color: 0xb8a4a4,
    softFlag: "curatorDone",
    listenedFlag: "venus_side_restorer_heard",
    barksBefore: [
      "Everything I have repaired became less true.",
      "I keep a careful inventory of the colours I corrected away.",
    ],
    barksAfter: [
      "Today I left a crack in. It looks more like the painting now.",
      "I stopped restoring her smile. It was the smile that had been wrong about her.",
    ],
  },
  {
    id: "applause_figure",
    zone: "recognition_hall",
    name: "ONE HELD UP BY APPLAUSE",
    x: 130,
    y: 90,
    color: 0xd8b8c8,
    softFlag: "criticDone",
    listenedFlag: "venus_side_applause_heard",
    barksBefore: [
      "When no one claps, I forget my outline.",
      "I have rehearsed even my collapses. They get better reviews than the originals.",
    ],
    barksAfter: [
      "I sat in a room without sound today. I did not entirely vanish.",
      "There is a version of me that exists offstage. We are still being introduced.",
    ],
  },
  {
    id: "anonymous_donor",
    zone: "reconstruction",
    name: "THE ANONYMOUS DONOR",
    x: 38,
    y: 70,
    color: 0xc8c0d8,
    softFlag: "belovedDone",
    listenedFlag: "venus_side_donor_heard",
    barksBefore: [
      "I gave the love unsigned. So that it could not be revoked from me.",
      "Anonymity is the costume vanity wears when it has read better books.",
    ],
    barksAfter: [
      "I signed a small one. The room did not collapse.",
      "Letting myself be thanked was the harder gift.",
    ],
  },
];

/** ATTUNE micro-targets — secondary verb practice with no main-quest gating. */
export type VenusAttuneMicro = {
  id: string;
  zone: VenusZoneId;
  x: number;
  y: number;
  requiredMs: number;
  /** Once-flag stored on save.flags. */
  doneFlag: string;
  label: string;
  doneLabel: string;
  lines: { who: string; text: string }[];
};

export const VENUS_ATTUNE_MICROS: VenusAttuneMicro[] = [
  {
    id: "still_life",
    zone: "gallery",
    x: 60,
    y: 38,
    requiredMs: 1400,
    doneFlag: "venus_attune_extra_still_life",
    label: "ATTUNE: a still life",
    doneLabel: "the still life remains still",
    lines: [
      { who: "?", text: "Three pears, a bowl, an unworried light." },
      { who: "?", text: "Nothing here is asking to be more than it is." },
    ],
  },
  {
    id: "recognition_mirror",
    zone: "recognition_hall",
    x: 40,
    y: 55,
    requiredMs: 1600,
    doneFlag: "venus_attune_extra_recognition_mirror",
    label: "ATTUNE: a quiet mirror",
    doneLabel: "the mirror has stopped insisting",
    lines: [
      { who: "?", text: "It returns your face without commentary." },
      { who: "?", text: "Rare. Counted." },
    ],
  },
];

/**
 * Softening level for a zone — 0 (full performance) to 2 (room calm).
 * Used to tune mote alpha / overlay strength. Pure function of save flags.
 */
export function venusZoneSoftening(save: SaveSlot, zone: VenusZoneId): 0 | 1 | 2 {
  const f = save.flags;
  switch (zone) {
    case "gallery": {
      const a = !!f[VENUS_FLAGS.curatorDone];
      const b = !!f[VENUS_FLAGS.reconstructionSeen];
      if (a && b) return 2;
      if (a) return 1;
      return 0;
    }
    case "recognition_hall": {
      const a = !!f[VENUS_FLAGS.criticDone];
      const b = !!f[VENUS_FLAGS.audienceReleased];
      if (a && b) return 2;
      if (a) return 1;
      return 0;
    }
    case "reconstruction": {
      const a = !!f[VENUS_FLAGS.belovedDone];
      const b = !!f[VENUS_FLAGS.reconstructionSeen];
      if (a && b) return 2;
      if (a) return 1;
      return 0;
    }
    case "ladder": {
      return f[VENUS_FLAGS.ladderDone] ? 2 : 0;
    }
    case "atrium": {
      const done = [
        VENUS_FLAGS.curatorDone,
        VENUS_FLAGS.criticDone,
        VENUS_FLAGS.belovedDone,
        VENUS_FLAGS.audienceReleased,
        VENUS_FLAGS.ladderDone,
      ].filter((k) => !!f[k]).length;
      if (done >= 4) return 2;
      if (done >= 2) return 1;
      return 0;
    }
    case "threshold": {
      return f[VENUS_FLAGS.audienceReleased] ? 2 : f[VENUS_FLAGS.trialThresholdSeen] ? 1 : 0;
    }
  }
}

export function sideGuestsForZone(zone: VenusZoneId): VenusSideGuest[] {
  return VENUS_SIDE_GUESTS.filter((g) => g.zone === zone);
}

export function attuneMicrosForZone(zone: VenusZoneId): VenusAttuneMicro[] {
  return VENUS_ATTUNE_MICROS.filter((m) => m.zone === zone);
}
