/**
 * Concrete Mercury scene classes — thin shells over the shared template
 * scenes that bind to fixed scene keys ("MercuryPlateau" / "MercuryTrial")
 * and pre-fill `sphere: "mercury"` so Phaser's scene manager can register
 * them and MetaxyHub can launch them by key.
 */
import type { SaveSlot } from "../../types";
import { SpherePlateauScene } from "../SpherePlateauScene";
import { SphereTrialScene } from "../SphereTrialScene";

export class MercuryPlateauScene extends SpherePlateauScene {
  constructor() {
    super();
    // Override the parent constructor's scene key.
    Phaser.Scene.call(this as unknown as Phaser.Scene, "MercuryPlateau");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mercury" });
  }
}

export class MercuryTrialScene extends SphereTrialScene {
  constructor() {
    super();
    Phaser.Scene.call(this as unknown as Phaser.Scene, "MercuryTrial");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mercury" });
  }
}

import * as Phaser from "phaser";
