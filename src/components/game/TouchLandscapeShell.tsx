/**
 * Touch landscape shell.
 *
 * Two regimes:
 *   - Standard:  permanent stats row at top, dialogue tray at bottom.
 *   - Compact:   stats and dialogue overlay the gameplay viewport so the
 *                viewport stays dominant on iPhone landscape.
 *
 * Rails and button sizes scale from real viewport size + the saved
 * `buttonSize` so phones get smaller controls without changing desktop
 * defaults. Left-handed mode swaps the entire left/right rails.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { TouchJoystick } from "./touch/TouchJoystick";
import { TouchButton } from "./touch/TouchButton";
import { TouchStatsStrip } from "./touch/TouchStatsStrip";
import { GameDialogueTray } from "./shell/GameDialogueTray";
import { TouchMiniMapPanel } from "./touch/TouchMiniMapPanel";
import { TouchInventoryOverlay } from "./touch/TouchInventoryOverlay";
import {
  emitVirtualDown,
  emitVirtualUp,
  clearVirtualInput,
} from "@/game/virtualInput";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  getOverlaySnapshot,
  patchOverlaySnapshot,
  type OverlaySnapshot,
} from "@/game/gameUiBridge";
import {
  getControls,
  subscribeControls,
  type ButtonSize,
} from "@/game/controls";

type Props = {
  children: React.ReactNode;
  booted: boolean;
  error: string | null;
};

type ViewportSize = { w: number; h: number };

type ShellMetrics = {
  compact: boolean;
  railWidth: number;
  joystick: number;
  util: number;
  a: number;
  b: number;
  gap: number;
  pad: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getButtonScale(size: ButtonSize) {
  switch (size) {
    case "s":
      return 0.84;
    case "m":
      return 0.93;
    case "xl":
      return 1.12;
    default:
      return 1;
  }
}

function readViewport(): ViewportSize {
  if (typeof window === "undefined") return { w: 844, h: 390 };
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

function computeMetrics(v: ViewportSize, buttonSize: ButtonSize): ShellMetrics {
  const scale = getButtonScale(buttonSize);
  const compact = v.h <= 430 || v.w <= 932;
  const short = Math.min(v.w, v.h);

  const railBase = compact
    ? clamp(short * 0.23, 84, 96)
    : clamp(short * 0.28, 96, 120);

  const joystickBase = compact
    ? clamp(short * 0.23, 78, 96)
    : clamp(short * 0.28, 96, 120);

  const utilBase = compact ? 38 : 44;
  const aBase = compact ? 60 : 72;
  const bBase = compact ? 52 : 60;

  return {
    compact,
    railWidth: Math.round(railBase),
    joystick: Math.round(clamp(joystickBase * scale, 72, 124)),
    util: Math.round(clamp(utilBase * scale, 34, 52)),
    a: Math.round(clamp(aBase * scale, 50, 84)),
    b: Math.round(clamp(bBase * scale, 46, 72)),
    gap: compact ? 6 : 8,
    pad: compact ? 6 : 8,
  };
}

export function TouchLandscapeShell({ children, booted, error }: Props) {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlaySnapshot>(
    () => getGameUiSnapshot().overlay,
  );
  const [dialogOpen, setDialogOpen] = useState(
    () => getGameUiSnapshot().dialog.open,
  );
  const [leftHanded, setLeftHanded] = useState(() => getControls().leftHanded);
  const [buttonSize, setButtonSizeState] = useState(() => getControls().buttonSize);
  const [viewport, setViewport] = useState<ViewportSize>(() => readViewport());

  useEffect(() => {
    return subscribeGameUi((s) => {
      setOverlay(s.overlay);
      setDialogOpen(s.dialog.open);
    });
  }, []);

  useEffect(() => {
    return subscribeControls(() => {
      const c = getControls();
      setLeftHanded(c.leftHanded);
      setButtonSizeState(c.buttonSize);
    });
  }, []);

  useEffect(() => {
    const update = () => setViewport(readViewport());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const metrics = useMemo(
    () => computeMetrics(viewport, buttonSize),
    [viewport, buttonSize],
  );

  const settingsOpen = overlay.settingsOpen;
  const loreOpen = overlay.loreOpen;
  const inquiryActive = overlay.inquiryActive;

  const joystickDisabled =
    inventoryOpen ||
    settingsOpen ||
    loreOpen ||
    dialogOpen ||
    inquiryActive ||
    overlay.modalLock;

  const actionDisabled = inventoryOpen || settingsOpen || loreOpen;
  const cancelDisabled = false;

  useEffect(() => {
    if (inventoryOpen || settingsOpen || loreOpen) clearVirtualInput();
  }, [inventoryOpen, settingsOpen, loreOpen]);

  const openSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const fn = (window as unknown as Record<string, unknown>).__hermeticOpenSettings as
      | (() => void)
      | undefined;
    fn?.();
  }, []);

  const openInventory = useCallback(() => {
    const ov = getOverlaySnapshot();
    if (ov.settingsOpen || ov.loreOpen) return;
    setInventoryOpen(true);
    patchOverlaySnapshot({ inventoryOpen: true });
    clearVirtualInput();
  }, []);

  const closeInventory = useCallback(() => {
    setInventoryOpen(false);
    patchOverlaySnapshot({ inventoryOpen: false });
    clearVirtualInput();
  }, []);

  const handleBPress = useCallback(() => {
    if (inventoryOpen) {
      closeInventory();
      return;
    }
    emitVirtualDown("cancel");
  }, [inventoryOpen, closeInventory]);

  const handleBRelease = useCallback(() => {
    if (inventoryOpen) return;
    emitVirtualUp("cancel");
  }, [inventoryOpen]);

  const leftRail = (
    <RailControls
      kind="utility"
      compact={metrics.compact}
      utilSize={metrics.util}
      joystickSize={metrics.joystick}
      onSettings={openSettings}
      onInventory={openInventory}
      inventoryActive={inventoryOpen}
      joystickDisabled={joystickDisabled}
    />
  );
  const rightRail = (
    <RailControls
      kind="action"
      compact={metrics.compact}
      aSize={metrics.a}
      bSize={metrics.b}
      actionDisabled={actionDisabled}
      cancelDisabled={cancelDisabled}
      onAPress={() => emitVirtualDown("action")}
      onARelease={() => emitVirtualUp("action")}
      onBPress={handleBPress}
      onBRelease={handleBRelease}
    />
  );

  const railCol = `${metrics.railWidth}px`;

  return (
    <div
      className="fixed inset-0 overflow-hidden font-mono"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a1428 0%, #03060e 100%)",
        color: "#eef3ff",
        ["--rail-width" as string]: railCol,
        ["--joystick-size" as string]: `${metrics.joystick}px`,
        ["--ab-size" as string]: `${metrics.a}px`,
        ["--util-size" as string]: `${metrics.util}px`,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        height: "100dvh",
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
        Hermetic Comedy — touch landscape shell
      </h1>

      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `${railCol} 1fr ${railCol}`,
          gap: metrics.gap,
          padding: metrics.pad,
        }}
      >
        <aside
          className="flex flex-col items-stretch min-h-0"
          style={{ gap: metrics.gap }}
        >
          {leftHanded ? rightRail : leftRail}
        </aside>

        <main
          className="flex flex-col min-h-0 min-w-0"
          style={{ gap: metrics.gap, touchAction: "none" }}
        >
          {metrics.compact ? (
            <CompactCenter booted={booted} error={error} dialogOpen={dialogOpen}>
              {children}
            </CompactCenter>
          ) : (
            <StandardCenter booted={booted} error={error} dialogOpen={dialogOpen}>
              {children}
            </StandardCenter>
          )}
        </main>

        <aside
          className="flex flex-col items-stretch min-h-0"
          style={{ gap: metrics.gap }}
        >
          {leftHanded ? leftRail : rightRail}
        </aside>
      </div>

      <TouchInventoryOverlay open={inventoryOpen} onClose={closeInventory} />
    </div>
  );
}

function StandardCenter({
  children,
  booted,
  error,
  dialogOpen,
}: {
  children: React.ReactNode;
  booted: boolean;
  error: string | null;
  dialogOpen: boolean;
}) {
  return (
    <>
      <TouchStatsStrip />
      <ViewportStage booted={booted} error={error}>
        {children}
      </ViewportStage>
      {dialogOpen ? <GameDialogueTray /> : null}
    </>
  );
}

function CompactCenter({
  children,
  booted,
  error,
  dialogOpen,
}: {
  children: React.ReactNode;
  booted: boolean;
  error: string | null;
  dialogOpen: boolean;
}) {
  return (
    <div className="relative flex-1 min-h-0 min-w-0">
      <ViewportStage booted={booted} error={error} compact>
        {children}
      </ViewportStage>
      <div
        className="pointer-events-none absolute top-1 left-1 right-1"
        style={{ zIndex: 5 }}
      >
        <div className="pointer-events-auto">
          <TouchStatsStrip compact />
        </div>
      </div>
      {dialogOpen ? (
        <div
          className="pointer-events-none absolute bottom-1 left-1 right-1"
          style={{ zIndex: 5 }}
        >
          <div className="pointer-events-auto">
            <GameDialogueTray compact />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ViewportStage({
  children,
  booted,
  error,
  compact = false,
}: {
  children: React.ReactNode;
  booted: boolean;
  error: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className="relative flex-1 min-h-0 grid place-items-center"
      style={{ overflow: "hidden" }}
    >
      <div
        style={{
          aspectRatio: "160 / 144",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "100%",
          imageRendering: "pixelated",
          border: compact ? "1px solid #1a2540" : "1px solid #2a3550",
          background: "#05070d",
          boxShadow: "0 0 30px rgba(74,120,200,0.18)",
        }}
      >
        {children}
      </div>
      {!booted && !error && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center text-xs opacity-70"
          style={{ color: "#a8c8e8" }}
        >
          Loading the silver…
        </div>
      )}
      {error && (
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center text-xs px-4 text-center"
          style={{ color: "#d86a6a" }}
        >
          Failed to load: {error}
        </div>
      )}
    </div>
  );
}

type RailProps =
  | {
      kind: "utility";
      compact: boolean;
      utilSize: number;
      joystickSize: number;
      onSettings: () => void;
      onInventory: () => void;
      inventoryActive: boolean;
      joystickDisabled: boolean;
    }
  | {
      kind: "action";
      compact: boolean;
      aSize: number;
      bSize: number;
      actionDisabled: boolean;
      cancelDisabled: boolean;
      onAPress: () => void;
      onARelease: () => void;
      onBPress: () => void;
      onBRelease: () => void;
    };

function RailControls(props: RailProps) {
  if (props.kind === "utility") {
    return (
      <>
        <div className="flex gap-2 justify-center">
          <UtilButton
            label="≡"
            ariaLabel="Settings"
            onPress={props.onSettings}
            size={props.utilSize}
          />
          <UtilButton
            label="◫"
            ariaLabel="Inventory"
            active={props.inventoryActive}
            onPress={props.onInventory}
            size={props.utilSize}
          />
        </div>
        <div className="flex-1 grid place-items-center">
          <TouchJoystick disabled={props.joystickDisabled} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-1">
        <TouchMiniMapPanel compact={props.compact} />
      </div>
      <div
        className={`flex-1 flex flex-col items-center justify-end ${
          props.compact ? "gap-2 pb-1" : "gap-3 pb-2"
        }`}
      >
        <TouchButton
          label="B"
          variant="b"
          size={props.bSize}
          ariaLabel="Cancel / Witness"
          disabled={props.cancelDisabled}
          onPress={props.onBPress}
          onRelease={props.onBRelease}
        />
        <TouchButton
          label="A"
          variant="a"
          size={props.aSize}
          ariaLabel="Confirm / Interact"
          disabled={props.actionDisabled}
          onPress={props.onAPress}
          onRelease={props.onARelease}
        />
      </div>
    </>
  );
}

function UtilButton({
  label,
  ariaLabel,
  onPress,
  active = false,
  size,
}: {
  label: string;
  ariaLabel: string;
  onPress: () => void;
  active?: boolean;
  size: number;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        onPress();
        e.preventDefault();
      }}
      className="select-none touch-none rounded-md grid place-items-center"
      style={{
        width: size,
        height: size,
        background: active
          ? "linear-gradient(180deg, #4a78c8, #2a3550)"
          : "linear-gradient(180deg, rgba(40,55,90,0.9), rgba(20,28,48,0.95))",
        color: "#eef3ff",
        border: "1px solid rgba(168,200,232,0.5)",
        boxShadow: active
          ? "inset 0 0 8px rgba(255,255,255,0.3)"
          : "inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.5)",
        fontSize: Math.max(18, Math.round(size * 0.45)),
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}
