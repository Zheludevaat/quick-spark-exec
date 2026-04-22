/**
 * Desktop top crown bar. Shows live stats on the left, scene context on
 * the right, and a transient SAVED pill when the bridge bumps savedAt.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import { ShellPanel, ShellPanelMeta } from "@/components/game/shell/ShellPanel";

const STAT_GLYPH: Record<"clarity" | "compassion" | "courage", string> = {
  clarity: "◇",
  compassion: "♡",
  courage: "▲",
};

const STAT_COLOR: Record<"clarity" | "compassion" | "courage", string> = {
  clarity: "#a8c8e8",
  compassion: "#e8a8c8",
  courage: "#e8c890",
};

export function DesktopStatsBar() {
  const [hud, setHud] = useState(() => getGameUiSnapshot().hud);
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    return subscribeGameUi((s) => {
      setHud(s.hud);
      setScene(s.scene);
    });
  }, []);

  useEffect(() => {
    if (!hud.savedAt) return;
    setSavedFlash(true);
    const t = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [hud.savedAt]);

  return (
    <ShellPanel compact>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {(["clarity", "compassion", "courage"] as const).map((k) => (
            <div
              key={k}
              className="flex items-baseline gap-1 text-xs font-mono"
              style={{ color: STAT_COLOR[k] }}
            >
              <span style={{ fontSize: 14 }}>{STAT_GLYPH[k]}</span>
              <span style={{ color: "#eef3ff", fontWeight: 600 }}>
                {hud.stats[k]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ShellPanelMeta>{getPublicChapterTitle(scene.key)}</ShellPanelMeta>
          <div className="text-xs font-mono" style={{ color: "#eef3ff" }}>
            {getPublicSceneLabel(scene.key)}
            {scene.zone ? (
              <span style={{ color: "#a8c8e8" }}> · {scene.zone}</span>
            ) : null}
          </div>
          {savedFlash && (
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono"
              style={{
                background: "rgba(232,200,144,0.18)",
                color: "#e8c890",
                border: "1px solid rgba(232,200,144,0.45)",
              }}
            >
              SAVED
            </span>
          )}
        </div>
      </div>
    </ShellPanel>
  );
}
