/**
 * Desktop command shell: top crown stats bar, framed central viewport,
 * bottom command dock (utility rail | dialogue dock | minimap card),
 * and the Player Hub overlay opened by the STATS button.
 *
 * The Phaser viewport remains the hero object. SETTINGS opens the
 * existing in-canvas settings overlay via the global opener installed
 * by the HUD scene.
 */
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DesktopStatsBar } from "./desktop/DesktopStatsBar";
import { DesktopUtilityRail } from "./desktop/DesktopUtilityRail";
import { DesktopMiniMapCard } from "./desktop/DesktopMiniMapCard";
import { DesktopDialogueDock } from "./desktop/DesktopDialogueDock";
import { DesktopPlayerHubOverlay } from "./desktop/DesktopPlayerHubOverlay";
import { ShellPanel, ShellPanelMeta } from "./shell/ShellPanel";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  patchOverlaySnapshot,
  type OverlaySnapshot,
} from "@/game/gameUiBridge";
import { clearVirtualInput } from "@/game/virtualInput";

type Props = {
  children: ReactNode;
  booted: boolean;
  error: string | null;
};

export function DesktopGameShell({ children, booted, error }: Props) {
  const [playerHubOpen, setPlayerHubOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlaySnapshot>(
    () => getGameUiSnapshot().overlay,
  );

  useEffect(() => {
    return subscribeGameUi((s) => setOverlay(s.overlay));
  }, []);

  useEffect(() => {
    if (playerHubOpen) clearVirtualInput();
  }, [playerHubOpen]);

  const openSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const fn = (window as unknown as Record<string, unknown>)
      .__hermeticOpenSettings as (() => void) | undefined;
    fn?.();
  }, []);

  const openPlayerHub = useCallback(() => {
    if (
      overlay.settingsOpen ||
      overlay.loreOpen ||
      overlay.inventoryOpen ||
      overlay.inquiryActive
    ) {
      return;
    }
    setPlayerHubOpen(true);
    patchOverlaySnapshot({ playerHubOpen: true });
  }, [overlay]);

  const closePlayerHub = useCallback(() => {
    setPlayerHubOpen(false);
    patchOverlaySnapshot({ playerHubOpen: false });
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070d",
        color: "#eef3ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        fontFamily: "monospace",
        padding: "10px 12px",
      }}
    >
      <h1
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Hermetic Comedy — desktop command shell
      </h1>

      <div style={{ width: "min(96vw, 1100px)" }}>
        <DesktopStatsBar />
      </div>

      <div style={{ width: "min(96vw, 1100px)" }}>
        <div
          style={{
            position: "relative",
            margin: "0 auto",
            width: "min(100%, 760px)",
            aspectRatio: "160 / 144",
            imageRendering: "pixelated",
            border: "1px solid rgba(232,200,144,0.4)",
            background: "#05070d",
            boxShadow:
              "0 0 60px rgba(74,120,200,0.18), inset 0 0 0 1px rgba(0,0,0,0.6)",
            borderRadius: 4,
          }}
        >
          {children}

          {!booted && !error && (
            <div
              className="absolute inset-0 flex items-center justify-center text-xs"
              style={{ color: "#a8c8e8", pointerEvents: "none" }}
            >
              Loading the silver…
            </div>
          )}

          {error && (
            <div
              className="absolute inset-0 flex items-center justify-center text-xs"
              style={{ color: "#d86a6a", pointerEvents: "none" }}
            >
              Failed to load: {error}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          width: "min(96vw, 1100px)",
          display: "grid",
          gridTemplateColumns: "180px 1fr 240px",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        <DesktopUtilityRail
          onOpenHub={openPlayerHub}
          onOpenSettings={openSettings}
          hubOpen={playerHubOpen}
        />
        <DesktopDialogueDock />
        <DesktopMiniMapCard />
      </div>

      <div style={{ width: "min(96vw, 1100px)" }}>
        <ShellPanel tone="subdued" compact>
          <ShellPanelMeta>
            ARROWS / WASD MOVE · SPACE OR ENTER = A · B OR Q = WITNESS · L =
            LORE · P OR ESC = SETTINGS · STATS = PLAYER HUB
          </ShellPanelMeta>
        </ShellPanel>
      </div>

      <DesktopPlayerHubOverlay open={playerHubOpen} onClose={closePlayerHub} />
    </div>
  );
}
