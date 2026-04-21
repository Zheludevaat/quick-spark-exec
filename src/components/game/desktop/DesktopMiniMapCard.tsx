/**
 * Desktop minimap card — schematic node graph with optional player marker.
 * Mirrors the visual language of TouchMiniMapPanel but sized for the
 * desktop bottom dock.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

export function DesktopMiniMapCard() {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    return subscribeGameUi((s) => setScene(s.scene));
  }, []);

  const hasNodes = !!scene.nodes && scene.nodes.length > 0;
  const marker = scene.marker;

  return (
    <ShellPanel compact>
      <div className="flex items-center justify-between">
        <ShellPanelTitle>MAP</ShellPanelTitle>
        <ShellPanelMeta>ACT {scene.act || "—"}</ShellPanelMeta>
      </div>

      <div className="text-[10px] font-mono mt-0.5" style={{ color: "#eef3ff" }}>
        {scene.label || "—"}
      </div>
      {scene.zone && (
        <div className="text-[9px] font-mono" style={{ color: "#a8c8e8" }}>
          {scene.zone}
        </div>
      )}

      <div
        className="relative mt-2 rounded"
        style={{
          aspectRatio: "5 / 3",
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(168,200,232,0.25)",
          overflow: "hidden",
        }}
      >
        {hasNodes ? (
          <>
            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {scene.nodes!.map((n, i) => {
                const next = scene.nodes![i + 1];
                if (!next) return null;
                return (
                  <line
                    key={`${n.id}-${next.id}`}
                    x1={n.x * 100}
                    y1={n.y * 100}
                    x2={next.x * 100}
                    y2={next.y * 100}
                    stroke="rgba(168,200,232,0.35)"
                    strokeWidth={0.6}
                    strokeDasharray="2 2"
                  />
                );
              })}
            </svg>
            {scene.nodes!.map((n) => (
              <div
                key={n.id}
                className="absolute rounded-full"
                style={{
                  left: `${n.x * 100}%`,
                  top: `${n.y * 100}%`,
                  width: 8,
                  height: 8,
                  transform: "translate(-50%, -50%)",
                  background: n.active ? "#e8c890" : "#a8c8e8",
                  boxShadow: n.active
                    ? "0 0 8px rgba(232,200,144,0.7)"
                    : "0 0 4px rgba(168,200,232,0.5)",
                  border: "1px solid rgba(0,0,0,0.6)",
                }}
                title={n.label}
              />
            ))}
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs font-mono"
            style={{ color: "rgba(168,200,232,0.5)" }}
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
              transform: "translate(-50%, -50%)",
              background: "#eef3ff",
              boxShadow: "0 0 6px rgba(238,243,255,0.9)",
            }}
          />
        )}
      </div>
    </ShellPanel>
  );
}
