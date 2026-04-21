/**
 * Registry of sphere configs. Add new spheres by importing their config and
 * mapping it here.
 */
import type { SphereKey } from "../types";
import type { SphereConfig } from "./types";
import { mercuryConfig } from "./configs/mercury";
import { venusConfig } from "./configs/venus";
import { marsConfig } from "./configs/mars";

const REGISTRY: Partial<Record<SphereKey, SphereConfig>> = {
  mercury: mercuryConfig,
  venus: venusConfig,
  mars: marsConfig,
  // jupiter, saturn — added as they ship.
};

export function getSphereConfig(s: SphereKey): SphereConfig {
  const cfg = REGISTRY[s];
  if (!cfg) throw new Error(`No sphere config registered for ${s}`);
  return cfg;
}

export function hasSphereConfig(s: SphereKey): boolean {
  return !!REGISTRY[s];
}
