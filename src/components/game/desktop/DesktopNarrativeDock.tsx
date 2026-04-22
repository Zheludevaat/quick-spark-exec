import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type DialogSnapshot,
  type InquirySnapshot,
} from "@/game/gameUiBridge";
import { pulseVirtual } from "@/game/virtualInput";
import {
  ShellPanel,
  ShellPanelMeta,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

function dispatchCursor(index: number) {
  window.dispatchEvent(
    new CustomEvent("hermetic-inquiry-cursor", { detail: { index } }),
  );
}

function dispatchPick(index: number) {
  window.dispatchEvent(
    new CustomEvent("hermetic-inquiry-pick", { detail: { index } }),
  );
}

export function DesktopNarrativeDock() {
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);
  const [dialog, setDialog] = useState<DialogSnapshot>(
    () => getGameUiSnapshot().dialog,
  );
  const [inquiry, setInquiry] = useState<InquirySnapshot>(
    () => getGameUiSnapshot().inquiry,
  );

  useEffect(() => {
    return subscribeGameUi((s) => {
      setScene(s.scene);
      setDialog(s.dialog);
      setInquiry(s.inquiry);
    });
  }, []);

  if (inquiry.open) {
    return (
      <ShellPanel style={{ minHeight: 112 }} tone="accent">
        <ShellPanelTitle>{inquiry.speaker || "—"}</ShellPanelTitle>
        <div
          className="text-xs leading-snug whitespace-pre-wrap mb-2"
          style={{ color: "#eef3ff" }}
        >
          {inquiry.prompt}
        </div>

        <ul className="space-y-0.5">
          {inquiry.choices.map((choice, i) => {
            const selected = i === inquiry.cursor;
            return (
              <li key={choice.id}>
                <button
                  type="button"
                  onPointerEnter={() => dispatchCursor(i)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchPick(i);
                  }}
                  className="w-full text-left px-2 py-1 rounded"
                  style={{
                    background: selected
                      ? "rgba(232,200,144,0.12)"
                      : "transparent",
                    color: selected ? "#e8c890" : "#eef3ff",
                    border: selected
                      ? "1px solid rgba(232,200,144,0.45)"
                      : "1px solid transparent",
                    fontSize: 12,
                  }}
                >
                  <span
                    className="inline-block mr-2"
                    style={{
                      color: selected ? "#e8c890" : "rgba(168,200,232,0.4)",
                    }}
                  >
                    {selected ? "▶" : "·"}
                  </span>
                  {choice.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div
          className="mt-2 text-[10px] uppercase tracking-wider text-right"
          style={{ color: "rgba(168,200,232,0.62)" }}
        >
          ↑↓ Move · A / Enter Pick
        </div>
      </ShellPanel>
    );
  }

  if (dialog.open) {
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          pulseVirtual("action");
          e.preventDefault();
        }}
        className="block w-full text-left select-none touch-none"
        style={{ background: "transparent", padding: 0, border: 0 }}
        aria-label="Narrative dock. Click to advance dialogue."
      >
        <ShellPanel style={{ minHeight: 112 }}>
          <ShellPanelTitle>{dialog.speaker || "—"}</ShellPanelTitle>
          <div
            className="text-xs leading-snug whitespace-pre-wrap"
            style={{ color: "#eef3ff" }}
          >
            {dialog.text}
            {dialog.typing ? (
              <span
                className="inline-block ml-0.5 align-baseline"
                style={{ color: "#a8c8e8" }}
              >
                ▍
              </span>
            ) : null}
          </div>
          <div
            className="mt-2 text-[10px] uppercase tracking-wider text-right"
            style={{
              color: dialog.waitingForConfirm
                ? "#e8c890"
                : "rgba(168,200,232,0.45)",
            }}
          >
            {dialog.waitingForConfirm ? "Click / Tap / A" : "…"}
          </div>
        </ShellPanel>
      </button>
    );
  }

  return (
    <ShellPanel style={{ minHeight: 112 }}>
      <div className="flex items-center justify-between">
        <ShellPanelTitle>
          {scene.idleTitle || scene.zone || "Atmosphere"}
        </ShellPanelTitle>
        <ShellPanelMeta>{scene.label || "—"}</ShellPanelMeta>
      </div>

      <div
        className="text-xs leading-snug whitespace-pre-line mt-1"
        style={{ color: "#a8c8e8" }}
      >
        {scene.idleBody ||
          (scene.label
            ? `${scene.label} waits in silence.`
            : "The scene keeps its own counsel.")}
      </div>
    </ShellPanel>
  );
}
