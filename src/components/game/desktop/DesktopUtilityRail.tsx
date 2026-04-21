/**
 * Desktop left utility rail.
 *
 * Adds a compact status cluster so the rail earns its visual weight.
 */
import { useEffect, useMemo, useState } from "react";
import { loadSave } from "@/game/save";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

type Props = {
  onOpenHub: () => void;
  onOpenSettings: () => void;
  onOpenInventory: () => void;
  hubOpen: boolean;
};

function UtilityButton({
  label,
  onClick,
  active = false,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wider font-mono transition-colors"
      style={{
        background: active
          ? "linear-gradient(180deg, rgba(74,120,200,0.95), rgba(42,53,80,0.95))"
          : "linear-gradient(180deg, rgba(20,28,48,0.95), rgba(8,12,24,0.95))",
        color: "#eef3ff",
        border: active
          ? "1px solid rgba(232,200,144,0.55)"
          : "1px solid rgba(168,200,232,0.35)",
      }}
    >
      {label}
    </button>
  );
}

export function DesktopUtilityRail({
  onOpenHub,
  onOpenSettings,
  onOpenInventory,
  hubOpen,
}: Props) {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);
  const [save, setSave] = useState(() => loadSave());

  useEffect(() => {
    return subscribeGameUi((s) => {
      setScene(s.scene);
      setSave(loadSave());
    });
  }, []);

  const garmentsReleased = useMemo(
    () => Object.values(save?.garmentsReleased ?? {}).filter(Boolean).length,
    [save],
  );

  const isHub = scene.key === "MetaxyHub";
  const statusTitle = isHub ? "CURRENT ROUTE" : "CURRENT STATE";
  const statusLine1 = isHub ? scene.zone || "Portal Ascent" : scene.label || "—";
  const statusLine2 = isHub
    ? `Garments ${garmentsReleased}/7`
    : `Act ${scene.act || "—"}`;

  return (
    <ShellPanel compact>
      <ShellPanelTitle>PLAYER</ShellPanelTitle>
      <ShellPanelMeta>COMMANDS</ShellPanelMeta>

      <div
        className="mt-2 rounded p-2"
        style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(168,200,232,0.2)",
        }}
      >
        <div
          className="text-[9px] font-mono uppercase tracking-wider"
          style={{ color: "rgba(168,200,232,0.7)" }}
        >
          {statusTitle}
        </div>
        <div
          className="text-[10px] font-mono mt-0.5"
          style={{ color: "#eef3ff" }}
        >
          {statusLine1}
        </div>
        <div className="text-[9px] font-mono" style={{ color: "#a8c8e8" }}>
          {statusLine2}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <UtilityButton
          label="PLAYER HUB"
          ariaLabel="Open player hub (overview, inventory, journal, quests, progress, controls)"
          onClick={onOpenHub}
          active={hubOpen}
        />
        <UtilityButton label="INVENTORY" onClick={onOpenInventory} />
        <UtilityButton label="SETTINGS" onClick={onOpenSettings} />
      </div>
    </ShellPanel>
  );
}
