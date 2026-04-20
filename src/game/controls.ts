/**
 * Player-facing controls system.
 *
 * Two layers:
 *   1. Key bindings  — which keyboard keys map to each game action.
 *   2. Touch layout  — how the on-screen pad is drawn on phones/tablets.
 *
 * Every scene reads from the same singleton (loaded from localStorage).
 * Changes broadcast via a small subscriber list so live scenes can rebuild
 * their input pipeline without a reload.
 */
import * as Phaser from "phaser";

export type GameAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "action" // A — confirm / interact / advance dialog
  | "cancel" // B — witness / back / daimon
  | "lore" // L — open lore log
  | "mute" // M — toggle audio
  | "lcd" // \ — CRT overlay
  | "settings" // P / Esc — open settings
  | "skip"; // Tab — skip current dialog (advance fast)

/** A single binding can have up to 2 keys (e.g. ARROWUP + W). */
export type Binding = { primary: string; secondary?: string };

export type TouchLayout = "dpad" | "swipe" | "hybrid" | "off";
export type ButtonSize = "s" | "m" | "l" | "xl";

export type ControlsState = {
  bindings: Record<GameAction, Binding>;
  touchLayout: TouchLayout;
  buttonSize: ButtonSize;
  haptics: boolean;
  /** When > 0, dialogs auto-advance after this many ms. 0 = manual only. */
  dialogAutoAdvanceMs: number;
  /** Mirror the d-pad to the right side (for left-handed players). */
  leftHanded: boolean;
};

const STORAGE_KEY = "hermetic_controls_v1";

const DEFAULTS: ControlsState = {
  bindings: {
    up: { primary: "UP", secondary: "W" },
    down: { primary: "DOWN", secondary: "S" },
    left: { primary: "LEFT", secondary: "A" },
    right: { primary: "RIGHT", secondary: "D" },
    action: { primary: "SPACE", secondary: "ENTER" },
    cancel: { primary: "B", secondary: "Q" },
    lore: { primary: "L" },
    mute: { primary: "M" },
    lcd: { primary: "BACKSLASH" },
    settings: { primary: "P", secondary: "ESC" },
    skip: { primary: "TAB" },
  },
  touchLayout: "hybrid",
  buttonSize: "l",
  haptics: true,
  dialogAutoAdvanceMs: 0,
  leftHanded: false,
};

let state: ControlsState = load();
const subscribers = new Set<() => void>();

