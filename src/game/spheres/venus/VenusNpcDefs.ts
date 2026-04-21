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
  etiquetteClerk: {
    id: "etiquette_clerk",
    name: "CLERK OF LIGHTING ETIQUETTE",
    zone: "atrium" as VenusZoneId,
    ambient: [
      "The angle of sincerity must not exceed the angle of admiration.",
      "Please queue in the correct emotional register.",
      "We do not rank wounds by brightness before noon.",
    ],
  } satisfies VenusAmbientNpc,

  anniversaryKeeper: {
    id: "anniversary_keeper",
    name: "THE ANNIVERSARY KEEPER",
    zone: "ladder" as VenusZoneId,
    ambient: [
      "We preserve the moment by repeating it until it dies.",
      "Every vow is safer when the beloved can no longer surprise you.",
      "I file each love by aesthetic school. Yours is unfiled.",
    ],
  } satisfies VenusAmbientNpc,
};
