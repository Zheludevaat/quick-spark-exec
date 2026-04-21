/**
 * Sun Sphere — small UI text helpers shared between plateau and trial.
 */

import * as Phaser from "phaser";
import { COLOR, GBCText, GBC_W } from "../gbcArt";

export function makeSunZoneLabel(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 14, text, {
    color: COLOR.textGold,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

export function makeSunSubtitle(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 24, text, {
    color: COLOR.textAccent,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}

export function makeSunHint(scene: Phaser.Scene, text: string): GBCText {
  return new GBCText(scene, 6, 132, text, {
    color: COLOR.textDim,
    depth: 120,
    maxWidthPx: GBC_W - 12,
  });
}
