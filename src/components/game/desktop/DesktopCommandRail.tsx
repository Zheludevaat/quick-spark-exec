import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import { getPublicSceneLabel, getPublicChapterTitle } from "@/game/canon/registry";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

type Props = {
  codexOpen: boolean;
  onOpenCodex: () => void;
  onOpenSettings: () => void;
};

function RailButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wider font-mono"
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

export function DesktopCommandRail({
  codexOpen,
  onOpenCodex,
  onOpenSettings,
}: Props) {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    return subscribeGameUi((s) => setScene(s.scene));
  }, []);

  return (
    <ShellPanel compact>
      <ShellPanelTitle>Command</ShellPanelTitle>
      <ShellPanelMeta>Desktop Frame</ShellPanelMeta>

      <div
        className="mt-2 rounded p-2"
        style={{
          background: "rgba(0,0,0,0.32)",
          border: "1px solid rgba(168,200,232,0.2)",
        }}
      >
        <div
          className="text-[9px] uppercase tracking-wider"
          style={{ color: "rgba(168,200,232,0.7)" }}
        >
          Current Scene
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: "#eef3ff" }}>
          {getPublicSceneLabel(scene.key)}
        </div>
        <div className="text-[9px]" style={{ color: "#a8c8e8" }}>
          {scene.zone || getPublicChapterTitle(scene.key)}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <RailButton label="Codex" onClick={onOpenCodex} active={codexOpen} />
        <RailButton label="Settings" onClick={onOpenSettings} />
      </div>
    </ShellPanel>
  );
}
