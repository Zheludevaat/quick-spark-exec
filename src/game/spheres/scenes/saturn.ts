import * as Phaser from "phaser";
import type { SaveSlot } from "../../types";
import { ACT_BY_SCENE } from "../../types";
import { writeSave } from "../../save";
import { setSceneSnapshot } from "../../gameUiBridge";

export class SaturnPlateauScene extends Phaser.Scene {
  private save!: SaveSlot;

  constructor() {
    super("SaturnPlateau");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "SaturnPlateau";
    this.save.act = ACT_BY_SCENE.SaturnPlateau;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#111319");
    setSceneSnapshot({
      key: "SaturnPlateau",
      label: "Saturn - Avenue of Accepted Fate",
      act: ACT_BY_SCENE.SaturnPlateau,
      zone: "Avenue of Accepted Fate",
      nodes: null,
      marker: null,
    });
    this.add.text(12, 20, "SATURN - AVENUE OF ACCEPTED FATE", { color: "#d9d9dd" });
  }
}

export class SaturnTrialScene extends Phaser.Scene {
  private save!: SaveSlot;

  constructor() {
    super("SaturnTrial");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "SaturnTrial";
    this.save.act = ACT_BY_SCENE.SaturnTrial;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#090a0d");
    setSceneSnapshot({
      key: "SaturnTrial",
      label: "Saturn - Kronikos' Trial",
      act: ACT_BY_SCENE.SaturnTrial,
      zone: "Boundary of Silence",
      nodes: null,
      marker: null,
    });
    this.add.text(12, 20, "SATURN - KRONIKOS' TRIAL", { color: "#d9d9dd" });
  }
}
