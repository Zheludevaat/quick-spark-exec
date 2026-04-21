/**
 * Desktop center dock.
 *
 * When dialog is open, render the shared dialogue tray.
 * Otherwise render a richer scene-authored context card. Hub scenes get
 * slightly stronger treatment than normal idle scenes.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import { GameDialogueTray } from "@/components/game/shell/GameDialogueTray";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

export function DesktopDialogueDock() {
  const [dialog, setDialog] = useState(() => getGameUiSnapshot().dialog);
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    return subscribeGameUi((s) => {
      setDialog(s.dialog);
      setScene(s.scene);
    });
  }, []);

  if (dialog.open) {
    return <GameDialogueTray />;
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
