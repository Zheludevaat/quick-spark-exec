import * as Phaser from "phaser";
import { GBC_W, GBC_H } from "./gbcArt";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { LastDayScene } from "./scenes/LastDayScene";
import { CrossingScene } from "./scenes/CrossingScene";
import { SilverThresholdScene } from "./scenes/SilverThresholdScene";
import { ImaginalRealmScene } from "./scenes/ImaginalRealmScene";
import { EncounterScene } from "./scenes/EncounterScene";
import { CuratedSelfScene } from "./scenes/CuratedSelfScene";
import { EpilogueScene } from "./scenes/EpilogueScene";
import { AthanorThresholdScene } from "./scenes/AthanorThresholdScene";
import { NigredoScene } from "./scenes/NigredoScene";
import { AlbedoScene } from "./scenes/AlbedoScene";
import { CitrinitasScene } from "./scenes/CitrinitasScene";
import { RubedoScene } from "./scenes/RubedoScene";
import { SealedVesselScene } from "./scenes/SealedVesselScene";
import { MetaxyHubScene } from "./scenes/MetaxyHubScene";
import { MercuryPlateauScene, MercuryTrialScene } from "./spheres/scenes/mercury";
import { VenusPlateauScene, VenusTrialScene } from "./spheres/scenes/venus";
import { MarsPlateauScene, MarsTrialScene } from "./spheres/scenes/mars";
// Jupiter and Saturn are canonical scenes in src/game/canon/registry.ts but
// intentionally not yet runtime-registered. They remain dim portals in
// MetaxyHubScene and hidden from dev-jump until their authored content lands.
import { SunPlateauScene } from "./scenes/SunPlateauScene";
import { SunTrialScene } from "./scenes/SunTrialScene";
import { MoonTrialScene } from "./scenes/MoonTrialScene";
import { EndingsRouterScene } from "./scenes/EndingsRouterScene";
import { PuzzleChamberScene } from "./puzzles/PuzzleChamberScene";

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
      MercuryPlateauScene,
      MercuryTrialScene,
      VenusPlateauScene,
      VenusTrialScene,
      MarsPlateauScene,
      MarsTrialScene,
      // Jupiter / Saturn plateau + trial scenes are not yet wired here.
      // The hub already gates their portals; registering them prematurely
      // creates "registered but unreachable" content.
      MoonTrialScene,
      SunPlateauScene,
      SunTrialScene,
      CuratedSelfScene,
      EpilogueScene,
      EndingsRouterScene,
      PuzzleChamberScene,
    ],
  });
}
