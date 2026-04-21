/**
 * Desktop shell with granular per-scene visibility.
 *
 * Each scene publishes which shell parts are useful via gameUiBridge.
 * The shell renders only those parts. The Phaser viewport is always shown.
 */
import {
  useCallback,
  useEffect,
  useMemo,
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
} from "@/game/gameUiBridge";
import { clearVirtualInput } from "@/game/virtualInput";

type Props = {
  children: ReactNode;
  booted: boolean;
  error: string | null;
};

const DEFAULT_FOOTER_HINT =
  "ARROWS / WASD MOVE · SPACE / ENTER = A · Q = WITNESS · L = LORE · P / ESC = SETTINGS · PLAYER HUB IN LEFT RAIL";

export function DesktopGameShell({ children, booted, error }: Props) {
  const [playerHubOpen, setPlayerHubOpen] = useState(false);
  const [overlay, setOverlay] = useState(() => getGameUiSnapshot().overlay);
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    return subscribeGameUi((s) => {
      setOverlay(s.overlay);
      setScene(s.scene);
    });
  }, []);

  const closePlayerHub = useCallback(() => {
    setPlayerHubOpen(false);
    patchOverlaySnapshot({ playerHubOpen: false });
  }, []);

  useEffect(() => {
    if (playerHubOpen) clearVirtualInput();
  }, [playerHubOpen]);

  useEffect(() => {
    if (!scene.allowPlayerHub && playerHubOpen) {
      closePlayerHub();
    }
  }, [scene.allowPlayerHub, playerHubOpen, closePlayerHub]);

  const openSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const fn = (window as unknown as Record<string, unknown>)
      .__hermeticOpenSettings as (() => void) | undefined;
    fn?.();
  }, []);

  const openPlayerHub = useCallback(() => {
    if (
      !scene.allowPlayerHub ||
      overlay.settingsOpen ||
      overlay.loreOpen ||
      overlay.inventoryOpen ||
      overlay.inquiryActive
    ) {
      return;
    }
    setPlayerHubOpen(true);
    patchOverlaySnapshot({ playerHubOpen: true });
  }, [overlay, scene.allowPlayerHub]);

  const footerHint = scene.footerHint || DEFAULT_FOOTER_HINT;

  const showDock =
    scene.showUtilityRail || scene.showDialogueDock || scene.showMiniMap;

  const dockStyle = useMemo(() => {
    const cols: string[] = [];
    if (scene.showUtilityRail) cols.push("180px");
    if (scene.showDialogueDock) cols.push("1fr");
    if (scene.showMiniMap) cols.push("240px");
    return {
      width: "min(96vw, 1100px)",
      display: "grid",
      gridTemplateColumns: cols.join(" "),
      gap: 10,
      alignItems: "stretch" as const,
    };
  }, [scene.showUtilityRail, scene.showDialogueDock, scene.showMiniMap]);

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
        Hermetic Comedy — desktop shell
      </h1>

      {scene.showStatsBar && (
        <div style={{ width: "min(96vw, 1100px)" }}>
          <DesktopStatsBar />
        </div>
      )}

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

      {showDock && (
        <div style={dockStyle}>
          {scene.showUtilityRail && (
            <DesktopUtilityRail
              onOpenHub={openPlayerHub}
              onOpenSettings={openSettings}
              hubOpen={playerHubOpen}
            />
          )}
          {scene.showDialogueDock && <DesktopDialogueDock />}
          {scene.showMiniMap && <DesktopMiniMapCard />}
        </div>
      )}

      {scene.showFooter && (
        <div style={{ width: "min(96vw, 1100px)" }}>
          <ShellPanel tone="subdued" compact>
            <ShellPanelMeta>{footerHint}</ShellPanelMeta>
          </ShellPanel>
        </div>
      )}

      {scene.allowPlayerHub && (
        <DesktopPlayerHubOverlay open={playerHubOpen} onClose={closePlayerHub} />
      )}
    </div>
  );
}
