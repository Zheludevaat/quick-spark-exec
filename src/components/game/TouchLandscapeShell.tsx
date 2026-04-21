/**
 * Touch landscape shell.
 *
 * Layout:
 *   ┌──────────────┬─────────────────────────┬──────────────┐
 *   │              │   stats strip           │              │
 *   │  left rail   ├─────────────────────────┤ right rail   │
 *   │  ⚙  inv      │                         │ ▢ minimap    │
 *   │              │   gameplay viewport     │              │
 *   │  joystick    │                         │  B           │
 *   │              ├─────────────────────────┤  A           │
 *   │              │   dialogue tray         │              │
 *   └──────────────┴─────────────────────────┴──────────────┘
 *
 * Left-handed mode swaps the entire left & right rails (not just the
 * joystick).
 *
 * The center column hosts the Phaser canvas (passed in via children).
 * Pointer events on rails are captured by their own controls; gameplay
 * pointer events still reach Phaser.
 */
import { useCallback, useEffect, useState } from "react";
import { TouchJoystick } from "./touch/TouchJoystick";
import { TouchButton } from "./touch/TouchButton";
import { TouchStatsStrip } from "./touch/TouchStatsStrip";
import { TouchDialogueTray } from "./touch/TouchDialogueTray";
import { TouchMiniMapPanel } from "./touch/TouchMiniMapPanel";
import { TouchInventoryOverlay } from "./touch/TouchInventoryOverlay";
import { RotateDeviceOverlay } from "./touch/RotateDeviceOverlay";
import {
  emitVirtualDown,
  emitVirtualUp,
  pulseVirtual,
  clearVirtualInput,
} from "@/game/virtualInput";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type OverlaySnapshot,
} from "@/game/gameUiBridge";
import { getControls, subscribeControls } from "@/game/controls";

type Props = {
  children: React.ReactNode;
  booted: boolean;
  error: string | null;
};

