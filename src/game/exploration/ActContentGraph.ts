/**
 * ActContentGraph — bundle of zones, interactions, and encounters for one act.
 *
 * Content packs export a graph; adopting scenes pull the slices they need
 * (`interactionsForZone`, `encountersForZone`) instead of importing
 * individual records. Keeps act-specific data files free of Phaser imports
 * and makes it cheap to add a new authored beat — author the entry,
 * append it to the graph, and the scene picks it up.
 */
import type { ActZone } from "./ActZone";
import type { ActInteraction } from "./ActInteraction";
import type { ActEncounter } from "./ActEncounter";

export type ActContentGraph<TScene = unknown> = {
  id: string;
  zones: ActZone[];
  interactions: ActInteraction<TScene>[];
  encounters: ActEncounter<TScene>[];
};

export function interactionsForZone<TScene>(
  graph: ActContentGraph<TScene>,
  zoneId: string,
) {
  return graph.interactions.filter((i) => i.zoneId === zoneId);
}

export function encountersForZone<TScene>(
  graph: ActContentGraph<TScene>,
  zoneId: string,
) {
  return graph.encounters.filter((e) => e.zoneId === zoneId);
}

export function findZone<TScene>(
  graph: ActContentGraph<TScene>,
  zoneId: string,
) {
  return graph.zones.find((z) => z.id === zoneId);
}
