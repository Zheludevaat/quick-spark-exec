/**
 * Shared shell-level dialogue tray. Used by BOTH desktop and touch
 * shells as the primary visible dialogue surface.
 *
 * In compact mode (iPhone landscape), the tray gets a hard height cap
 * and scrolls internally so long lines can no longer crowd the
 * gameplay viewport. Inner pointer events are stopped from bubbling
 * so the user can scroll without accidentally advancing the dialogue.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type DialogSnapshot,
} from "@/game/gameUiBridge";
import { pulseVirtual } from "@/game/virtualInput";
import { ShellPanel, ShellPanelTitle } from "@/components/game/shell/ShellPanel";

type Props = {
  compact?: boolean;
};

export function GameDialogueTray({ compact = false }: Props) {
  const [dialog, setDialog] = useState<DialogSnapshot>(
    () => getGameUiSnapshot().dialog,
  );

  useEffect(() => {
    return subscribeGameUi((s) => setDialog(s.dialog));
  }, []);

  if (!dialog.open) return null;

  if (!compact) {
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
            className="leading-snug whitespace-pre-wrap text-xs"
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

  // Compact: capped height + internal scroll. Tap outside scroll area advances.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Dialogue tray. Tap to advance."
      onPointerDown={(e) => {
        pulseVirtual("action");
        e.preventDefault();
      }}
      className="block w-full text-left select-none font-mono"
      style={{ background: "transparent", padding: 0, border: 0 }}
    >
      <ShellPanel style={{ maxHeight: "100%" }}>
        <ShellPanelTitle>{dialog.speaker || "—"}</ShellPanelTitle>
        <div
          className="leading-snug whitespace-pre-wrap text-[11px] overflow-y-auto"
          style={{
            color: "#eef3ff",
            maxHeight: "22vh",
            touchAction: "pan-y",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
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
          {dialog.waitingForConfirm ? "TAP / A" : "…"}
        </div>
      </ShellPanel>
    </div>
  );
}
