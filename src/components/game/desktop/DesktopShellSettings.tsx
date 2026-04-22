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
import { DesktopSurfaceFrame } from "./DesktopSurfaceFrame";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
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
  up: "Move Up",
  down: "Move Down",
  left: "Move Left",
  right: "Move Right",
  action: "A / Confirm",
  cancel: "B / Witness",
  lore: "Lore Log",
  settings: "Settings",
  skip: "Skip Dialog",
  mute: "Mute Audio",
  lcd: "CRT Overlay",
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
  const [capture, setCapture] = useState<{
    action: GameAction;
    slot: Slot;
  } | null>(null);

  useEffect(() => subscribeControls(() => force((n) => n + 1)), []);
  useEffect(() => subscribeGameUi((s) => setScene(s.scene)), []);
  useEffect(() => {
    const id = window.setInterval(() => setAudioTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, []);
  void audioTick;

  const controls = getControls();
  const audio = getAudio();
  const canReturnToTitle = scene.key !== "Title" && scene.key !== "";

  const rows: Row[] = useMemo(() => {
    const cycleInterface = (dir: 1 | -1) => {
      const i = INTERFACE_ORDER.indexOf(controls.interfaceMode);
      setInterfaceMode(
        INTERFACE_ORDER[
          (i + dir + INTERFACE_ORDER.length) % INTERFACE_ORDER.length
        ],
      );
    };
    const cycleSize = (dir: 1 | -1) => {
      const i = BUTTON_SIZES.indexOf(controls.buttonSize);
      setButtonSize(
        BUTTON_SIZES[(i + dir + BUTTON_SIZES.length) % BUTTON_SIZES.length],
      );
    };
    const cycleLayout = (dir: 1 | -1) => {
      const i = TOUCH_LAYOUTS.indexOf(controls.touchLayout);
      setTouchLayout(
        TOUCH_LAYOUTS[
          (i + dir + TOUCH_LAYOUTS.length) % TOUCH_LAYOUTS.length
        ],
      );
    };
    const adjustVol = (dir: 1 | -1) => {
      const next = Math.max(0, Math.min(1, audio.volume + dir * 0.1));
      audio.setVolume(next);
      setAudioTick((n) => n + 1);
    };
    const adjustAuto = (dir: 1 | -1) => {
      setDialogAutoAdvance(controls.dialogAutoAdvanceMs + dir * 500);
    };
    const toggleMute = () => {
      audio.setMuted(!audio.muted);
      setAudioTick((n) => n + 1);
    };

    const list: Row[] = [
      {
        label: "Interface Mode",
        value: controls.interfaceMode === "desktop" ? "DESKTOP" : "TOUCH",
        detail:
          "Choose the desktop command frame or touch landscape interface.",
        onLeft: () => cycleInterface(-1),
        onRight: () => cycleInterface(1),
        onActivate: () => cycleInterface(1),
      },
      {
        label: "Volume",
        value: audio.muted ? "MUTED" : `${Math.round(audio.volume * 100)}%`,
        detail: "Master audio level.",
        onLeft: () => adjustVol(-1),
        onRight: () => adjustVol(1),
        onActivate: toggleMute,
      },
      {
        label: "Mute",
        value: audio.muted ? "ON" : "OFF",
        detail:
          "Silence all audio without changing your saved volume value.",
        onLeft: toggleMute,
        onRight: toggleMute,
        onActivate: toggleMute,
      },
      {
        label: "Auto Advance",
        value: fmtAuto(controls.dialogAutoAdvanceMs),
        detail:
          "0 means manual. Otherwise dialogue advances after the chosen delay.",
        onLeft: () => adjustAuto(-1),
        onRight: () => adjustAuto(1),
      },
      {
        label: "Left Handed",
        value: controls.leftHanded ? "ON" : "OFF",
        detail: "Mirror the touch-side control arrangement.",
        onLeft: () => setLeftHanded(!controls.leftHanded),
        onRight: () => setLeftHanded(!controls.leftHanded),
        onActivate: () => setLeftHanded(!controls.leftHanded),
      },
      {
        label: "Haptics",
        value: controls.haptics ? "ON" : "OFF",
        detail: "Short vibration on supported touch devices.",
        onLeft: () => setHaptics(!controls.haptics),
        onRight: () => setHaptics(!controls.haptics),
        onActivate: () => setHaptics(!controls.haptics),
      },
      {
        label: "Button Size",
        value: controls.buttonSize.toUpperCase(),
        detail: "On-screen control size for touch mode.",
        onLeft: () => cycleSize(-1),
        onRight: () => cycleSize(1),
      },
      {
        label: "Touch Layout",
        value: controls.touchLayout.toUpperCase(),
        detail: "Choose d-pad, swipe, hybrid, or off for touch mode.",
        onLeft: () => cycleLayout(-1),
        onRight: () => cycleLayout(1),
      },
      {
        label: "Reset Controls",
        value: "›",
        detail: "Restore bindings and layout defaults.",
        onActivate: () => resetControls(),
      },
    ];

    if (canReturnToTitle) {
      list.push({
        label: confirmQuit ? "Confirm Return to Title" : "Return to Title",
        value: "›",
        danger: true,
        detail: confirmQuit
          ? "Activate again to leave the run and return to title."
          : "Leave the current run and return to title.",
        onActivate: () => {
          if (!confirmQuit) {
            setConfirmQuit(true);
            return;
          }
          returnToTitle();
        },
      });
    }

    return list;
  }, [controls, audio, canReturnToTitle, confirmQuit]);

  useEffect(() => {
    const max = page === "main" ? rows.length : ACTION_ORDER.length;
    setCursor((c) => Math.min(c, Math.max(0, max - 1)));
  }, [rows.length, page]);

  useEffect(() => {
    if (page !== "main") {
      if (confirmQuit) setConfirmQuit(false);
      return;
    }
    const active = rows[cursor];
    if (!active || !active.label.toLowerCase().includes("return to title")) {
      if (confirmQuit) setConfirmQuit(false);
    }
  }, [page, cursor, rows, confirmQuit]);

  const move = useCallback(
    (dir: 1 | -1) => {
      const max = page === "main" ? rows.length : ACTION_ORDER.length;
      if (max <= 0) return;
      setCursor((c) => (c + dir + max) % max);
    },
    [page, rows.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (capture) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "Escape") {
          setCapture(null);
          return;
        }

        if (
          (e.key === "Backspace" || e.key === "Delete") &&
          capture.slot === "secondary"
        ) {
          const cur = getControls().bindings[capture.action];
          setBinding(capture.action, cur.primary, undefined);
          setCapture(null);
          return;
        }

        const normalized = normalizeKeyEvent(e);
        if (!normalized) return;

        const cur = getControls().bindings[capture.action];
        if (capture.slot === "primary") {
          setBinding(capture.action, normalized, cur.secondary);
        } else {
          setBinding(capture.action, cur.primary, normalized);
        }
        setCapture(null);
        return;
      }

      if (e.key === "Escape") {
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

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        e.stopPropagation();
        move(-1);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        e.stopPropagation();
        move(1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "main") rows[cursor]?.onLeft?.();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "main") rows[cursor]?.onRight?.();
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (page === "main") {
          rows[cursor]?.onActivate?.();
        } else {
          const action = ACTION_ORDER[cursor];
          if (action) setCapture({ action, slot: "primary" });
        }
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, {
        capture: true,
      } as EventListenerOptions);
  }, [capture, page, rows, cursor, move]);

  const active = page === "main" ? rows[cursor] : null;

  const rail = (
    <div className="flex h-full flex-col gap-2">
      <div>
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "#e8c890" }}
        >
          Settings
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: "#a8c8e8" }}>
          {scene.label || "—"}
          {scene.zone ? ` · ${scene.zone}` : ""}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setPage("main");
          setCursor(0);
        }}
        className="w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wider"
        style={{
          background:
            page === "main"
              ? "linear-gradient(180deg, rgba(74,120,200,0.95), rgba(42,53,80,0.95))"
              : "linear-gradient(180deg, rgba(20,28,48,0.95), rgba(8,12,24,0.95))",
          color: "#eef3ff",
          border:
            page === "main"
              ? "1px solid rgba(232,200,144,0.55)"
              : "1px solid rgba(168,200,232,0.35)",
        }}
      >
        System
      </button>

      <button
        type="button"
        onClick={() => {
          setPage("keys");
          setCursor(0);
        }}
        className="w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wider"
        style={{
          background:
            page === "keys"
              ? "linear-gradient(180deg, rgba(74,120,200,0.95), rgba(42,53,80,0.95))"
              : "linear-gradient(180deg, rgba(20,28,48,0.95), rgba(8,12,24,0.95))",
          color: "#eef3ff",
          border:
            page === "keys"
              ? "1px solid rgba(232,200,144,0.55)"
              : "1px solid rgba(168,200,232,0.35)",
        }}
      >
        Key Bindings
      </button>
    </div>
  );

  return (
    <DesktopSurfaceFrame
      title="Settings"
      subtitle={`${scene.label || "—"}${scene.zone ? ` · ${scene.zone}` : ""}`}
      onClose={close}
      rail={rail}
      footer={
        capture
          ? "Press any key to bind · Esc cancels · Delete clears alt slot"
          : page === "main"
            ? "↑↓ move · ←→ adjust · Enter activate · Esc close"
            : "↑↓ select · Enter rebind primary · click slot to rebind · Esc back"
      }
    >
      {page === "main" ? (
        <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-4">
          <ul className="space-y-1">
            {rows.map((row, i) => {
              const selected = i === cursor;
              return (
                <li key={row.label}>
                  <button
                    type="button"
                    onPointerEnter={() => setCursor(i)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setCursor(i);
                      row.onActivate?.();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded text-left"
                    style={{
                      background: selected
                        ? row.danger
                          ? "rgba(216,74,74,0.14)"
                          : "rgba(232,200,144,0.12)"
                        : "rgba(255,255,255,0.02)",
                      border: selected
                        ? row.danger
                          ? "1px solid rgba(216,74,74,0.55)"
                          : "1px solid rgba(232,200,144,0.45)"
                        : "1px solid rgba(168,200,232,0.18)",
                      color: selected
                        ? row.danger
                          ? "#f0a8a8"
                          : "#e8c890"
                        : "#eef3ff",
                    }}
                  >
                    <span>{row.label}</span>
                    <span
                      style={{
                        color: selected
                          ? row.danger
                            ? "#f0a8a8"
                            : "#e8c890"
                          : "#a8c8e8",
                        opacity: 0.95,
                      }}
                    >
                      {row.value}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <ShellPanel compact tone="subdued">
            <ShellPanelTitle>Detail</ShellPanelTitle>
            <div
              className="text-xs leading-snug"
              style={{ color: "#eef3ff" }}
            >
              {active?.detail ?? "—"}
            </div>
          </ShellPanel>
        </div>
      ) : (
        <KeyBindingsEditor
          cursor={cursor}
          setCursor={setCursor}
          capture={capture}
          setCapture={setCapture}
        />
      )}
    </DesktopSurfaceFrame>
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
  setCapture: (next: { action: GameAction; slot: Slot } | null) => void;
}) {
  const [, force] = useState(0);

  useEffect(() => subscribeControls(() => force((n) => n + 1)), []);
  const controls = getControls();

  return (
    <div className="flex flex-col gap-2">
      {ACTION_ORDER.map((action, i) => {
        const binding = controls.bindings[action];
        const selected = i === cursor;
        const capturingThis = capture?.action === action;

        return (
          <div
            key={action}
            onPointerEnter={() => setCursor(i)}
            className="flex items-center justify-between gap-3 rounded px-3 py-2"
            style={{
              background: selected
                ? "rgba(232,200,144,0.10)"
                : "rgba(255,255,255,0.02)",
              border: selected
                ? "1px solid rgba(232,200,144,0.45)"
                : "1px solid rgba(168,200,232,0.18)",
            }}
          >
            <div
              className="text-xs"
              style={{
                color: selected ? "#e8c890" : "#eef3ff",
                minWidth: 150,
              }}
            >
              {ACTION_LABEL[action]}
            </div>

            <div className="flex items-center gap-2">
              <SlotButton
                label={
                  capturingThis && capture?.slot === "primary"
                    ? "PRESS KEY…"
                    : keyLabel(binding.primary)
                }
                active={capturingThis && capture?.slot === "primary"}
                onClick={() => setCapture({ action, slot: "primary" })}
              />
              <SlotButton
                label={
                  capturingThis && capture?.slot === "secondary"
                    ? "PRESS KEY…"
                    : binding.secondary
                      ? keyLabel(binding.secondary)
                      : "SET ALT"
                }
                active={capturingThis && capture?.slot === "secondary"}
                onClick={() => setCapture({ action, slot: "secondary" })}
              />
              <button
                type="button"
                onClick={() =>
                  setBinding(action, binding.primary, undefined)
                }
                disabled={!binding.secondary}
                className="rounded px-2 py-1 text-[10px] uppercase"
                style={{
                  background: binding.secondary
                    ? "rgba(216,74,74,0.18)"
                    : "rgba(0,0,0,0.25)",
                  color: binding.secondary
                    ? "#f0a8a8"
                    : "rgba(168,200,232,0.4)",
                  border: binding.secondary
                    ? "1px solid rgba(216,74,74,0.45)"
                    : "1px solid rgba(168,200,232,0.15)",
                  cursor: binding.secondary ? "pointer" : "not-allowed",
                }}
              >
                CLR
              </button>
            </div>
          </div>
        );
      })}

      <ShellPanel compact tone="subdued">
        <ShellPanelMeta>Capture</ShellPanelMeta>
        <div className="text-xs mt-1" style={{ color: "#eef3ff" }}>
          {capture
            ? `Press a key for ${ACTION_LABEL[capture.action]} (${capture.slot === "primary" ? "primary" : "alt"}).`
            : "Select a slot to begin rebinding."}
        </div>
      </ShellPanel>
    </div>
  );
}

function SlotButton({
  label,
  active,
  onClick,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded px-2 py-1 text-[11px] font-mono"
      style={{
        minWidth: 84,
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