function load(): ControlsState {
  if (typeof window === "undefined") return clone(DEFAULTS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<ControlsState>;
    const merged: ControlsState = {
      ...clone(DEFAULTS),
      ...parsed,
      bindings: { ...DEFAULTS.bindings, ...(parsed.bindings ?? {}) },
    };
    return merged;
  } catch {
    return clone(DEFAULTS);
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function getControls(): ControlsState {
  return state;
}

export function saveControls() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  subscribers.forEach((fn) => fn());
}

export function setBinding(action: GameAction, primary: string, secondary?: string) {
  state.bindings[action] = { primary, secondary };
  saveControls();
}

export function setTouchLayout(layout: TouchLayout) {
  state.touchLayout = layout;
  saveControls();
}

export function setButtonSize(size: ButtonSize) {
  state.buttonSize = size;
  saveControls();
}

export function setHaptics(on: boolean) {
  state.haptics = on;
  saveControls();
}

export function setLeftHanded(on: boolean) {
  state.leftHanded = on;
  saveControls();
}

export function setDialogAutoAdvance(ms: number) {
  state.dialogAutoAdvanceMs = Math.max(0, Math.min(8000, ms));
  saveControls();
}

export function resetControls() {
  state = clone(DEFAULTS);
  saveControls();
}

export function subscribeControls(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// ============================================================================
// Key matching helpers
// ============================================================================

/** Pretty label for a Phaser key string. */
export function keyLabel(k: string): string {
  if (!k) return "—";
  const map: Record<string, string> = {
    UP: "↑",
    DOWN: "↓",
    LEFT: "←",
    RIGHT: "→",
    SPACE: "SPACE",
    ENTER: "ENTER",
    ESC: "ESC",
    TAB: "TAB",
    BACKSLASH: "\\",
    SHIFT: "SHIFT",
    CTRL: "CTRL",
    ALT: "ALT",
  };
  return map[k] ?? k;
}

/** Convert a KeyboardEvent.code/key into our normalized name. */
export function normalizeKeyEvent(e: KeyboardEvent): string | null {
  // Use e.code for letters/arrows so it's layout-stable.
  if (!e.code && !e.key) return null;
  const code = e.code;
  if (code.startsWith("Key")) return code.slice(3); // KeyA → A
  if (code.startsWith("Digit")) return code.slice(5); // Digit1 → 1
  if (code === "ArrowUp") return "UP";
  if (code === "ArrowDown") return "DOWN";
  if (code === "ArrowLeft") return "LEFT";
  if (code === "ArrowRight") return "RIGHT";
  if (code === "Space") return "SPACE";
  if (code === "Enter") return "ENTER";
  if (code === "Escape") return "ESC";
  if (code === "Tab") return "TAB";
  if (code === "Backslash") return "BACKSLASH";
  if (code === "ShiftLeft" || code === "ShiftRight") return "SHIFT";
  // Fallback to e.key uppercased
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  return null;
}

/** True if this Phaser key string matches a held key on the pad. */
export function isActionDown(scene: Phaser.Scene, action: GameAction): boolean {
  const kb = scene.input.keyboard;
  if (!kb) return false;
  const b = state.bindings[action];
  const k1 = b.primary ? kb.addKey(b.primary, false, false) : null;
  const k2 = b.secondary ? kb.addKey(b.secondary, false, false) : null;
  return !!(k1?.isDown || k2?.isDown);
}

/**
 * Bind a "keydown" handler for a logical action across both primary/secondary keys.
 * Returns an unbind function. Safe to call from any scene.
 */
export function onActionDown(
  scene: Phaser.Scene,
  action: GameAction,
  handler: () => void,
): () => void {
  const wrap = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e);
    if (!name) return;
    const b = state.bindings[action];
    if (name === b.primary || name === b.secondary) handler();
  };
  const domHandler = (e: KeyboardEvent) => wrap(e);
  window.addEventListener("keydown", domHandler);

  // Forward virtual-pad presses for the canonical action/cancel actions
  // so scenes don't have to double-bind events.on("vinput-action", ...).
  let vEvent: string | null = null;
  if (action === "action") vEvent = "vinput-action";
  else if (action === "cancel") vEvent = "vinput-cancel";
  const vHandler = () => handler();
  if (vEvent) scene.events.on(vEvent, vHandler);

  const cleanup = () => {
    window.removeEventListener("keydown", domHandler);
    if (vEvent) scene.events.off(vEvent, vHandler);
  };
  scene.events.once("shutdown", cleanup);
  scene.events.once("destroy", cleanup);
  return cleanup;
}

/**
 * Bind a directional handler that fires once per keydown for any of up/down/left/right
 * (whichever bindings the player has set). Returns an unbind function.
 */
export function onDirection(
  scene: Phaser.Scene,
  handler: (dir: "up" | "down" | "left" | "right") => void,
): () => void {
  const domHandler = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e);
    if (!name) return;
    const b = state.bindings;
    for (const dir of ["up", "down", "left", "right"] as const) {
      if (name === b[dir].primary || name === b[dir].secondary) {
        handler(dir);
        return;
      }
    }
  };
  window.addEventListener("keydown", domHandler);
  // Also forward virtual-pad direction presses so scenes don't have to
  // double-bind (vinput-down + onDirection caused double swaps in knot UIs).
  const vHandler = (dir: string) => {
    if (dir === "up" || dir === "down" || dir === "left" || dir === "right") handler(dir);
  };
  scene.events.on("vinput-down", vHandler);
  const cleanup = () => {
    window.removeEventListener("keydown", domHandler);
    scene.events.off("vinput-down", vHandler);
  };
  scene.events.once("shutdown", cleanup);
  scene.events.once("destroy", cleanup);
  return cleanup;
}

/** Trigger a short haptic buzz on supported devices, if enabled. */
export function buzz(ms = 12) {
  if (!state.haptics) return;
  if (typeof navigator === "undefined") return;
  const v = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  try {
    v?.call(navigator, [ms]);
  } catch {
    /* ignore */
  }
}
