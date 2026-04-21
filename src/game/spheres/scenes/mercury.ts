/**
 * Concrete Mercury scene classes — thin shells over the shared template
 * scenes. Bind to fixed scene keys and pre-fill `sphere: "mercury"`.
 */
import type { SaveSlot } from "../../types";
import { SpherePlateauScene } from "../SpherePlateauScene";
import { SphereTrialScene } from "../SphereTrialScene";

export class MercuryPlateauScene extends SpherePlateauScene {
  constructor() {
    super("MercuryPlateau");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mercury" });
  }
}

export class MercuryTrialScene extends SphereTrialScene {
  constructor() {
    super("MercuryTrial");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mercury" });
  }
}
