import * as Phaser from "phaser";
import type { SaveSlot } from "../../types";
import { ACT_BY_SCENE } from "../../types";
import { writeSave } from "../../save";
import { setSceneSnapshot } from "../../gameUiBridge";

export class JupiterPlateauScene extends Phaser.Scene {
  private save!: SaveSlot;

  constructor() {
    super("JupiterPlateau");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "JupiterPlateau";
    this.save.act = ACT_BY_SCENE.JupiterPlateau;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#18224f");
    setSceneSnapshot({
      key: "JupiterPlateau",
      label: "Jupiter - Grand Tribunal of Perfect Justice",
      act: ACT_BY_SCENE.JupiterPlateau,
      zone: "Grand Tribunal of Perfect Justice",
      nodes: null,
      marker: null,
    });
    this.add.text(12, 20, "JUPITER - GRAND TRIBUNAL", { color: "#dde7ff" });
  }
}

export class JupiterTrialScene extends Phaser.Scene {
  private save!: SaveSlot;

  constructor() {
    super("JupiterTrial");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "JupiterTrial";
    this.save.act = ACT_BY_SCENE.JupiterTrial;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#0f1a3a");
    setSceneSnapshot({
      key: "JupiterTrial",
      label: "Jupiter - Jovian's Trial",
      act: ACT_BY_SCENE.JupiterTrial,
      zone: "City of Consequences",
      nodes: null,
      marker: null,
    });
    this.add.text(12, 20, "JUPITER - JOVIAN'S TRIAL", { color: "#dde7ff" });
  }
}
