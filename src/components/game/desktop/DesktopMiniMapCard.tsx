/**
 * Desktop minimap card.
 *
 * Hub scenes get a stronger "ascent map" treatment. Regular scenes still use
 * the generic minimap card.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type SceneNode,
} from "@/game/gameUiBridge";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

// Fallback geometries are intentionally selection-free so a missing
// scene snapshot can never lie about which portal is selected.
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

export function DesktopMiniMapCard() {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);
  const [modal, setModal] = useState(() => getGameUiSnapshot().modal);

  useEffect(() => {
    return subscribeGameUi((s) => {
      setScene(s.scene);
      setModal(s.modal);
    });
  }, []);

  // Per modal doctrine: while a blocking shell modal owns attention,
  // the minimap must vanish (not merely dim) so it can never compete
  // with the active surface.
  if (!scene.showMiniMap) return null;
  if (modal.blocking && modal.surface !== "none") return null;

  const isHub = scene.key === "MetaxyHub";

  const resolvedNodes =
    scene.nodes && scene.nodes.length > 0
      ? scene.nodes
      : isHub
        ? METAXY_FALLBACK_NODES
        : scene.key === "Title"
          ? TITLE_FALLBACK_NODES
          : null;

  const hasNodes = !!resolvedNodes;
  const activeNode = resolvedNodes?.find((n) => n.active) ?? null;
  const marker = scene.marker;

  return (
    <ShellPanel compact>
      <div className="flex items-center justify-between">
        <ShellPanelTitle>{isHub ? "ASCENT" : "MAP"}</ShellPanelTitle>
        <ShellPanelMeta>
          {isHub ? "7 GATES" : scene.act > 0 ? `ACT ${scene.act}` : "—"}
        </ShellPanelMeta>
      </div>

      <div className="text-[10px] font-mono mt-0.5" style={{ color: "#eef3ff" }}>
        {isHub ? "Metaxy Hub" : scene.label || "—"}
      </div>

      <div className="text-[9px] font-mono" style={{ color: "#a8c8e8" }}>
        {isHub ? scene.zone || "Portal Ascent" : scene.zone || "—"}
      </div>

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
              {resolvedNodes!.map((n, i) => {
                const next = resolvedNodes![i + 1];
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
            {resolvedNodes!.map((n) => (
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
            className="absolute inset-0 flex items-center justify-center text-[9px] font-mono uppercase tracking-wider"
            style={{ color: "rgba(168,200,232,0.5)" }}
          >
            {isHub ? "ASCENT DATA UNAVAILABLE" : "NO ROUTE CHARTED"}
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

      {activeNode && (
        <div
          className="text-[9px] font-mono mt-1 uppercase tracking-wider"
          style={{ color: "#e8c890" }}
        >
          Selected · {activeNode.label}
        </div>
      )}
    </ShellPanel>
  );
}
