import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DesktopStatsBar } from "./desktop/DesktopStatsBar";
import { DesktopCommandRail } from "./desktop/DesktopCommandRail";
import { DesktopNarrativeDock } from "./desktop/DesktopNarrativeDock";
import { DesktopMapDock } from "./desktop/DesktopMapDock";
import { DesktopModalHost } from "./desktop/DesktopModalHost";
import { ShellPanel, ShellPanelMeta } from "./shell/ShellPanel";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  patchOverlaySnapshot,
} from "@/game/gameUiBridge";
import { clearVirtualInput } from "@/game/virtualInput";
import type { CodexTabKey } from "./desktop/desktopUiModel";

type Props = {
  children: ReactNode;
  booted: boolean;
  error: string | null;
};

const DEFAULT_FOOTER_HINT =
  "WASD / ARROWS MOVE · SPACE / ENTER = A · Q = WITNESS · I = CODEX INVENTORY · J = CODEX JOURNAL · L = LORE TAB · P / ESC = SETTINGS";

export function DesktopGameShell({ children, booted, error }: Props) {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);
  const [modal, setModal] = useState(() => getGameUiSnapshot().modal);
  const [codexTab, setCodexTab] = useState<CodexTabKey | null>(null);

  useEffect(() => {
    return subscribeGameUi((s) => {
      setScene(s.scene);
      setModal(s.modal);
    });
  }, []);

  const openSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const fn = (window as unknown as Record<string, unknown>)
      .__hermeticOpenSettings as (() => void) | undefined;
    fn?.();
  }, []);

  const openCodex = useCallback(
    (tab: CodexTabKey = "overview") => {
      if (scene.key === "Title") return;
      if (modal.mode === "shell" && modal.surface === "settings") return;

      setCodexTab(tab);
      patchOverlaySnapshot({
        playerHubOpen: true,
        inventoryOpen: tab === "inventory",
      });
    },
    [scene.key, modal.mode, modal.surface],
  );

  const closeCodex = useCallback(() => {
    setCodexTab(null);
    patchOverlaySnapshot({
      playerHubOpen: false,
      inventoryOpen: false,
    });
  }, []);

  useEffect(() => {
    if (codexTab) clearVirtualInput();
  }, [codexTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (scene.key === "Title") return;
      if (codexTab) return;
      if (modal.mode === "shell" && modal.surface === "settings") return;

      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        e.stopPropagation();
        openCodex("inventory");
        return;
      }

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        e.stopPropagation();
        openCodex("journal");
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, {
        capture: true,
      } as EventListenerOptions);
  }, [scene.key, codexTab, modal.mode, modal.surface, openCodex]);

  const titleMode = scene.key === "Title";

  const largeSurfaceActive =
    codexTab !== null ||
    (modal.mode === "shell" &&
      (modal.surface === "settings" ||
        modal.surface === "lore" ||
        modal.surface === "inventory" ||
        modal.surface === "playerHub"));

  const chromeStyle = largeSurfaceActive
    ? {
        opacity: 0.45,
        filter: "saturate(0.72)",
        transition: "opacity 180ms ease",
      }
    : {
        opacity: 1,
        transition: "opacity 180ms ease",
      };

  if (titleMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#05070d",
          color: "#eef3ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            width: "min(96vw, 1100px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at center, #0a1428 0%, #03060e 100%)",
        color: "#eef3ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        fontFamily: "monospace",
        padding: "12px 12px",
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
        Hermetic Comedy - desktop command frame
      </h1>

      <div style={{ width: "min(96vw, 1180px)", ...chromeStyle }}>
        <DesktopStatsBar />
      </div>

      <div style={{ width: "min(96vw, 1180px)" }}>
        <div
          style={{
            margin: "0 auto",
            padding: 8,
            width: "100%",
            background:
              "linear-gradient(180deg, rgba(12,18,34,0.96), rgba(6,10,20,0.96))",
            border: "1px solid rgba(74,120,200,0.45)",
            boxShadow: "0 0 40px rgba(74,120,200,0.12)",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              position: "relative",
              margin: "0 auto",
              width: "min(100%, 760px)",
              aspectRatio: "160 / 144",
              imageRendering: "pixelated",
              border: "1px solid #2a3550",
              background: "#05070d",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.45)",
              overflow: "hidden",
            }}
          >
            {children}

            {!booted && !error ? (
              <div
                className="absolute inset-0 flex items-center justify-center text-xs"
                style={{ color: "#a8c8e8", pointerEvents: "none" }}
              >
                Loading the silver…
              </div>
            ) : null}

            {error ? (
              <div
                className="absolute inset-0 flex items-center justify-center text-xs px-4 text-center"
                style={{ color: "#d86a6a", pointerEvents: "none" }}
              >
                Failed to load: {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        style={{
          width: "min(96vw, 1180px)",
          display: "grid",
          gridTemplateColumns: "180px minmax(0,1fr) 240px",
          gap: 12,
          alignItems: "stretch",
          ...chromeStyle,
        }}
      >
        <DesktopCommandRail
          codexOpen={codexTab !== null}
          onOpenCodex={() => openCodex("overview")}
          onOpenSettings={openSettings}
        />
        <DesktopNarrativeDock />
        <DesktopMapDock />
      </div>

      <div style={{ width: "min(96vw, 1180px)", ...chromeStyle }}>
        <ShellPanel tone="subdued" compact>
          <ShellPanelMeta>
            {scene.footerHint || DEFAULT_FOOTER_HINT}
          </ShellPanelMeta>
        </ShellPanel>
      </div>

      <DesktopModalHost codexTab={codexTab} onCloseCodex={closeCodex} />
    </div>
  );
}
