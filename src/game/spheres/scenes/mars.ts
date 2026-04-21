/**
 * Concrete Mars scene classes — thin shells over the shared template
 * scenes. Bind to fixed scene keys and pre-fill `sphere: "mars"`.
 */
import type { SaveSlot } from "../../types";
import { SpherePlateauScene } from "../SpherePlateauScene";
import { SphereTrialScene } from "../SphereTrialScene";

export class MarsPlateauScene extends SpherePlateauScene {
  constructor() {
    super("MarsPlateau");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mars" });
  }
}

export class MarsTrialScene extends SphereTrialScene {
  constructor() {
    super("MarsTrial");
  }
  init(data: { save: SaveSlot }) {
    super.init({ save: data.save, sphere: "mars" });
  }
}
