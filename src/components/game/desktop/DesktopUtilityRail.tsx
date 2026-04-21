/**
 * Desktop bottom-dock left rail. Two architectural buttons:
 * STATS opens the Player Hub overlay; SETTINGS opens the existing
 * in-canvas settings overlay (via the global opener installed by hud).
 */
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

type Props = {
  onOpenHub: () => void;
  onOpenSettings: () => void;
  hubOpen: boolean;
};

function UtilityButton({
  label,
  onClick,
  active = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  hubOpen,
}: Props) {
  return (
    <ShellPanel compact>
      <ShellPanelTitle>PLAYER</ShellPanelTitle>
      <ShellPanelMeta>COMMANDS</ShellPanelMeta>
      <div className="mt-2 flex flex-col gap-2">
        <UtilityButton label="STATS" onClick={onOpenHub} active={hubOpen} />
        <UtilityButton label="SETTINGS" onClick={onOpenSettings} />
      </div>
    </ShellPanel>
  );
}
