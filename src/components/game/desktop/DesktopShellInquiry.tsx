/**
 * Desktop inquiry tray — renders the choice list inside the same
 * dialogue tray styling used by GameDialogueTray. Keyboard / virtual
 * input arrives at the canvas-side runInquiry state machine, but the
 * shell can also drive cursor + pick by dispatching the
 * `hermetic-inquiry-cursor` and `hermetic-inquiry-pick` window events.
 */
import { useEffect, useState } from "react";
import {
  subscribeGameUi,
  getGameUiSnapshot,
  type InquirySnapshot,
} from "@/game/gameUiBridge";
import { ShellPanel, ShellPanelTitle } from "@/components/game/shell/ShellPanel";

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

export function DesktopShellInquiry() {
  const [inquiry, setInquiry] = useState<InquirySnapshot>(
    () => getGameUiSnapshot().inquiry,
  );

  useEffect(() => {
    return subscribeGameUi((s) => setInquiry(s.inquiry));
  }, []);

  if (!inquiry.open) return null;

  return (
    <ShellPanel style={{ minHeight: 64 }} tone="accent">
      <ShellPanelTitle>{inquiry.speaker || "—"}</ShellPanelTitle>
      <div
        className="text-xs leading-snug whitespace-pre-wrap mb-2"
        style={{ color: "#eef3ff" }}
      >
        {inquiry.prompt}
      </div>
      <ul className="space-y-0.5 font-mono">
        {inquiry.choices.map((c, i) => {
          const selected = i === inquiry.cursor;
          return (
            <li key={c.id}>
              <button
                type="button"
                onPointerEnter={() => dispatchCursor(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dispatchPick(i);
                }}
                className="w-full text-left px-2 py-1 rounded select-none"
                style={{
                  background: selected
                    ? "rgba(232,200,144,0.12)"
                    : "transparent",
                  color: selected ? "#e8c890" : "#eef3ff",
                  fontSize: 12,
                  border: selected
                    ? "1px solid rgba(232,200,144,0.45)"
                    : "1px solid transparent",
                }}
              >
                <span
                  className="inline-block mr-2"
                  style={{ color: selected ? "#e8c890" : "rgba(168,200,232,0.4)" }}
                >
                  {selected ? "▶" : "·"}
                </span>
                {c.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div
        className="mt-2 text-[10px] uppercase tracking-wider text-right"
        style={{ color: "rgba(168,200,232,0.6)" }}
      >
        ↑↓ MOVE · A / ENTER PICK
      </div>
    </ShellPanel>
  );
}
