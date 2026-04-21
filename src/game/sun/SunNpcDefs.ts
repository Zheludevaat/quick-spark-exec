/**
 * Sun Sphere — three witness arcs of the Hall of Testimony.
 *
 * Each witness has:
 *  - intro            : first-meeting dialog
 *  - options          : inquiry choices (one is the truer answer)
 *  - revisit          : line(s) shown on second visit after completion
 *  - softening        : line shown when revisited if at least one *other*
 *                       Sun witness has also been completed
 *  - crossReference   : map of {otherWitnessId -> line} surfaced when that
 *                       other witness has been completed first
 *  - doneFlag         : save flag set on completion
 */

import type { SunZoneId } from "./SunData";

export type SunWitnessOption = {
  id: string;
  label: string;
  reply: string;
  /** Marks the philosophically truer answer (for future scoring). */
  good?: boolean;
  /** Optional weight if a future trial wants to rank choices. */
  weight?: number;
};

export type SunWitness = {
  id: string;
  name: string;
  zone: SunZoneId;
  intro: { who: string; text: string }[];
  options: SunWitnessOption[];
  revisit: { who: string; text: string }[];
  softening: { who: string; text: string };
  crossReference: Record<string, string>;
  doneFlag: string;
};

export const SUN_WITNESSES: SunWitness[] = [
  {
    id: "biographer",
    name: "THE BIOGRAPHER",
    zone: "testimony",
    doneFlag: "sun_biographer_done",
    intro: [
      { who: "BIOGRAPHER", text: "I wrote the version of you that could survive being admired." },
      { who: "BIOGRAPHER", text: "It was elegant. It was coherent. It also had suspiciously good manners." },
      { who: "BIOGRAPHER", text: "Do you want the beautiful account or the durable one?" },
    ],
    options: [
      {
        id: "bio_beautiful",
        label: "The beautiful account.",
        reply: "Naturally. That one can be displayed without alarming the furniture.",
      },
      {
        id: "bio_durable",
        label: "The durable one.",
        reply: "Less flattering. Better bones. It survives daylight.",
        good: true,
      },
      {
        id: "bio_what_did_you_cut",
        label: "What did you cut out?",
        reply: "Need. Pettiness. Contradiction. The small humiliations by which a self becomes plausible.",
        good: true,
      },
    ],
    revisit: [
      { who: "BIOGRAPHER", text: "I have been amending the manuscript in your absence. The footnotes are getting honest." },
      { who: "BIOGRAPHER", text: "It is shorter now. That happens when you stop padding yourself with flattering adjectives." },
    ],
    softening: {
      who: "BIOGRAPHER",
      text: "The others are speaking too. The story is starting to triangulate.",
    },
    crossReference: {
      betrayed_witness:
        "The witness in the archive contradicted me on three points. Two of them, I had to concede.",
      devoted_accomplice:
        "Your accomplice agrees the prose was too kind. They were paying for the editing.",
    },
  },
  {
    id: "betrayed_witness",
    name: "THE BETRAYED WITNESS",
    zone: "archive",
    doneFlag: "sun_betrayed_done",
    intro: [
      { who: "WITNESS", text: "I was there for the version you revised out." },
      { who: "WITNESS", text: "You did not exactly lie. You edited with such confidence that truth became underdressed." },
      { who: "WITNESS", text: "Would you like the polished memory or the one that still limps?" },
    ],
    options: [
      {
        id: "wit_polished",
        label: "The polished memory.",
        reply: "You already have it. It is framed and useless.",
      },
      {
        id: "wit_limping",
        label: "The limping one.",
        reply: "Good. Limping memories at least admit there was weight.",
        good: true,
      },
      {
        id: "wit_who_paid",
        label: "Who paid for the edit?",
        reply: "Mostly the people who had to remain real while you became legible.",
        good: true,
      },
    ],
    revisit: [
      { who: "WITNESS", text: "I am still here. That is the inconvenient part of being witnessed." },
      { who: "WITNESS", text: "You were not as terrible as you fear. You were not as graceful as you sold." },
    ],
    softening: {
      who: "WITNESS",
      text: "Hearing the others has eased something. I do not need to be the only voice anymore.",
    },
    crossReference: {
      biographer:
        "The biographer admitted the cut. They did not pretend it was an oversight. That helps.",
      devoted_accomplice:
        "Even your accomplice has stopped insisting it was for everyone's good. That is something.",
    },
  },
  {
    id: "devoted_accomplice",
    name: "THE DEVOTED ACCOMPLICE",
    zone: "warmth",
    doneFlag: "sun_accomplice_done",
    intro: [
      { who: "ACCOMPLICE", text: "I loved your image and helped maintain it. This turns out to have been affectionate and disastrous." },
      { who: "ACCOMPLICE", text: "You were easiest to adore once everything difficult had been arranged into style." },
      { who: "ACCOMPLICE", text: "Do you want my loyalty, my honesty, or the part that cannot tell them apart?" },
    ],
    options: [
      {
        id: "acc_loyalty",
        label: "Your loyalty.",
        reply: "Tender. Dangerous. It kept you polished long after polish had become cruelty.",
      },
      {
        id: "acc_honesty",
        label: "Your honesty.",
        reply: "You were warm. You were difficult. You were never as coherent as your admirers preferred.",
        good: true,
      },
      {
        id: "acc_difference",
        label: "Can you tell the difference now?",
        reply: "Better. Not perfectly. Love remains interested in forgery.",
        good: true,
      },
    ],
    revisit: [
      { who: "ACCOMPLICE", text: "I am learning to love you without polishing you. It is slower. It is also more accurate." },
      { who: "ACCOMPLICE", text: "I left a letter on the bench. You can read it without composing a face for it." },
    ],
    softening: {
      who: "ACCOMPLICE",
      text: "The hall is gentler now that I am not the only one telling the truth about us.",
    },
    crossReference: {
      biographer:
        "The biographer is being more honest. I no longer have to defend the prose for both of us.",
      betrayed_witness:
        "The witness from the archive is right. I helped pay for your legibility. I am sorry for it.",
    },
  },
];
