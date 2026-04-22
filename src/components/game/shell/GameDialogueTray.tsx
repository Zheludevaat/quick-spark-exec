/**
 * Shared shell-level dialogue tray. Used by BOTH desktop and touch
 * shells as the primary visible dialogue surface.
 *
 * In compact mode (iPhone landscape), the confirm hint shortens so the
 * tray can be safely overlaid on top of the gameplay viewport without
 * permanently shrinking it.
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
      <ShellPanel style={{ minHeight: compact ? 48 : 64 }}>
        <ShellPanelTitle>{dialog.speaker || "—"}</ShellPanelTitle>
        <div
          className={`leading-snug whitespace-pre-wrap ${compact ? "text-[11px]" : "text-xs"}`}
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
          {dialog.waitingForConfirm
            ? compact
              ? "TAP / A"
              : "▼ CLICK / TAP / A"
            : "…"}
        </div>
      </ShellPanel>
    </button>
  );
}
