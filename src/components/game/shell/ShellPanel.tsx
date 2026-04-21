/**
 * Shared visual primitive for the React/DOM shell layer around the
 * Phaser canvas. Encapsulates the dialogue-tray look (dark blue-black
 * gradient, pale blue border, soft glow, inset rim).
 *
 * Use for: dialogue tray, minimap card, inventory cards, rotate
 * advisory, and any other shell-level info panels.
 *
 * Do NOT use this for in-canvas Phaser GBC boxes — those keep their
 * retro 160×144 treatment.
 */
import type { CSSProperties, ReactNode } from "react";

type Tone = "default" | "accent" | "danger" | "subdued";

type Props = {
  children: ReactNode;
  tone?: Tone;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

function toneStyle(tone: Tone): CSSProperties {
  switch (tone) {
    case "accent":
      return {
        border: "1px solid rgba(232,200,144,0.55)",
        boxShadow:
          "0 0 14px rgba(232,200,144,0.18), inset 0 0 0 1px rgba(0,0,0,0.4)",
      };
    case "danger":
      return {
        border: "1px solid rgba(216,106,106,0.55)",
        boxShadow:
          "0 0 14px rgba(216,106,106,0.18), inset 0 0 0 1px rgba(0,0,0,0.4)",
      };
    case "subdued":
      return {
        border: "1px solid rgba(120,145,175,0.4)",
        boxShadow:
          "0 0 10px rgba(74,120,200,0.12), inset 0 0 0 1px rgba(0,0,0,0.4)",
      };
    default:
      return {
        border: "1px solid rgba(168,200,232,0.55)",
        boxShadow:
          "0 0 12px rgba(74,120,200,0.22), inset 0 0 0 1px rgba(0,0,0,0.4)",
      };
  }
}

export function ShellPanel({
  children,
  tone = "default",
  compact = false,
  className,
  style,
}: Props) {
  return (
    <div
      className={`rounded-md font-mono ${compact ? "px-2 py-1.5" : "px-3 py-2"} ${className ?? ""}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(8,14,28,0.96), rgba(4,8,18,0.96))",
        color: "#eef3ff",
        ...toneStyle(tone),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ShellPanelTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="text-[10px] uppercase tracking-wider mb-1"
      style={{ color: "#e8c890", ...style }}
    >
      {children}
    </div>
  );
}

export function ShellPanelMeta({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="text-[9px] uppercase tracking-wider opacity-80"
      style={{ color: "#a8c8e8", ...style }}
    >
      {children}
    </div>
  );
}

export function ShellPanelBody({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="text-xs leading-snug"
      style={{ color: "#eef3ff", ...style }}
    >
      {children}
    </div>
  );
}
