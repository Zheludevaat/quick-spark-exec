/**
 * Desktop center dock — passive context card only.
 *
 * Dialogue and inquiry are now rendered by DesktopModalHost as the sole
 * owner of blocking non-diegetic UI. The dock just presents idle scene
 * authored context (or a quiet fallback) and steps out of the way when
 * a modal is active.
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

export function DesktopDialogueDock() {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);
  const [modal, setModal] = useState(() => getGameUiSnapshot().modal);

  useEffect(() => {
    return subscribeGameUi((s) => {
      setScene(s.scene);
      setModal(s.modal);
    });
  }, []);

  // While a blocking modal owns the screen, collapse the dock to a
  // muted placeholder so attention belongs to the modal host alone.
  if (modal.blocking && modal.surface !== "none") {
    return (
      <ShellPanel tone="subdued" compact style={{ minHeight: 96, opacity: 0.5 }}>
        <ShellPanelMeta>
          {modal.surface === "dialog"
            ? "DIALOGUE IN PROGRESS"
            : modal.surface === "inquiry"
              ? "AWAITING YOUR CHOICE"
              : modal.title || "MODAL ACTIVE"}
        </ShellPanelMeta>
      </ShellPanel>
    );
  }

  const isHub = scene.key === "MetaxyHub";
  const idleTitle = scene.idleTitle || scene.zone || "ATMOSPHERE";
  const idleBody =
    scene.idleBody ||
    (scene.label
      ? `${scene.label} waits in silence.`
      : "The scene keeps its own counsel.");

  return (
    <ShellPanel style={{ minHeight: 96 }}>
      <div className="flex items-center justify-between">
        <ShellPanelTitle>{idleTitle}</ShellPanelTitle>
        {isHub && <ShellPanelMeta>PORTAL SELECTION</ShellPanelMeta>}
      </div>

      <div
        className="text-xs font-mono leading-snug mt-1 whitespace-pre-line"
        style={{ color: "#a8c8e8" }}
      >
        {idleBody}
      </div>

      {isHub && (
        <div
          className="text-[10px] font-mono mt-2 uppercase tracking-wider"
          style={{ color: "rgba(168,200,232,0.55)" }}
        >
          Choose a gate, then enter from the canvas or with A.
        </div>
      )}
    </ShellPanel>
  );
}
