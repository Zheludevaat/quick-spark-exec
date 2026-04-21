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

export type SceneNode = {
  id: string;
  label: string;
  /** Normalized 0..1 coords inside the minimap panel. */
  x: number;
  y: number;
  active?: boolean;
};

export type SceneShellMode = "minimal" | "standard";

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

  /** Scene-aware shell presentation policy. */
  shellMode: SceneShellMode;

  /** Idle dock content used when no dialogue is open. */
  idleTitle: string | null;
  idleBody: string | null;

  /** Optional scene-specific footer hint for standard shell scenes. */
  footerHint: string | null;

  /** Whether the desktop Player Hub may open in this scene. */
  allowPlayerHub: boolean;

  /** Whether the desktop minimap card should be shown at all. */
  showMiniMap: boolean;
};

export type OverlaySnapshot = {
  settingsOpen: boolean;
  loreOpen: boolean;
  inventoryOpen: boolean;
  playerHubOpen: boolean;
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
  scene: {
    key: "",
    label: "",
    act: 0,
    zone: null,
    nodes: null,
    marker: null,
    shellMode: "minimal",
    idleTitle: null,
    idleBody: null,
    footerHint: null,
    allowPlayerHub: false,
    showMiniMap: false,
  },
  overlay: {
    settingsOpen: false,
    loreOpen: false,
    inventoryOpen: false,
    playerHubOpen: false,
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
  const prev = snap.scene;
  const next: SceneSnapshot = { ...prev, ...patch };

  // Infer shell mode when callers do not provide one.
  if (patch.shellMode === undefined) {
    if (patch.key === "Title") {
      next.shellMode = "minimal";
    } else if (patch.key) {
      next.shellMode = "standard";
    }
  }

  // Default player hub policy from shell mode unless explicitly overridden.
  if (patch.allowPlayerHub === undefined && patch.key) {
    next.allowPlayerHub = next.shellMode === "standard";
  }

  // Default minimap visibility from actual available map data unless
  // explicitly overridden.
  if (patch.showMiniMap === undefined && patch.key) {
    const nextNodes = patch.nodes !== undefined ? patch.nodes : next.nodes;
    const nextMarker = patch.marker !== undefined ? patch.marker : next.marker;
    next.showMiniMap =
      next.shellMode === "standard" &&
      (!!nextMarker || (!!nextNodes && nextNodes.length > 0));
  }

  snap = { ...snap, scene: next };
  emit();
}

export function getOverlaySnapshot(): OverlaySnapshot {
  return snap.overlay;
}

/**
 * Merge `patch` into the current overlay snapshot AND derive `modalLock`
 * from the composite of blocking overlay booleans. This is the canonical
 * way to mutate overlay state — callers should never set `modalLock`
 * directly.
 */
export function patchOverlaySnapshot(patch: Partial<OverlaySnapshot>) {
  const next = { ...snap.overlay, ...patch };
  next.modalLock =
    !!next.settingsOpen ||
    !!next.loreOpen ||
    !!next.inventoryOpen ||
    !!next.playerHubOpen ||
    !!next.inquiryActive;
  snap = { ...snap, overlay: next };
  emit();
}

/**
 * Back-compat alias. Routes through `patchOverlaySnapshot` so legacy
 * callers automatically benefit from derived `modalLock`.
 */
export function setOverlaySnapshot(patch: Partial<OverlaySnapshot>) {
  patchOverlaySnapshot(patch);
}

export function resetGameUiSnapshot() {
  snap = initial();
  emit();
}
