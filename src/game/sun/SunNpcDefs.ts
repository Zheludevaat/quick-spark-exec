/**
 * Sun Sphere — three witness arcs of the Hall of Testimony.
 *
 * Each witness sits in a specific sub-zone. Their `intro` is a short dialog,
 * then the player picks one of `options`; reply is shown; doneFlag is set.
 */

import type { SunZoneId } from "./SunData";

export type SunWitnessOption = {
  id: string;
  label: string;
  reply: string;
  /** Optional weight if a future trial wants to rank choices. */
  weight?: number;
};

export type SunWitness = {
  id: string;
  name: string;
  zone: SunZoneId;
  intro: { who: string; text: string }[];
  options: SunWitnessOption[];
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
      },
      {
        id: "bio_what_did_you_cut",
        label: "What did you cut out?",
        reply: "Need. Pettiness. Contradiction. The small humiliations by which a self becomes plausible.",
      },
    ],
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
      },
      {
        id: "wit_who_paid",
        label: "Who paid for the edit?",
        reply: "Mostly the people who had to remain real while you became legible.",
      },
    ],
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
      },
      {
        id: "acc_difference",
        label: "Can you tell the difference now?",
        reply: "Better. Not perfectly. Love remains interested in forgery.",
      },
    ],
  },
];
