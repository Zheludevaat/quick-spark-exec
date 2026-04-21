/**
 * Shared scenic-art type vocabulary.
 *
 * Acts that adopt the scenic toolkit publish a `ScenicRoomSpec` describing
 * a zone's palette, backdrop style, floor tile, and landmarks. Painters
 * consume the spec; aftermath layers consume the same palette family so
 * resolved-state tones stay coherent within an act.
 */
import * as Phaser from "phaser";

export type ScenicPalette = {
  bg0: string;
  bg1: string;
  bg2: string;
  floor0: string;
  floor1: string;
  wall0: string;
  wall1: string;
  trim0: string;
  trim1: string;
  accent0: string;
  accent1: string;
};

export type ScenicZoneKey = string;

export type ScenicLandmarkKind =
  | "obelisk"
  | "arch"
  | "gate"
  | "lens"
  | "seal"
  | "vessel"
  | "mirror"
  | "banner"
  | "pillar_cluster";

export type ScenicLandmarkSpec = {
  kind: ScenicLandmarkKind;
  x: number;
  y: number;
  key?: string;
};

export type ScenicBackdropStyle =
  | "skyline"
  | "interior"
  | "sanctum"
  | "garden"
  | "arena";

export type ScenicRoomSpec = {
  zone: ScenicZoneKey;
  palette: ScenicPalette;
  backdrop: ScenicBackdropStyle;
  floorTileKey: string;
  floorY: number;
  floorH: number;
  landmarks: ScenicLandmarkSpec[];
  roomLabel?: string;
};

export type ScenicHandle = {
  destroy(): void;
};

export type ScenicPainter = (
  scene: Phaser.Scene,
  spec: ScenicRoomSpec,
) => ScenicHandle;
