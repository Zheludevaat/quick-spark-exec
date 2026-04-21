/**
 * Game UI state bridge.
 *
 * Phaser systems publish UI snapshots (stats, dialog, scene metadata, overlay
 * locks). The React shell subscribes and renders them without poking into
 * scene internals.
 *
 * One snapshot per topic. Mutations always emit so subscribers update.
 */

import type { Stats } from "./types";

export type HudSnapshot = {
  stats: Stats;
  /** Brief flash trigger — bumps when "SAVED" was emitted. */
  savedAt: number;
};

export type DialogSnapshot = {
  open: boolean;
  speaker: string;
  text: string;
  fullText: string;
  typing: boolean;
  waitingForConfirm: boolean;
};

export type SceneSnapshot = {
  key: string;
  label: string;
  act: number;
  /** Optional sub-zone label (e.g. region name in Imaginal). */
  zone: string | null;
  /** Optional Tier-2 minimap nodes (opt-in per scene). */
  nodes: SceneNode[] | null;
  /** Optional player marker [0..1, 0..1]. */
  marker: { x: number; y: number } | null;
};

export type SceneNode = {
  id: string;
  label: string;
  /** Normalized 0..1 coords inside the minimap panel. */
  x: number;
  y: number;
  active?: boolean;
};

export type OverlaySnapshot = {
  settingsOpen: boolean;
  loreOpen: boolean;
  inventoryOpen: boolean;
  inquiryActive: boolean;
  modalLock: boolean;
};

export type GameUiSnapshot = {
  hud: HudSnapshot;
  dialog: DialogSnapshot;
  scene: SceneSnapshot;
  overlay: OverlaySnapshot;
};

const initial = (): GameUiSnapshot => ({
  hud: { stats: { clarity: 0, compassion: 0, courage: 0 }, savedAt: 0 },
  dialog: {
    open: false,
    speaker: "",
    text: "",
    fullText: "",
    typing: false,
    waitingForConfirm: false,
  },
  scene: { key: "", label: "", act: 1, zone: null, nodes: null, marker: null },
  overlay: {
    settingsOpen: false,
    loreOpen: false,
    inventoryOpen: false,
    inquiryActive: false,
    modalLock: false,
  },
});

let snap: GameUiSnapshot = initial();
const listeners = new Set<(s: GameUiSnapshot) => void>();

function emit() {
  for (const l of listeners) {
    try {
      l(snap);
    } catch {
      /* ignore */
    }
  }
}

export function getGameUiSnapshot(): GameUiSnapshot {
  return snap;
}

export function subscribeGameUi(listener: (s: GameUiSnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setHudSnapshot(patch: Partial<HudSnapshot>) {
  snap = { ...snap, hud: { ...snap.hud, ...patch } };
  emit();
}

export function setDialogSnapshot(patch: Partial<DialogSnapshot>) {
  snap = { ...snap, dialog: { ...snap.dialog, ...patch } };
  emit();
}

export function clearDialogSnapshot() {
  snap = {
    ...snap,
    dialog: {
      open: false,
      speaker: "",
      text: "",
      fullText: "",
      typing: false,
      waitingForConfirm: false,
    },
  };
  emit();
}

export function setSceneSnapshot(patch: Partial<SceneSnapshot>) {
  snap = { ...snap, scene: { ...snap.scene, ...patch } };
  emit();
}

export function setOverlaySnapshot(patch: Partial<OverlaySnapshot>) {
  snap = { ...snap, overlay: { ...snap.overlay, ...patch } };
  emit();
}

export function resetGameUiSnapshot() {
  snap = initial();
  emit();
}
