import * as Phaser from "phaser";
import { GBC_W, GBC_H } from "./gbcArt";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { LastDayScene } from "./scenes/LastDayScene";
import { CrossingScene } from "./scenes/CrossingScene";
import { SilverThresholdScene } from "./scenes/SilverThresholdScene";
import { ImaginalRealmScene } from "./scenes/ImaginalRealmScene";
import { EncounterScene } from "./scenes/EncounterScene";
import { CuratedSelfScene, EpilogueScene } from "./scenes/CuratedSelfScene";
import { AthanorThresholdScene } from "./scenes/AthanorThresholdScene";
import { NigredoScene } from "./scenes/NigredoScene";
import { AlbedoScene } from "./scenes/AlbedoScene";
import { CitrinitasScene } from "./scenes/CitrinitasScene";
import { RubedoScene } from "./scenes/RubedoScene";
import { SealedVesselScene } from "./scenes/SealedVesselScene";
import { MetaxyHubScene } from "./scenes/MetaxyHubScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GBC_W,
    height: GBC_H,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: "#0a0e1a",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: 1,
    },
    render: {
      pixelArt: true,
      antialias: false,
      antialiasGL: false,
      roundPixels: true,
    },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
    scene: [
      BootScene,
      TitleScene,
      LastDayScene,
      CrossingScene,
      SilverThresholdScene,
      ImaginalRealmScene,
      EncounterScene,
      AthanorThresholdScene,
      NigredoScene,
      AlbedoScene,
      CitrinitasScene,
      RubedoScene,
      SealedVesselScene,
      MetaxyHubScene,
      CuratedSelfScene,
      EpilogueScene,
    ],
  });
}
