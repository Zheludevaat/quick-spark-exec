/**
 * Minimap panel — Tier 3 fallback with optional Tier 2 nodes.
 *
 * - Always shows act + scene label so the panel is never empty.
 * - If the scene publishes nodes via setSceneSnapshot, renders them as
 *   a schematic in the panel area.
 * - Player marker dot if scene publishes one.
 *
 * Visual chrome comes from the shared ShellPanel primitive so the
 * minimap belongs to the same shell-card family as the dialogue tray
 * and inventory cards.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type SceneSnapshot,
} from "@/game/gameUiBridge";
import {
  ShellPanel,
  ShellPanelMeta,
} from "@/components/game/shell/ShellPanel";

export function TouchMiniMapPanel() {
  const [scene, setScene] = useState<SceneSnapshot>(
    () => getGameUiSnapshot().scene,
  );

  useEffect(() => subscribeGameUi((s) => setScene(s.scene)), []);

  const hasNodes = !!scene.nodes && scene.nodes.length > 0;
  const marker = scene.marker;

  return (
    <ShellPanel compact tone="subdued" style={{ width: "100%" }}>
      <ShellPanelMeta style={{ marginBottom: 4 }}>
        ACT {scene.act || "—"}
      </ShellPanelMeta>
      <div
        className="text-[10px] mb-1 leading-tight truncate"
        style={{ color: "#eef3ff" }}
      >
        {scene.label || "—"}
      </div>
      {scene.zone && (
        <div
          className="text-[9px] uppercase tracking-wider mb-1.5 truncate"
          style={{ color: "#e8c890", opacity: 0.85 }}
        >
          {scene.zone}
        </div>
      )}
      <div
        className="relative rounded-sm"
        style={{
          aspectRatio: "5 / 3",
          background:
            "repeating-linear-gradient(45deg, rgba(74,120,200,0.08) 0 2px, transparent 2px 6px)",
          border: "1px solid rgba(168,200,232,0.25)",
        }}
      >
        {hasNodes ? (
          <>
            {scene.nodes!.map((n, i) => {
              const next = scene.nodes![i + 1];
              if (!next) return null;
              return (
                <svg
                  key={`l-${n.id}`}
                  className="absolute inset-0 pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1={n.x * 100}
                    y1={n.y * 100}
                    x2={next.x * 100}
                    y2={next.y * 100}
                    stroke="rgba(168,200,232,0.4)"
                    strokeWidth="0.6"
                    strokeDasharray="2,2"
                  />
                </svg>
              );
            })}
            {scene.nodes!.map((n) => (
              <div
                key={n.id}
                className="absolute rounded-full"
                style={{
                  left: `${n.x * 100}%`,
                  top: `${n.y * 100}%`,
                  width: 8,
                  height: 8,
                  transform: "translate(-50%,-50%)",
                  background: n.active ? "#e8c890" : "#4a78c8",
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow: n.active ? "0 0 6px #e8c890" : "none",
                }}
                title={n.label}
              />
            ))}
          </>
        ) : (
          <div
            className="absolute inset-0 grid place-items-center text-[10px] opacity-60"
            style={{ color: "#a8c8e8" }}
          >
            ◇
          </div>
        )}
        {marker && (
          <div
            className="absolute rounded-full"
            style={{
              left: `${marker.x * 100}%`,
              top: `${marker.y * 100}%`,
              width: 6,
              height: 6,
              transform: "translate(-50%,-50%)",
              background: "#fff",
              boxShadow: "0 0 4px #fff, 0 0 8px #a8c8e8",
            }}
          />
        )}
      </div>
    </ShellPanel>
  );
}
