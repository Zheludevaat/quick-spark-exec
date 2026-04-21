import * as Phaser from "phaser";
import type { SaveSlot } from "../types";
import { ACT_BY_SCENE } from "../types";
import { writeSave } from "../save";
import { setSceneSnapshot } from "../gameUiBridge";

export class MoonTrialScene extends Phaser.Scene {
  private save!: SaveSlot;

  constructor() {
    super("MoonTrial");
  }

  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.save.scene = "MoonTrial";
    this.save.act = ACT_BY_SCENE.MoonTrial;
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#d9dbe8");

    setSceneSnapshot({
      key: "MoonTrial",
      label: "Moon - Selenos' Trial",
      act: ACT_BY_SCENE.MoonTrial,
      zone: "Silver Water Hall",
      nodes: null,
      marker: null,
    });

    this.add.text(12, 20, "MOON - SELENOS' TRIAL", { color: "#111111" });
    this.add.text(12, 36, "Stub scene. Replace with the lunar witness trial.", {
      color: "#333333",
    });
  }
}
