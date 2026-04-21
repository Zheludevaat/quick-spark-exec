/**
 * Top stats strip for touch landscape mode.
 * Reads HUD snapshot (clarity / compassion / courage + saved indicator)
 * from the gameUiBridge.
 */
import { useEffect, useState } from "react";
import { subscribeGameUi, getGameUiSnapshot, type HudSnapshot, type SceneSnapshot } from "@/game/gameUiBridge";

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

export function TouchStatsStrip() {
  const [hud, setHud] = useState<HudSnapshot>(() => getGameUiSnapshot().hud);
  const [scene, setScene] = useState<SceneSnapshot>(() => getGameUiSnapshot().scene);
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
    <div
      className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md font-mono text-xs"
      style={{
        background: "linear-gradient(180deg, rgba(20,28,48,0.92), rgba(8,12,24,0.92))",
        border: "1px solid rgba(74,120,200,0.45)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        color: "#eef3ff",
      }}
    >
      <div className="flex items-center gap-3">
        {(["clarity", "compassion", "courage"] as const).map((k) => (
          <div key={k} className="flex items-center gap-1">
            <span style={{ color: STAT_COLOR[k] }}>{STAT_GLYPH[k]}</span>
            <span className="tabular-nums" style={{ color: "#fff" }}>
              {hud.stats[k]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(200,210,230,0.85)" }}>
        <span style={{ color: "rgba(200,210,230,0.55)" }}>
          ACT {scene.act || "—"}
        </span>
        <span className="truncate max-w-[40vw]">{scene.label || ""}</span>
        {savedFlash && (
          <span
            className="px-1.5 py-0.5 rounded"
            style={{ background: "#e0c060", color: "#1a1a1a" }}
          >
            SAVED
          </span>
        )}
      </div>
    </div>
  );
}
