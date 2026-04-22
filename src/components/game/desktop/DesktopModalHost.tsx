import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  clearModalSnapshot,
  patchOverlaySnapshot,
  type ModalSnapshot,
} from "@/game/gameUiBridge";
import { DesktopShellSettings } from "./DesktopShellSettings";
import { DesktopCodexSurface } from "./DesktopCodexSurface";
import type { CodexTabKey } from "./desktopUiModel";

type Props = {
  codexTab: CodexTabKey | null;
  onCloseCodex: () => void;
};

function closeLoreBridgeSurface() {
  window.dispatchEvent(new Event("hermetic-lore-close"));
}

export function DesktopModalHost({ codexTab, onCloseCodex }: Props) {
  const [modal, setModal] = useState<ModalSnapshot>(
    () => getGameUiSnapshot().modal,
  );

  useEffect(() => {
    return subscribeGameUi((s) => setModal(s.modal));
  }, []);

  if (codexTab) {
    return <DesktopCodexSurface initialTab={codexTab} onClose={onCloseCodex} />;
  }

  if (modal.mode !== "shell") return null;

  switch (modal.surface) {
    case "settings":
      return <DesktopShellSettings />;

    case "lore":
      return (
        <DesktopCodexSurface
          initialTab="lore"
          onClose={closeLoreBridgeSurface}
        />
      );

    case "inventory":
      return (
        <DesktopCodexSurface
          initialTab="inventory"
          onClose={() => {
            patchOverlaySnapshot({ inventoryOpen: false });
            clearModalSnapshot();
          }}
        />
      );

    case "playerHub":
      return (
        <DesktopCodexSurface
          initialTab="overview"
          onClose={() => {
            patchOverlaySnapshot({ playerHubOpen: false });
            clearModalSnapshot();
          }}
        />
      );

    case "dialog":
    case "inquiry":
    default:
      return null;
  }
}
