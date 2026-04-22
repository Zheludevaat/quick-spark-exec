import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type SceneNode,
} from "@/game/gameUiBridge";
import { getPublicSceneLabel, getPublicChapterTitle } from "@/game/canon/registry";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

const TITLE_FALLBACK_NODES: SceneNode[] = [
  { id: "moon", label: "Moon", x: 0.12, y: 0.52 },
  { id: "mercury", label: "Mercury", x: 0.24, y: 0.52 },
  { id: "venus", label: "Venus", x: 0.36, y: 0.52 },
  { id: "sun", label: "Sun", x: 0.5, y: 0.5 },
  { id: "mars", label: "Mars", x: 0.64, y: 0.52 },
  { id: "jupiter", label: "Jupiter", x: 0.78, y: 0.52 },
  { id: "saturn", label: "Saturn", x: 0.9, y: 0.52 },
];

const METAXY_FALLBACK_NODES: SceneNode[] = [
  { id: "moon", label: "Moon", x: 0.5, y: 0.92 },
  { id: "mercury", label: "Mercury", x: 0.4, y: 0.78 },
  { id: "venus", label: "Venus", x: 0.6, y: 0.64 },
  { id: "sun", label: "Sun", x: 0.5, y: 0.5 },
  { id: "mars", label: "Mars", x: 0.38, y: 0.36 },
  { id: "jupiter", label: "Jupiter", x: 0.62, y: 0.22 },
  { id: "saturn", label: "Saturn", x: 0.5, y: 0.08 },
];

export function DesktopMapDock() {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    return subscribeGameUi((s) => setScene(s.scene));
  }, []);

  const isHub = scene.key === "MetaxyHub";

  const nodes =
    scene.nodes && scene.nodes.length > 0
      ? scene.nodes
      : isHub
        ? METAXY_FALLBACK_NODES
        : scene.key === "Title"
          ? TITLE_FALLBACK_NODES
          : null;

  const activeNode = nodes?.find((n) => n.active) ?? null;

  return (
    <ShellPanel compact>
      <div className="flex items-center justify-between">
        <ShellPanelTitle>{isHub ? "Ascent" : "Map"}</ShellPanelTitle>
        <ShellPanelMeta>
          {getPublicChapterTitle(scene.key)}
        </ShellPanelMeta>
      </div>

      <div className="text-[10px]" style={{ color: "#eef3ff" }}>
        {getPublicSceneLabel(scene.key)}
      </div>
      <div className="text-[9px]" style={{ color: "#a8c8e8" }}>
        {scene.zone || "No route charted"}
      </div>

      <div
        className="relative mt-2 rounded"
        style={{
          aspectRatio: "5 / 3",
          background: "rgba(0,0,0,0.42)",
          border: "1px solid rgba(168,200,232,0.25)",
          overflow: "hidden",
        }}
      >
        {nodes ? (
          <>
            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {nodes.map((n, i) => {
                const next = nodes[i + 1];
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

            {nodes.map((n) => (
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

            {scene.marker ? (
              <div
                className="absolute rounded-full"
                style={{
                  left: `${scene.marker.x * 100}%`,
                  top: `${scene.marker.y * 100}%`,
                  width: 6,
                  height: 6,
                  transform: "translate(-50%, -50%)",
                  background: "#eef3ff",
                  boxShadow: "0 0 6px rgba(238,243,255,0.9)",
                }}
              />
            ) : null}
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-wider"
            style={{ color: "rgba(168,200,232,0.5)" }}
          >
            No route charted
          </div>
        )}
      </div>

      {activeNode ? (
        <div
          className="text-[9px] uppercase tracking-wider mt-1"
          style={{ color: "#e8c890" }}
        >
          Selected · {activeNode.label}
        </div>
      ) : null}
    </ShellPanel>
  );
}
