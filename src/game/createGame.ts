import * as Phaser from "phaser";
import { VIEW_W, VIEW_H } from "./shared";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { IntroScene } from "./scenes/IntroScene";
import { SilverThresholdScene } from "./scenes/SilverThresholdScene";
import { MoonHallScene } from "./scenes/MoonHallScene";
import { EncounterScene } from "./scenes/EncounterScene";
import { CuratedSelfScene, EpilogueScene } from "./scenes/CuratedSelfScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W,
    height: VIEW_H,
    pixelArt: true,
    backgroundColor: "#05070d",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
    scene: [
      BootScene,
      TitleScene,
      IntroScene,
      SilverThresholdScene,
      MoonHallScene,
      EncounterScene,
      CuratedSelfScene,
      EpilogueScene,
    ],
  });
}
