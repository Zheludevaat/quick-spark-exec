/**
 * Desktop presentation shell. Centers the Phaser host and shows a small
 * footer with control hints. This preserves the prior route layout.
 */
import type { ReactNode } from "react";

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

      <footer
        style={{
          fontSize: 10,
          opacity: 0.6,
          textAlign: "center",
          padding: "0 16px",
          maxWidth: 720,
        }}
      >
        Arrow keys / WASD · Space or Enter = A · B or Q = witness · L = lore · P
        or Esc = settings · Tap ≡ on touch
        {!booted && !error && <div style={{ marginTop: 4 }}>Loading the silver…</div>}
        {error && (
          <div style={{ marginTop: 4, color: "#d86a6a" }}>Failed to load: {error}</div>
        )}
      </footer>
    </div>
  );
}
