/**
 * Shared shell-level dialogue tray. Used by BOTH desktop and touch
 * shells as the primary visible dialogue surface. The in-canvas Phaser
 * dialog box is no longer rendered (see runDialog in hud.ts).
 *
 * Mirrors dialog state from gameUiBridge. Pointerdown pulses the
 * virtual A action so click/tap advances dialogue in either mode.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type DialogSnapshot,
} from "@/game/gameUiBridge";
import { pulseVirtual } from "@/game/virtualInput";
import { ShellPanel, ShellPanelTitle } from "@/components/game/shell/ShellPanel";

export function GameDialogueTray() {
  const [dialog, setDialog] = useState<DialogSnapshot>(
    () => getGameUiSnapshot().dialog,
  );

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
      className="block w-full text-left select-none touch-none font-mono"
      aria-label="Dialogue tray. Click or tap to advance."
      style={{ background: "transparent", padding: 0, border: 0 }}
    >
      <ShellPanel style={{ minHeight: 64 }}>
        <ShellPanelTitle>{dialog.speaker || "—"}</ShellPanelTitle>
        <div
          className="text-xs leading-snug whitespace-pre-wrap"
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
          style={{
            color: dialog.waitingForConfirm
              ? "#e8c890"
              : "rgba(200,210,230,0.4)",
          }}
        >
          {dialog.waitingForConfirm ? "▼ CLICK / TAP / A" : "…"}
        </div>
      </ShellPanel>
    </button>
  );
}
