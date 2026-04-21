/**
 * Desktop modal host.
 *
 * The single owner of all blocking, non-diegetic UI on the desktop
 * shell. Switches on `modal.surface` and renders one of:
 *   - dialog tray
 *   - inquiry tray (same styling)
 *   - settings panel
 *   - lore log
 *   - inventory
 *   - player hub
 *
 * Phaser scenes never render their own copy of these surfaces on
 * desktop — they publish state through gameUiBridge and listen for
 * close events fired here (or from the rendered surface itself).
 *
 * `playerHub` and `inventory` are opened by the shell directly (utility
 * rail, B button) so they accept onClose props instead of bridge events.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type ModalSnapshot,
} from "@/game/gameUiBridge";
import { GameDialogueTray } from "@/components/game/shell/GameDialogueTray";
import { DesktopShellInquiry } from "./DesktopShellInquiry";
import { DesktopShellSettings } from "./DesktopShellSettings";
import { DesktopShellLore } from "./DesktopShellLore";
import { DesktopShellInventory } from "./DesktopShellInventory";
import { DesktopPlayerHubOverlay } from "./DesktopPlayerHubOverlay";

type Props = {
  /** Player hub is opened by the shell utility rail, not the bridge. */
  playerHubOpen: boolean;
  onClosePlayerHub: () => void;
  /** Inventory is opened by the shell, not the bridge. */
  inventoryOpen: boolean;
  onCloseInventory: () => void;
};

export function DesktopModalHost({
  playerHubOpen,
  onClosePlayerHub,
  inventoryOpen,
  onCloseInventory,
}: Props) {
  const [modal, setModal] = useState<ModalSnapshot>(
    () => getGameUiSnapshot().modal,
  );

  useEffect(() => {
    return subscribeGameUi((s) => setModal(s.modal));
  }, []);

  // Player hub takes precedence over bridge-driven surfaces because it
  // is shell-initiated. Inventory is the same.
  if (playerHubOpen) {
    return (
      <DesktopPlayerHubOverlay open={playerHubOpen} onClose={onClosePlayerHub} />
    );
  }
  if (inventoryOpen) {
    return <DesktopShellInventory onClose={onCloseInventory} />;
  }

  if (modal.mode !== "shell") return null;

  switch (modal.surface) {
    case "dialog":
      // Render dialogue tray as a centered, larger surface so it owns
      // attention while a modal is active. The dock no longer renders it.
      return (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40"
          style={{
            bottom: 24,
            width: "min(96vw, 720px)",
            pointerEvents: "auto",
          }}
        >
          <GameDialogueTray />
        </div>
      );
    case "inquiry":
      return (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-40"
          style={{
            bottom: 24,
            width: "min(96vw, 720px)",
            pointerEvents: "auto",
          }}
        >
          <DesktopShellInquiry />
        </div>
      );
    case "settings":
      return <DesktopShellSettings />;
    case "lore":
      return <DesktopShellLore />;
    default:
      return null;
  }
}
