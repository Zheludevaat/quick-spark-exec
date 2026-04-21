/**
 * Virtual input bridge.
 *
 * Canonical external input source for the React shell (TouchLandscapeShell,
 * joystick, A/B buttons). Phaser-side `InputState` and `runDialog` poll /
 * subscribe to this in addition to keyboard.
 *
 * Held directions: up/down/left/right.
 * Press/release: action (A), cancel (B).
 *
 * Robustness: state is fully cleared on window blur, document visibilitychange,
 * orientation change, and on demand (overlays opening, scene shutdown).
 */

export type VAction = "up" | "down" | "left" | "right" | "action" | "cancel";

export type VirtualInputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  cancel: boolean;
};

type VEvent =
  | { type: "down"; action: VAction }
  | { type: "up"; action: VAction }
  | { type: "pulse"; action: VAction }
  | { type: "clear" };

type Listener = (e: VEvent, state: VirtualInputState) => void;

const state: VirtualInputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  action: false,
  cancel: false,
};

const listeners = new Set<Listener>();

function emit(e: VEvent) {
  for (const l of listeners) {
    try {
      l(e, state);
    } catch {
      /* listener error — ignore */
    }
  }
}

export function emitVirtualDown(action: VAction) {
  if (state[action]) return;
  state[action] = true;
  emit({ type: "down", action });
}

export function emitVirtualUp(action: VAction) {
  if (!state[action]) return;
  state[action] = false;
  emit({ type: "up", action });
}

/** Single-shot press: down + up in one beat. Useful for tap buttons. */
export function pulseVirtual(action: VAction) {
  emit({ type: "pulse", action });
  // For held semantics we briefly toggle so polling sees the press.
  if (!state[action]) {
    state[action] = true;
    emit({ type: "down", action });
    state[action] = false;
    emit({ type: "up", action });
  }
}

export function getVirtualState(): VirtualInputState {
  return state;
}

export function subscribeVirtualInput(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearVirtualInput() {
  let changed = false;
  (Object.keys(state) as VAction[]).forEach((k) => {
    if (state[k]) {
      state[k] = false;
      changed = true;
    }
  });
  if (changed) emit({ type: "clear" });
}

// ----------------------------------------------------------------------------
// Global robustness handlers — install once.
// ----------------------------------------------------------------------------
let installed = false;
export function installVirtualInputGlobals() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;
  const onBlur = () => clearVirtualInput();
  const onVis = () => {
    if (document.visibilityState === "hidden") clearVirtualInput();
  };
  const onOrient = () => clearVirtualInput();
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("orientationchange", onOrient);
}
