import * as Phaser from "phaser";
import type { SaveSlot } from "../types";
import { ACT_BY_SCENE } from "../types";
import { writeSave } from "../save";
import { setSceneSnapshot } from "../gameUiBridge";

export class EndingsRouterScene extends Phaser.Scene {
  private save!: SaveSlot;

  constructor() {
    super("EndingsRouter");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "EndingsRouter";
    this.save.act = ACT_BY_SCENE.EndingsRouter;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    setSceneSnapshot({
      key: "EndingsRouter",
      label: "Beyond the Spheres",
      act: ACT_BY_SCENE.EndingsRouter,
      zone: "Threshold Beyond",
      nodes: null,
      marker: null,
    });
    this.add.text(12, 20, "ENDINGS ROUTER", { color: "#ffffff" });
    this.add.text(12, 36, "Stub. Routes to ascent / reincarnation / vow-return / soft endings.", {
      color: "#cccccc",
    });
  }
}
