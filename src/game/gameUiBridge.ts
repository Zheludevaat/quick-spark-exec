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

/**
 * Inquiry presented through the shell. When `open` is true the desktop
 * modal host renders the choice list inside the dialogue tray styling.
 * Touch shell currently keeps the canvas-side renderer.
 */
export type InquiryChoiceSnapshot = {
  id: string;
  label: string;
};

export type InquirySnapshot = {
  open: boolean;
  speaker: string;
  prompt: string;
  choices: InquiryChoiceSnapshot[];
  cursor: number;
};

/**
 * Authoritative modal surface. The desktop shell uses this to decide
 * which (if any) blocking non-diegetic UI is active. Phaser scenes
 * still own world-space and diegetic feedback; everything else flows
 * through this snapshot on desktop.
 */
export type UiSurface =
  | "none"
  | "dialog"
  | "inquiry"
  | "settings"
  | "lore"
  | "inventory"
  | "playerHub";

export type UiPresentationMode = "canvas" | "shell";

export type ModalSnapshot = {
  surface: UiSurface;
  mode: UiPresentationMode;
  title: string | null;
  subtitle: string | null;
  blocking: boolean;
};

export type SceneNode = {
  id: string;
  label: string;
  /** Normalized 0..1 coords inside the minimap panel. */
  x: number;
  y: number;
  active?: boolean;
};

/** @deprecated Kept for back-compat; granular show* flags now drive layout. */
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

  /** Idle dock content used when no dialogue is open. */
  idleTitle: string | null;
  idleBody: string | null;

  /** Optional scene-specific footer hint. */
  footerHint: string | null;

  /** Granular shell visibility flags. */
  showStatsBar: boolean;
  showUtilityRail: boolean;
  showDialogueDock: boolean;
  showMiniMap: boolean;
  allowPlayerHub: boolean;
  showFooter: boolean;
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
  inquiry: InquirySnapshot;
  modal: ModalSnapshot;
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
  inquiry: {
    open: false,
    speaker: "",
    prompt: "",
    choices: [],
    cursor: 0,
  },
  modal: {
    surface: "none",
    mode: "shell",
    title: null,
    subtitle: null,
    blocking: false,
  },
  scene: {
    key: "Title",
    label: "THE HERMETIC COMEDY",
    act: 0,
    zone: "TITLE",
    nodes: [
      { id: "moon", label: "Moon", x: 0.12, y: 0.52 },
      { id: "mercury", label: "Mercury", x: 0.24, y: 0.52 },
      { id: "venus", label: "Venus", x: 0.36, y: 0.52 },
      { id: "sun", label: "Sun", x: 0.5, y: 0.5, active: true },
      { id: "mars", label: "Mars", x: 0.64, y: 0.52 },
      { id: "jupiter", label: "Jupiter", x: 0.78, y: 0.52 },
      { id: "saturn", label: "Saturn", x: 0.9, y: 0.52 },
    ],
    marker: null,
    idleTitle: "METAXY",
    idleBody: "Seven spheres. One ascent.",
    footerHint: null,
    showStatsBar: false,
    showUtilityRail: false,
    showDialogueDock: false,
    showMiniMap: true,
    allowPlayerHub: false,
    showFooter: false,
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

// ---------------------------------------------------------------------
// Inquiry
//
// runInquiry on the canvas side publishes a snapshot of the prompt + the
// choice rows + the current cursor. The desktop modal host renders the
// list inside the dialogue tray styling. Touch shell currently keeps the
// canvas-side renderer.
// ---------------------------------------------------------------------

export function setInquirySnapshot(patch: Partial<InquirySnapshot>) {
  snap = { ...snap, inquiry: { ...snap.inquiry, ...patch } };
  emit();
}

export function clearInquirySnapshot() {
  snap = {
    ...snap,
    inquiry: { open: false, speaker: "", prompt: "", choices: [], cursor: 0 },
  };
  emit();
}

// ---------------------------------------------------------------------
// Modal surface
//
// The desktop shell promotes itself to the sole owner of all blocking
// non-diegetic UI. Phaser code requests a surface by calling
// `setModalSnapshot({ surface: "settings", ... })` and the shell owns
// the actual rendering of dialog / inquiry / settings / lore / inventory
// / player hub.
//
// `mode: "canvas"` is reserved for touch fallbacks so a scene can opt
// out of shell ownership when the touch shell hasn't migrated yet.
// ---------------------------------------------------------------------

export function setModalSnapshot(patch: Partial<ModalSnapshot>) {
  snap = { ...snap, modal: { ...snap.modal, ...patch } };
  emit();
}

export function clearModalSnapshot() {
  snap = {
    ...snap,
    modal: {
      surface: "none",
      mode: "shell",
      title: null,
      subtitle: null,
      blocking: false,
    },
  };
  emit();
}

export function setSceneSnapshot(patch: Partial<SceneSnapshot>) {
  const prev = snap.scene;
  const keyChanged = patch.key !== undefined && patch.key !== prev.key;

  // On scene-key change, start from a fresh scene snapshot so stale metadata
  // from the previous scene cannot leak into the desktop shell.
  const base: SceneSnapshot = keyChanged ? { ...initial().scene } : prev;
  const next: SceneSnapshot = { ...base, ...patch };

  const key = next.key;
  const isTitle = key === "Title";

  // Granular defaults: title hides most chrome, gameplay/hub scenes show it.
  if (patch.showStatsBar === undefined && patch.key !== undefined) {
    next.showStatsBar = !isTitle;
  }
  if (patch.showUtilityRail === undefined && patch.key !== undefined) {
    next.showUtilityRail = !isTitle;
  }
  if (patch.showDialogueDock === undefined && patch.key !== undefined) {
    next.showDialogueDock = !isTitle;
  }
  if (patch.showFooter === undefined && patch.key !== undefined) {
    next.showFooter = !isTitle;
  }
  if (patch.allowPlayerHub === undefined && patch.key !== undefined) {
    next.allowPlayerHub = !isTitle;
  }
  if (patch.showMiniMap === undefined && patch.key !== undefined) {
    next.showMiniMap = true;
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
