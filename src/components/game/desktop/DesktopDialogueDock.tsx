/**
 * Desktop bottom-dock center column. Reserves stable space for dialogue:
 * when a dialog is open, renders the shared GameDialogueTray; otherwise
 * shows a calm zone/scene placeholder so the dock doesn't collapse.
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

  return (
    <ShellPanel style={{ minHeight: 96 }}>
      <ShellPanelTitle>{scene.zone || "DIALOGUE"}</ShellPanelTitle>
      <div className="text-xs font-mono leading-snug" style={{ color: "#a8c8e8" }}>
        {scene.label || "No voice present."}
      </div>
      <div className="mt-2">
        <ShellPanelMeta>
          STATS OPENS THE PLAYER HUB · SETTINGS OPENS THE GAME MENU
        </ShellPanelMeta>
      </div>
    </ShellPanel>
  );
}
