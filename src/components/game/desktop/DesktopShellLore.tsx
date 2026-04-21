/**
 * Desktop shell lore log.
 *
 * Reads unlocked lore IDs from the save file, renders them as a list +
 * detail panel. Closes by firing `hermetic-lore-close` so attachHUD's
 * listener can release the scene-side overlay flag.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadSave } from "@/game/save";
import { LORE_ENTRIES, type LoreEntry } from "@/game/scenes/lore";
import {
  ShellPanel,
  ShellPanelTitle,
  ShellPanelMeta,
} from "@/components/game/shell/ShellPanel";

function close() {
  window.dispatchEvent(new Event("hermetic-lore-close"));
}

export function DesktopShellLore() {
  const [cursor, setCursor] = useState(0);

  const ids = useMemo(() => {
    const save = loadSave();
    return save?.lore ?? [];
  }, []);

  const entries: LoreEntry[] = useMemo(
    () => ids.map((id) => LORE_ENTRIES[id]).filter(Boolean) as LoreEntry[],
    [ids],
  );

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, entries.length - 1)));
  }, [entries.length]);

  const move = useCallback(
    (dir: 1 | -1) => {
      if (entries.length === 0) return;
      setCursor((c) => (c + dir + entries.length) % entries.length);
    },
    [entries.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape" || k === "l" || k === "L" || k === " " || k === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (k === "ArrowUp" || k === "w" || k === "W") {
        e.preventDefault();
        e.stopPropagation();
        move(-1);
        return;
      }
      if (k === "ArrowDown" || k === "s" || k === "S") {
        e.preventDefault();
        e.stopPropagation();
        move(1);
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [move]);

  const active = entries[cursor];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center font-mono"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ShellPanel
        tone="accent"
        style={{
          width: "min(92vw, 720px)",
          maxHeight: "88vh",
          padding: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <header
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "1px solid rgba(168,200,232,0.3)" }}
        >
          <ShellPanelTitle style={{ marginBottom: 0 }}>
            LORE LOG{" "}
            {entries.length > 0 && (
              <span style={{ color: "#a8c8e8", marginLeft: 8 }}>
                {cursor + 1}/{entries.length}
              </span>
            )}
          </ShellPanelTitle>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 text-xs"
            style={{
              background: "rgba(216,74,74,0.85)",
              color: "#fff",
              border: "1px solid rgba(255,200,200,0.5)",
            }}
          >
            CLOSE (L / ESC)
          </button>
        </header>
        <div
          className="overflow-hidden grid"
          style={{
            gridTemplateColumns: "240px 1fr",
            minHeight: 0,
          }}
        >
          <aside
            className="overflow-y-auto px-2 py-2 space-y-0.5"
            style={{ borderRight: "1px solid rgba(168,200,232,0.18)" }}
          >
            {entries.length === 0 && (
              <div
                className="text-xs italic px-2 py-3 opacity-70"
                style={{ color: "#a8c8e8" }}
              >
                Walk. Touch. Listen. The world whispers.
              </div>
            )}
            {entries.map((e, i) => {
              const selected = i === cursor;
              return (
                <button
                  key={e.id}
                  type="button"
                  onPointerEnter={() => setCursor(i)}
                  onPointerDown={(ev) => {
                    ev.preventDefault();
                    setCursor(i);
                  }}
                  className="block w-full text-left rounded px-2 py-1.5 text-xs"
                  style={{
                    background: selected ? "rgba(232,200,144,0.12)" : "transparent",
                    color: selected ? "#e8c890" : "#eef3ff",
                    border: selected
                      ? "1px solid rgba(232,200,144,0.45)"
                      : "1px solid transparent",
                  }}
                >
                  <div className="font-semibold">{e.title}</div>
                  <div
                    className="text-[10px] uppercase tracking-wider mt-0.5"
                    style={{ color: "#a8c8e8", opacity: 0.8 }}
                  >
                    {e.source}
                  </div>
                </button>
              );
            })}
          </aside>
          <article className="overflow-y-auto px-4 py-3">
            {active ? (
              <>
                <ShellPanelTitle>{active.title}</ShellPanelTitle>
                <ShellPanelMeta>{active.source}</ShellPanelMeta>
                <div
                  className="text-sm leading-relaxed mt-3 whitespace-pre-line"
                  style={{ color: "#eef3ff" }}
                >
                  {active.body.join("\n\n")}
                </div>
              </>
            ) : (
              <div
                className="text-xs italic mt-2"
                style={{ color: "#a8c8e8" }}
              >
                No entry selected.
              </div>
            )}
          </article>
        </div>
        <footer
          className="px-4 py-2 text-[10px] uppercase tracking-wider"
          style={{
            color: "rgba(168,200,232,0.6)",
            borderTop: "1px solid rgba(168,200,232,0.2)",
          }}
        >
          ↑↓ NEXT · A / ENTER / L / ESC CLOSE
        </footer>
      </ShellPanel>
    </div>
  );
}
