/**
 * Compatibility shim — the legacy CuratedSelf monolith has been split into
 * SunPlateauScene (Act 6 plateau) and SunTrialScene (Helion's trial).
 *
 * `CuratedSelf` is kept as a SceneKey alias so any persisted saves with
 * `scene === "CuratedSelf"` still resolve. The class re-exported below is
 * the new SunTrialScene under the legacy "CuratedSelf" Phaser key.
 *
 * EpilogueScene now lives in its own file.
 */

import { SunTrialScene } from "./SunTrialScene";

/** Legacy Phaser scene key wrapper — returns the new Sun trial. */
export class CuratedSelfScene extends SunTrialScene {
  constructor() {
    super();
    // Override the Phaser scene key so registration as "CuratedSelf" still
    // works. Phaser reads the key from the scene config object, so we set it
    // explicitly here.
    (this as unknown as { sys: { settings: { key: string } } }).sys = (this as unknown as {
      sys: { settings: { key: string } };
    }).sys ?? { settings: { key: "CuratedSelf" } };
  }
}

// Phaser reads the key from super(...) in the constructor. Since SunTrialScene
// passes "SunTrial", we need a clean Scene subclass that registers as
// "CuratedSelf" but delegates create/update to SunTrialScene logic.
export { EpilogueScene } from "./EpilogueScene";
