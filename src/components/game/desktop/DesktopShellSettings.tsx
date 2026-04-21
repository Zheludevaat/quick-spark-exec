/**
 * Desktop shell settings panel.
 *
 * Owns the rendering of the settings modal on the desktop shell. Reads
 * and mutates the same controls/audio singletons the canvas settings
 * scene uses, so prefs persist identically.
 *
 * Also supports RETURN TO TITLE through the active scene's guarded
 * shell action, keeping desktop parity with the canvas settings menu.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getControls,
  setButtonSize,
  setHaptics,
  setLeftHanded,
  setDialogAutoAdvance,
  setInterfaceMode,
  setTouchLayout,
  resetControls,
  subscribeControls,
  keyLabel,
  type ButtonSize,
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
  const [cursor, setCursor] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  // Re-render on controls and audio mutations.
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

    if (c.interfaceMode === "touch_landscape") {
      list.push(
        {
          label: "BUTTON SIZE",
          value: c.buttonSize.toUpperCase(),
          detail: "Size of the on-screen A/B + d-pad buttons.",
          onLeft: () => cycleSize(-1),
          onRight: () => cycleSize(1),
        },
        {
          label: "TOUCH LAYOUT",
          value: c.touchLayout.toUpperCase(),
          detail: "Choose between d-pad, swipe gestures, hybrid, or none.",
          onLeft: () => cycleLayout(-1),
          onRight: () => cycleLayout(1),
        },
      );
    }

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
      detail: "Restore all bindings, audio, and layout settings to defaults.",
      onActivate: () => resetControls(),
    });

    return list;
  }, [c, audio, canReturnToTitle, confirmQuit]);

  // Clamp cursor when row count shrinks.
  useEffect(() => {
    setCursor((cur) => Math.min(cur, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  // Reset confirm-quit state if cursor moves away from the row.
  useEffect(() => {
    const active = rows[cursor];
    if (!active || !active.label.includes("RETURN TO TITLE")) {
      if (confirmQuit) setConfirmQuit(false);
    }
  }, [cursor, rows, confirmQuit]);

  const move = useCallback(
    (dir: 1 | -1) => {
      setCursor((cur) => (cur + dir + rows.length) % rows.length);
    },
    [rows.length],
  );

  // Keyboard handling. We capture before Phaser sees the key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape" || k === "p" || k === "P") {
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
        rows[cursor]?.onLeft?.();
        return;
      }
      if (k === "ArrowRight" || k === "d" || k === "D") {
        e.preventDefault();
        e.stopPropagation();
        rows[cursor]?.onRight?.();
        return;
      }
      if (k === " " || k === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        rows[cursor]?.onActivate?.();
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [cursor, rows, move]);

  const active = rows[cursor];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center font-mono"
      style={{
        background: "rgba(0,0,0,0.78)",
      }}
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
          <ShellPanelTitle style={{ marginBottom: 0 }}>SETTINGS</ShellPanelTitle>
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
        </header>
        <div
          className="overflow-y-auto px-4 py-3 grid gap-3 text-xs"
          style={{ flex: 1, gridTemplateColumns: "1fr" }}
        >
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
                    style={{
                      background: bg,
                      border,
                      color,
                    }}
                  >
                    <span>{r.label}</span>
                    <span
                      style={{
                        color: valueColor,
                        opacity: 0.9,
                      }}
                    >
                      {r.value}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <ShellPanel compact tone="subdued">
            <ShellPanelMeta>DETAIL</ShellPanelMeta>
            <div
              className="text-xs leading-snug mt-1"
              style={{ color: "#eef3ff" }}
            >
              {active?.detail ?? "—"}
            </div>
          </ShellPanel>
          <KeyBindingsReadout />
        </div>
        <footer
          className="px-4 py-2 text-[10px] uppercase tracking-wider"
          style={{
            color: "rgba(168,200,232,0.6)",
            borderTop: "1px solid rgba(168,200,232,0.2)",
          }}
        >
          ↑↓ MOVE · ←→ ADJUST · A / ENTER ACTIVATE · ESC CLOSE
        </footer>
      </ShellPanel>
    </div>
  );
}

function KeyBindingsReadout() {
  const [, force] = useState(0);
  useEffect(() => subscribeControls(() => force((n) => n + 1)), []);
  const c = getControls();
  const items: { label: string; key: string }[] = [
    { label: "Move", key: "WASD / Arrows" },
    {
      label: "A / Confirm",
      key: `${keyLabel(c.bindings.action.primary)}${c.bindings.action.secondary ? " / " + keyLabel(c.bindings.action.secondary) : ""}`,
    },
    {
      label: "B / Witness",
      key: `${keyLabel(c.bindings.cancel.primary)}${c.bindings.cancel.secondary ? " / " + keyLabel(c.bindings.cancel.secondary) : ""}`,
    },
    { label: "Lore log", key: keyLabel(c.bindings.lore.primary) },
    { label: "Settings", key: keyLabel(c.bindings.settings.primary) },
    { label: "Skip dialog", key: keyLabel(c.bindings.skip.primary) },
  ];
  return (
    <ShellPanel compact tone="subdued">
      <ShellPanelMeta>KEY BINDINGS (READ-ONLY)</ShellPanelMeta>
      <ul
        className="text-xs mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5"
        style={{ color: "#eef3ff" }}
      >
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between">
            <span style={{ color: "#a8c8e8" }}>{it.label}</span>
            <span style={{ color: "#e8c890" }}>{it.key}</span>
          </li>
        ))}
      </ul>
    </ShellPanel>
  );
}