function useIsPortrait() {
  const [portrait, setPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return portrait;
}

export function TouchLandscapeShell({ children, booted, error }: Props) {
  const portrait = useIsPortrait();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlaySnapshot>(
    () => getGameUiSnapshot().overlay,
  );
  const [leftHanded, setLeftHanded] = useState(() => getControls().leftHanded);

  useEffect(() => {
    return subscribeGameUi((s) => setOverlay(s.overlay));
  }, []);
  useEffect(() => {
    return subscribeControls(() => setLeftHanded(getControls().leftHanded));
  }, []);

  // Modal priority — anything blocking gameplay must release held input.
  const hardModal =
    inventoryOpen ||
    overlay.settingsOpen ||
    overlay.loreOpen ||
    overlay.modalLock;
  useEffect(() => {
    if (hardModal) clearVirtualInput();
  }, [hardModal]);

  const dialogActive = useMemoDialogActive();
  // During inquiries/dialogs the joystick should be inactive but A/B remain.
  const joystickDisabled = hardModal || dialogActive;

  const openSettings = useCallback(() => {
    if (typeof window === "undefined") return;
    const fn = (window as unknown as Record<string, unknown>).__hermeticOpenSettings as
      | (() => void)
      | undefined;
    fn?.();
  }, []);

  const openInventory = useCallback(() => {
    if (overlay.settingsOpen || overlay.loreOpen) return;
    setInventoryOpen(true);
  }, [overlay.settingsOpen, overlay.loreOpen]);

  // Closing the inventory clears any held actions.
  const closeInventory = useCallback(() => {
    setInventoryOpen(false);
    clearVirtualInput();
  }, []);

  const leftRail = (
    <RailControls
      kind="utility"
      onSettings={openSettings}
      onInventory={openInventory}
      inventoryActive={inventoryOpen}
      joystickDisabled={joystickDisabled}
    />
  );
  const rightRail = (
    <RailControls
      kind="action"
      hardModal={hardModal}
      onAPress={() => emitVirtualDown("action")}
      onARelease={() => emitVirtualUp("action")}
      onBPress={() => emitVirtualDown("cancel")}
      onBRelease={() => emitVirtualUp("cancel")}
    />
  );

  return (
    <div
      className="fixed inset-0 overflow-hidden font-mono"
      style={{
        background:
          "radial-gradient(ellipse at center, #0a1428 0%, #03060e 100%)",
        color: "#eef3ff",
        // CSS tokens for child controls.
        ["--rail-width" as string]: "120px",
        ["--joystick-size" as string]: "120px",
        ["--ab-size" as string]: "68px",
        ["--util-size" as string]: "44px",
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
        Hermetic Comedy — a pixel-art RPG of small verbs
      </h1>

      <div
        className="grid h-full w-full gap-2 p-2"
        style={{
          gridTemplateColumns: leftHanded
            ? "var(--rail-width) 1fr var(--rail-width)"
            : "var(--rail-width) 1fr var(--rail-width)",
        }}
      >
        {/* Left rail (or right rail if left-handed) */}
        <aside className="flex flex-col items-stretch gap-2 min-h-0">
          {leftHanded ? rightRail : leftRail}
        </aside>

        {/* Center column */}
        <main
          className="flex flex-col gap-2 min-h-0 min-w-0"
          style={{ touchAction: "none" }}
        >
          <TouchStatsStrip />
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
                border: "1px solid #2a3550",
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
          <TouchDialogueTray />
        </main>

        {/* Right rail (or left rail if left-handed) */}
        <aside className="flex flex-col items-stretch gap-2 min-h-0">
          {leftHanded ? leftRail : rightRail}
        </aside>
      </div>

      <TouchInventoryOverlay open={inventoryOpen} onClose={closeInventory} />
      {portrait && <RotateDeviceOverlay />}
    </div>
  );
}

// Internal helper component for the left/right rails.
type RailProps =
  | {
      kind: "utility";
      onSettings: () => void;
      onInventory: () => void;
      inventoryActive: boolean;
      joystickDisabled: boolean;
    }
  | {
      kind: "action";
      hardModal: boolean;
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
          <UtilButton label="≡" ariaLabel="Settings" onPress={props.onSettings} />
          <UtilButton
            label="◫"
            ariaLabel="Inventory"
            active={props.inventoryActive}
            onPress={props.onInventory}
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
        <TouchMiniMapPanel />
      </div>
      <div className="flex-1 flex flex-col items-center justify-end gap-3 pb-2">
        <TouchButton
          label="B"
          variant="b"
          size={60}
          ariaLabel="Cancel / Witness"
          disabled={props.hardModal}
          onPress={props.onBPress}
          onRelease={props.onBRelease}
        />
        <TouchButton
          label="A"
          variant="a"
          size={72}
          ariaLabel="Confirm / Interact"
          disabled={false}
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
}: {
  label: string;
  ariaLabel: string;
  onPress: () => void;
  active?: boolean;
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
        width: "var(--util-size, 44px)",
        height: "var(--util-size, 44px)",
        background: active
          ? "linear-gradient(180deg, #4a78c8, #2a3550)"
          : "linear-gradient(180deg, rgba(40,55,90,0.9), rgba(20,28,48,0.95))",
        color: "#eef3ff",
        border: "1px solid rgba(168,200,232,0.5)",
        boxShadow: active
          ? "inset 0 0 8px rgba(255,255,255,0.3)"
          : "inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.5)",
        fontSize: 22,
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}

// Subscribe to dialog open state from the gameUiBridge.
import { useEffect as useEffectAlias, useState as useStateAlias } from "react";
function useMemoDialogActive() {
  const [active, setActive] = useStateAlias(
    () => getGameUiSnapshot().dialog.open,
  );
  useEffectAlias(() => {
    return subscribeGameUi((s) => setActive(s.dialog.open));
  }, []);
  return active;
}
