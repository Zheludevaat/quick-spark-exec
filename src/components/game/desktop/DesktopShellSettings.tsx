/**
 * Desktop shell settings panel.
 *
 * Owns the rendering of the settings modal on the desktop shell. Reads
 * and mutates the same controls/audio singletons the canvas settings
 * scene uses, so prefs persist identically.
 *
 * Two pages:
 *   - "main": display/audio/touch toggles, return-to-title, reset.
 *   - "keys": full rebinding parity with the canvas settings keys page.
 *     Each action exposes PRIMARY and SECONDARY slots; clicking a slot
 *     enters capture mode, and the next normalized keypress writes it.
 *     Secondary can be cleared. ESC backs out of capture, then out of
 *     the keys page.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getControls,
  setBinding,
  setButtonSize,
  setHaptics,
  setLeftHanded,
  setDialogAutoAdvance,
  setInterfaceMode,
  setTouchLayout,
  resetControls,
  subscribeControls,
  keyLabel,
  normalizeKeyEvent,
  type ButtonSize,
  type GameAction,
  type TouchLayout,
  type InterfaceMode,
} from "@/game/controls";
import { getAudio } from "@/game/audio";
import { subscribeGameUi, getGameUiSnapshot } from "@/game/gameUiBridge";
import {
  ShellPanel,
  ShellPanelTitle,
  ShellPanelMeta,
} from "@/components/game/shell/ShellPanel";

type Page = "main" | "keys";
type Slot = "primary" | "secondary";

type Row = {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
  onLeft?: () => void;
  onRight?: () => void;
  onActivate?: () => void;
};

const INTERFACE_ORDER: InterfaceMode[] = ["desktop", "touch_landscape"];
const BUTTON_SIZES: ButtonSize[] = ["s", "m", "l", "xl"];
const TOUCH_LAYOUTS: TouchLayout[] = ["dpad", "swipe", "hybrid", "off"];

const ACTION_ORDER: GameAction[] = [
  "up",
  "down",
  "left",
  "right",
  "action",
  "cancel",
  "lore",
  "settings",
  "skip",
  "mute",
  "lcd",
];

const ACTION_LABEL: Record<GameAction, string> = {
  up: "MOVE UP",
  down: "MOVE DOWN",
  left: "MOVE LEFT",
  right: "MOVE RIGHT",
  action: "A / CONFIRM",
  cancel: "B / WITNESS",
  lore: "LORE LOG",
  settings: "SETTINGS",
  skip: "SKIP DIALOG",
  mute: "MUTE AUDIO",
  lcd: "CRT OVERLAY",
};

function fmtAuto(ms: number): string {
  if (ms <= 0) return "MANUAL";
  return `${(ms / 1000).toFixed(1)}s`;
}

function close() {
  window.dispatchEvent(new Event("hermetic-settings-close"));
}

function returnToTitle() {
  const fn = (window as unknown as Record<string, unknown>)
    .__hermeticReturnToTitle as (() => void) | undefined;
  fn?.();
}

export function DesktopShellSettings() {
  const [, force] = useState(0);
  const [audioTick, setAudioTick] = useState(0);
  const [page, setPage] = useState<Page>("main");
  const [cursor, setCursor] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  // Active rebind capture: { action, slot } when waiting for a keypress.
  const [capture, setCapture] = useState<{ action: GameAction; slot: Slot } | null>(null);

  useEffect(() => {
    return subscribeControls(() => force((n) => n + 1));
  }, []);
  useEffect(() => {
    return subscribeGameUi((s) => setScene(s.scene));
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setAudioTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, []);
  void audioTick;

  const c = getControls();
  const audio = getAudio();
  const canReturnToTitle = scene.key !== "Title" && scene.key !== "";

  const rows: Row[] = useMemo(() => {
    const cycleInterface = (dir: 1 | -1) => {
      const i = INTERFACE_ORDER.indexOf(c.interfaceMode);
      setInterfaceMode(
        INTERFACE_ORDER[(i + dir + INTERFACE_ORDER.length) % INTERFACE_ORDER.length],
      );
    };
    const cycleSize = (dir: 1 | -1) => {
      const i = BUTTON_SIZES.indexOf(c.buttonSize);
      setButtonSize(
        BUTTON_SIZES[(i + dir + BUTTON_SIZES.length) % BUTTON_SIZES.length],
      );
    };
    const cycleLayout = (dir: 1 | -1) => {
      const i = TOUCH_LAYOUTS.indexOf(c.touchLayout);
      setTouchLayout(
        TOUCH_LAYOUTS[(i + dir + TOUCH_LAYOUTS.length) % TOUCH_LAYOUTS.length],
      );
    };
    const adjustVol = (dir: 1 | -1) => {
      const next = Math.max(0, Math.min(1, audio.volume + dir * 0.1));
      audio.setVolume(next);
      setAudioTick((n) => n + 1);
    };
    const adjustAuto = (dir: 1 | -1) => {
      const next = c.dialogAutoAdvanceMs + dir * 500;
      setDialogAutoAdvance(next);
    };
    const toggleMute = () => {
      audio.setMuted(!audio.muted);
      setAudioTick((n) => n + 1);
    };

    const list: Row[] = [
      {
        label: "INTERFACE MODE",
        value: c.interfaceMode === "desktop" ? "DESKTOP" : "TOUCH",
        detail:
          "Switch between desktop chrome and touch landscape layout. Touch shows the on-screen pad.",
        onLeft: () => cycleInterface(-1),
        onRight: () => cycleInterface(1),
        onActivate: () => cycleInterface(1),
      },
      {
        label: "VOLUME",
        value: audio.muted ? "MUTED" : `${Math.round(audio.volume * 100)}%`,
        detail: "Master audio level. Affects music, dialog blips, and SFX.",
        onLeft: () => adjustVol(-1),
        onRight: () => adjustVol(1),
        onActivate: toggleMute,
      },
      {
        label: "MUTE",
        value: audio.muted ? "ON" : "OFF",
        detail: "Silence all audio without losing your volume preference.",
        onActivate: toggleMute,
        onLeft: toggleMute,
        onRight: toggleMute,
      },
      {
        label: "AUTO-ADVANCE",
        value: fmtAuto(c.dialogAutoAdvanceMs),
        detail:
          "When set, dialogue advances automatically after the configured delay. 0 = manual.",
        onLeft: () => adjustAuto(-1),
        onRight: () => adjustAuto(1),
      },
      {
        label: "LEFT-HANDED",
        value: c.leftHanded ? "ON" : "OFF",
        detail: "Mirror touch joystick + action buttons across the screen.",
        onLeft: () => setLeftHanded(!c.leftHanded),
        onRight: () => setLeftHanded(!c.leftHanded),
        onActivate: () => setLeftHanded(!c.leftHanded),
      },
      {
        label: "HAPTICS",
        value: c.haptics ? "ON" : "OFF",
        detail: "Short vibration on touch buttons (devices that support it).",
        onLeft: () => setHaptics(!c.haptics),
        onRight: () => setHaptics(!c.haptics),
        onActivate: () => setHaptics(!c.haptics),
      },
    ];

    // Touch rows are always present (parity with canvas settings) so the
    // player can preconfigure them before switching interface mode.
    list.push(
      {
        label: "BUTTON SIZE",
        value: c.buttonSize.toUpperCase(),
        detail: "Size of the on-screen A/B + d-pad buttons (used in touch mode).",
        onLeft: () => cycleSize(-1),
        onRight: () => cycleSize(1),
      },
      {
        label: "TOUCH LAYOUT",
        value: c.touchLayout.toUpperCase(),
        detail: "Choose between d-pad, swipe gestures, hybrid, or none (used in touch mode).",
        onLeft: () => cycleLayout(-1),
        onRight: () => cycleLayout(1),
      },
    );

    list.push({
      label: "KEY BINDINGS",
      value: "›",
      detail: "Edit primary and secondary keys for every game action.",
      onActivate: () => {
        setPage("keys");
        setCursor(0);
      },
    });

    if (canReturnToTitle) {
      list.push({
        label: confirmQuit ? "CONFIRM RETURN TO TITLE" : "RETURN TO TITLE",
        value: "›",
        danger: true,
        detail: confirmQuit
          ? "Activate again to leave the current run and return to the title screen."
          : "Leave the current run and return to the title screen.",
        onActivate: () => {
          if (!confirmQuit) {
            setConfirmQuit(true);
            return;
          }
          returnToTitle();
        },
      });
    }

    list.push({
      label: "RESET CONTROLS",
      value: "›",
      detail: "Restore key bindings and layout settings to defaults. Audio volume/mute are not affected.",
      onActivate: () => resetControls(),
    });

    return list;
  }, [c, audio, canReturnToTitle, confirmQuit]);

  // Clamp cursor when row count or page changes.
  useEffect(() => {
    const max = page === "main" ? rows.length : ACTION_ORDER.length;
    setCursor((cur) => Math.min(cur, Math.max(0, max - 1)));
  }, [rows.length, page]);

  // Reset confirm-quit state if cursor moves away from the row.
  useEffect(() => {
    if (page !== "main") {
      if (confirmQuit) setConfirmQuit(false);
      return;
    }
    const active = rows[cursor];
    if (!active || !active.label.includes("RETURN TO TITLE")) {
      if (confirmQuit) setConfirmQuit(false);
    }
  }, [cursor, rows, confirmQuit, page]);

  const move = useCallback(
    (dir: 1 | -1) => {
      const max = page === "main" ? rows.length : ACTION_ORDER.length;
      if (max <= 0) return;
      setCursor((cur) => (cur + dir + max) % max);
    },
    [rows.length, page],
  );

  // Keyboard handling (capture phase). When in rebind capture mode, the
  // very next keypress (other than ESC) is written to the active slot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // --- Rebind capture mode swallows everything ---
      if (capture) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Escape") {
          setCapture(null);
          return;
        }
        const name = normalizeKeyEvent(e);
        if (!name) return;
        const cur = getControls().bindings[capture.action];
        if (capture.slot === "primary") {
          setBinding(capture.action, name, cur.secondary);
        } else {
          setBinding(capture.action, cur.primary, name);
        }
        getAudio().sfx("confirm");
        setCapture(null);
        return;
      }

      const k = e.key;

      // ESC: back out of keys page first, then close.
      if (k === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "keys") {
          setPage("main");
          setCursor(0);
        } else {
          close();
        }
        return;
      }

      if (page === "main" && (k === "p" || k === "P")) {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }

      if (k === "ArrowUp" || k === "w" || k === "W") {
        e.preventDefault();
        e.stopPropagation();
        move(-1);
        return;
      }
      if (k === "ArrowDown" || k === "s" || k === "S") {
        e.preventDefault();
        e.stopPropagation();
        move(1);
        return;
      }
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "main") rows[cursor]?.onLeft?.();
        return;
      }
      if (k === "ArrowRight" || k === "d" || k === "D") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "main") rows[cursor]?.onRight?.();
        return;
      }
      if (k === " " || k === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "main") {
          rows[cursor]?.onActivate?.();
        } else {
          // On keys page, Enter starts capturing the PRIMARY slot for the
          // selected action. (Use mouse for secondary / clear.)
          const action = ACTION_ORDER[cursor];
          if (action) setCapture({ action, slot: "primary" });
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [cursor, rows, move, page, capture]);

  const active = page === "main" ? rows[cursor] : null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center font-mono"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ShellPanel
        tone="accent"
        style={{
          width: "min(92vw, 640px)",
          maxHeight: "88vh",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "1px solid rgba(168,200,232,0.3)" }}
        >
          <ShellPanelTitle style={{ marginBottom: 0 }}>
            {page === "main" ? "SETTINGS" : "KEY BINDINGS"}
          </ShellPanelTitle>
          <div className="flex items-center gap-2">
            {page === "keys" && (
              <button
                type="button"
                onClick={() => {
                  setPage("main");
                  setCursor(0);
                }}
                className="rounded px-2 py-1 text-xs"
                style={{
                  background: "rgba(74,120,200,0.85)",
                  color: "#fff",
                  border: "1px solid rgba(168,200,232,0.6)",
                }}
                aria-label="Back to settings"
              >
                ‹ BACK
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="rounded px-2 py-1 text-xs"
              style={{
                background: "rgba(216,74,74,0.85)",
                color: "#fff",
                border: "1px solid rgba(255,200,200,0.5)",
              }}
              aria-label="Close settings"
            >
              CLOSE (ESC)
            </button>
          </div>
        </header>

        <div
          className="overflow-y-auto px-4 py-3 grid gap-3 text-xs"
          style={{ flex: 1, gridTemplateColumns: "1fr" }}
        >
          {page === "main" ? (
            <>
              <ul className="space-y-1">
                {rows.map((r, i) => {
                  const selected = i === cursor;
                  const bg = selected
                    ? r.danger
                      ? "rgba(216,74,74,0.14)"
                      : "rgba(232,200,144,0.12)"
                    : "rgba(255,255,255,0.02)";
                  const border = selected
                    ? r.danger
                      ? "1px solid rgba(216,74,74,0.55)"
                      : "1px solid rgba(232,200,144,0.45)"
                    : "1px solid rgba(168,200,232,0.18)";
                  const color = selected
                    ? r.danger
                      ? "#f0a8a8"
                      : "#e8c890"
                    : "#eef3ff";
                  const valueColor = selected
                    ? r.danger
                      ? "#f0a8a8"
                      : "#e8c890"
                    : "#a8c8e8";
                  return (
                    <li key={r.label}>
                      <button
                        type="button"
                        onPointerEnter={() => setCursor(i)}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setCursor(i);
                          r.onActivate?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded text-left"
                        style={{ background: bg, border, color }}
                      >
                        <span>{r.label}</span>
                        <span style={{ color: valueColor, opacity: 0.9 }}>
                          {r.value}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <ShellPanel compact tone="subdued">
                <ShellPanelMeta>DETAIL</ShellPanelMeta>
                <div className="text-xs leading-snug mt-1" style={{ color: "#eef3ff" }}>
                  {active?.detail ?? "—"}
                </div>
              </ShellPanel>
            </>
          ) : (
            <KeyBindingsEditor
              cursor={cursor}
              setCursor={setCursor}
              capture={capture}
              setCapture={setCapture}
            />
          )}
        </div>

        <footer
          className="px-4 py-2 text-[10px] uppercase tracking-wider"
          style={{
            color: "rgba(168,200,232,0.6)",
            borderTop: "1px solid rgba(168,200,232,0.2)",
          }}
        >
          {capture
            ? "PRESS ANY KEY TO BIND · ESC CANCELS"
            : page === "main"
              ? "↑↓ MOVE · ←→ ADJUST · A / ENTER ACTIVATE · ESC CLOSE"
              : "↑↓ SELECT · ENTER REBIND PRIMARY · CLICK SLOT TO REBIND · ESC BACK"}
        </footer>
      </ShellPanel>
    </div>
  );
}

function KeyBindingsEditor({
  cursor,
  setCursor,
  capture,
  setCapture,
}: {
  cursor: number;
  setCursor: (i: number) => void;
  capture: { action: GameAction; slot: Slot } | null;
  setCapture: (c: { action: GameAction; slot: Slot } | null) => void;
}) {
  const [, force] = useState(0);
  useEffect(() => subscribeControls(() => force((n) => n + 1)), []);
  const c = getControls();

  return (
    <div className="flex flex-col gap-1">
      {ACTION_ORDER.map((a, i) => {
        const b = c.bindings[a];
        const selected = i === cursor;
        const isCapturingThis = capture?.action === a;
        return (
          <div
            key={a}
            onPointerEnter={() => setCursor(i)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded"
            style={{
              background: selected
                ? "rgba(232,200,144,0.10)"
                : "rgba(255,255,255,0.02)",
              border: selected
                ? "1px solid rgba(232,200,144,0.45)"
                : "1px solid rgba(168,200,232,0.18)",
            }}
          >
            <span
              className="text-xs"
              style={{ color: selected ? "#e8c890" : "#eef3ff", minWidth: 140 }}
            >
              {ACTION_LABEL[a]}
            </span>
            <div className="flex items-center gap-1.5">
              <SlotButton
                label={
                  isCapturingThis && capture?.slot === "primary"
                    ? "PRESS KEY…"
                    : keyLabel(b.primary)
                }
                active={isCapturingThis && capture?.slot === "primary"}
                onClick={() => setCapture({ action: a, slot: "primary" })}
                title="Click then press a key to set the primary binding"
              />
              <SlotButton
                label={
                  isCapturingThis && capture?.slot === "secondary"
                    ? "PRESS KEY…"
                    : b.secondary
                      ? keyLabel(b.secondary)
                      : "—"
                }
                active={isCapturingThis && capture?.slot === "secondary"}
                onClick={() => setCapture({ action: a, slot: "secondary" })}
                title="Click then press a key to set the secondary binding"
              />
              <button
                type="button"
                onClick={() => setBinding(a, b.primary, undefined)}
                disabled={!b.secondary}
                className="rounded px-2 py-1 text-[10px] uppercase"
                style={{
                  background: b.secondary
                    ? "rgba(216,74,74,0.18)"
                    : "rgba(0,0,0,0.25)",
                  color: b.secondary ? "#f0a8a8" : "rgba(168,200,232,0.4)",
                  border: b.secondary
                    ? "1px solid rgba(216,74,74,0.45)"
                    : "1px solid rgba(168,200,232,0.15)",
                  cursor: b.secondary ? "pointer" : "not-allowed",
                }}
                title="Clear secondary binding"
                aria-label={`Clear secondary binding for ${ACTION_LABEL[a]}`}
              >
                CLR
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotButton({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded px-2 py-1 text-[11px] font-mono"
      style={{
        minWidth: 72,
        background: active ? "rgba(232,200,144,0.22)" : "rgba(0,0,0,0.4)",
        color: active ? "#e8c890" : "#eef3ff",
        border: active
          ? "1px solid rgba(232,200,144,0.7)"
          : "1px solid rgba(168,200,232,0.35)",
      }}
    >
      {label}
    </button>
  );
}
