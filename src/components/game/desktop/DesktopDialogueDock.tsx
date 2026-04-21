/**
 * Desktop bottom-dock center column.
 *
 * When dialog is open, render the shared dialogue tray.
 * Otherwise show a scene-authored idle state instead of dead filler copy.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import { GameDialogueTray } from "@/components/game/shell/GameDialogueTray";
import {
  ShellPanel,
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

  const idleTitle = scene.idleTitle || scene.zone || "ATMOSPHERE";
  const idleBody =
    scene.idleBody ||
    (scene.label
      ? `${scene.label} waits in silence.`
      : "The scene keeps its own counsel.");

  return (
    <ShellPanel style={{ minHeight: 96 }}>
      <ShellPanelTitle>{idleTitle}</ShellPanelTitle>
      <div
        className="text-xs font-mono leading-snug"
        style={{ color: "#a8c8e8" }}
      >
        {idleBody}
      </div>
    </ShellPanel>
  );
}
