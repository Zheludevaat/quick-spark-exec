/**
 * Dialogue tray for touch landscape mode.
 *
 * Mirrors dialog state from gameUiBridge. The tray is the *primary*
 * dialogue surface in touch mode (in-canvas dialog box is suppressed in
 * runDialog). Tapping the tray pulses the virtual A action so the player
 * can advance without reaching for the right rail.
 */
import { useEffect, useState } from "react";
import { subscribeGameUi, getGameUiSnapshot, type DialogSnapshot } from "@/game/gameUiBridge";
import { pulseVirtual } from "@/game/virtualInput";

export function TouchDialogueTray() {
  const [dialog, setDialog] = useState<DialogSnapshot>(() => getGameUiSnapshot().dialog);

  useEffect(() => {
    return subscribeGameUi((s) => setDialog(s.dialog));
  }, []);

  if (!dialog.open) return null;

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        pulseVirtual("action");
        e.preventDefault();
      }}
      className="block w-full text-left select-none touch-none rounded-md px-3 py-2 font-mono text-xs"
      aria-label="Dialogue tray. Tap to advance."
      style={{
        background:
          "linear-gradient(180deg, rgba(8,14,28,0.96), rgba(4,8,18,0.96))",
        border: "1px solid rgba(168,200,232,0.55)",
        boxShadow: "0 -2px 14px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.4)",
        color: "#eef3ff",
        minHeight: 64,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider mb-1"
        style={{ color: "#e8c890" }}
      >
        {dialog.speaker || "—"}
      </div>
      <div
        className="leading-snug whitespace-pre-wrap"
        style={{ color: "#eef3ff" }}
      >
        {dialog.text}
        {dialog.typing && (
          <span
            className="inline-block ml-0.5 align-baseline"
            style={{ color: "#a8c8e8" }}
          >
            ▍
          </span>
        )}
      </div>
      <div
        className="mt-1 flex justify-end text-[10px]"
        style={{ color: dialog.waitingForConfirm ? "#e8c890" : "rgba(200,210,230,0.4)" }}
      >
        {dialog.waitingForConfirm ? "▼ TAP / A" : "…"}
      </div>
    </button>
  );
}
