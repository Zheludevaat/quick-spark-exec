/**
 * Legacy compatibility wrapper.
 *
 * Older saves and older portal wiring may still reference the historical
 * "CuratedSelf" scene key. We keep a small subclass that reuses the new
 * SunTrialScene logic while registering under the legacy key.
 *
 * This is the safe migration path:
 * - "SunTrial" is the canonical modern scene
 * - "CuratedSelf" remains a compatibility alias only
 *
 * EpilogueScene now lives in its own file and is re-exported here so any
 * legacy import sites continue to resolve.
 */
import { SunTrialScene } from "./SunTrialScene";

export class CuratedSelfScene extends SunTrialScene {
  constructor() {
    super("CuratedSelf");
  }
}

export { EpilogueScene } from "./EpilogueScene";
