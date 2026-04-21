/**
 * Desktop presentation shell. Centers the Phaser host, renders the
 * shared shell dialogue tray below the canvas, and presents control
 * hints inside a compact subdued ShellPanel so the footer belongs to
 * the same shell-card family as the rest of the UI.
 */
import type { ReactNode } from "react";
import { GameDialogueTray } from "./shell/GameDialogueTray";
import { ShellPanel, ShellPanelMeta } from "./shell/ShellPanel";

type Props = {
  children: ReactNode;
  booted: boolean;
  error: string | null;
};

export function DesktopGameShell({ children, booted, error }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070d",
        color: "#eef3ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "monospace",
        padding: "12px 0",
      }}
    >
      <h1
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Hermetic Comedy — a pixel-art RPG of small verbs
      </h1>

      <div
        style={{
          width: "min(96vw, 720px)",
          aspectRatio: "160 / 144",
          imageRendering: "pixelated",
          border: "1px solid #2a3550",
          background: "#05070d",
          boxShadow: "0 0 60px rgba(74,120,200,0.15)",
        }}
      >
        {children}
      </div>

      <div style={{ width: "min(96vw, 720px)" }}>
        <GameDialogueTray />
      </div>

      <div style={{ width: "min(96vw, 720px)" }}>
        <ShellPanel tone="subdued" compact>
          <ShellPanelMeta>
            ARROWS / WASD MOVE · SPACE OR ENTER = A · B OR Q = WITNESS · L =
            LORE · P OR ESC = SETTINGS
          </ShellPanelMeta>
          {!booted && !error && (
            <div
              className="mt-1 text-[10px]"
              style={{ color: "#a8c8e8" }}
            >
              Loading the silver…
            </div>
          )}
          {error && (
            <div
              className="mt-1 text-[10px]"
              style={{ color: "#d86a6a" }}
            >
              Failed to load: {error}
            </div>
          )}
        </ShellPanel>
      </div>
    </div>
  );
}
