/**
 * Top stats strip for touch landscape mode.
 *
 * Reads HUD snapshot (clarity / compassion / courage + saved indicator)
 * from the gameUiBridge. In compact mode (iPhone landscape), drops the
 * chapter label and uses tighter padding so it can be safely overlaid on
 * top of the gameplay viewport without stealing a permanent row.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type HudSnapshot,
  type SceneSnapshot,
} from "@/game/gameUiBridge";
import {
  getPublicSceneLabel,
  getPublicChapterTitle,
} from "@/game/canon/registry";

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

type Props = {
  compact?: boolean;
};

export function TouchStatsStrip({ compact = false }: Props) {
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

  const chapter = getPublicChapterTitle(scene.key);
  const sceneLabel = getPublicSceneLabel(scene.key);
  const rightLabel = compact ? scene.zone || sceneLabel : sceneLabel;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md font-mono ${
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      }`}
      style={{
        background: "linear-gradient(180deg, rgba(20,28,48,0.92), rgba(8,12,24,0.92))",
        border: "1px solid rgba(74,120,200,0.45)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        color: "#eef3ff",
      }}
    >
      <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
        {(["clarity", "compassion", "courage"] as const).map((k) => (
          <div key={k} className="flex items-center gap-1">
            <span style={{ color: STAT_COLOR[k] }}>{STAT_GLYPH[k]}</span>
            <span className="tabular-nums" style={{ color: "#fff" }}>
              {hud.stats[k]}
            </span>
          </div>
        ))}
      </div>
      <div
        className={`flex items-center gap-2 ${compact ? "text-[9px]" : "text-[10px]"}`}
        style={{ color: "rgba(200,210,230,0.85)" }}
      >
        {!compact && (
          <span style={{ color: "rgba(200,210,230,0.55)" }}>{chapter}</span>
        )}
        <span className={`truncate ${compact ? "max-w-[48vw]" : "max-w-[40vw]"}`}>
          {rightLabel}
        </span>
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
