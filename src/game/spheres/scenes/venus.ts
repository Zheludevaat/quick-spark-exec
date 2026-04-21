/**
 * Concrete Venus scene classes — thin shells over the shared template
 * scenes. Bind to fixed scene keys and pre-fill `sphere: "venus"`.
 */
import type { SaveSlot } from "../../types";
import { SpherePlateauScene } from "../SpherePlateauScene";
import { SphereTrialScene } from "../SphereTrialScene";

export class VenusPlateauScene extends SpherePlateauScene {
  constructor() {
    super("VenusPlateau");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "venus" });
  }
}

export class VenusTrialScene extends SphereTrialScene {
  constructor() {
    super("VenusTrial");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "venus" });
  }
}
