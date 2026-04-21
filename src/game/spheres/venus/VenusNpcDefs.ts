/**
 * Venus NPC definitions — anchors the placed inhabitants of the Biennale.
 * Main quest NPCs reuse the venusConfig "souls" writing as their core
 * inquiry; ambient NPCs add social texture without progression weight.
 */
import { venusConfig } from "../configs/venus";
import type { VenusZoneId } from "./VenusData";
import type { SphereOption } from "../types";

export type VenusMainNpc = {
  id: string;
  name: string;
  zone: VenusZoneId;
  intro: { who: string; text: string };
  options: SphereOption[];
};

export type VenusAmbientNpc = {
  id: string;
  name: string;
  zone: VenusZoneId;
  ambient: string[];
};

export const VENUS_NPCS = {
  curator: {
    id: "curator",
    name: "THE CURATOR",
    zone: "gallery" as VenusZoneId,
    intro: venusConfig.souls[0].prompt,
    options: [...venusConfig.souls[0].options],
  } satisfies VenusMainNpc,

  critic: {
    id: "critic",
    name: "THE CRITIC",
    zone: "recognition_hall" as VenusZoneId,
    intro: venusConfig.souls[1].prompt,
    options: [...venusConfig.souls[1].options],
  } satisfies VenusMainNpc,

  beloved: {
    id: "beloved",
    name: "THE BELOVED",
    zone: "reconstruction" as VenusZoneId,
    intro: venusConfig.souls[2].prompt,
    options: [...venusConfig.souls[2].options],
  } satisfies VenusMainNpc,
};

export const VENUS_AMBIENT_NPCS = {
  lightingWitness: {
    id: "lighting_witness",
    name: "ONE WHO STOOD TOO LONG IN GOOD LIGHT",
    zone: "atrium" as VenusZoneId,
    ambient: [
      "Admiration becomes inaccurate very quickly under copper light.",
      "Sincerity and display are neighbours here. They do not get on.",
      "The room flatters first and explains later. It is an old vice.",
    ],
  } satisfies VenusAmbientNpc,

  repeaterOfVows: {
    id: "repeater_of_vows",
    name: "THE REPEATER OF VOWS",
    zone: "ladder" as VenusZoneId,
    ambient: [
      "We repeated the promise until it sounded true, and then fatally until it sounded beautiful.",
      "Some loves survive surprise. Others frame it and call that devotion.",
      "I used to think permanence was the same thing as fidelity. The room has been laughing quietly for years.",
    ],
  } satisfies VenusAmbientNpc,
};
