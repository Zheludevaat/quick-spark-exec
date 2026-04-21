/**
 * Desktop shell inventory overlay. Mirrors TouchInventoryOverlay, but
 * scoped to the desktop modal stack and using ESC to close.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadSave } from "@/game/save";
import type { SaveSlot } from "@/game/types";
import {
  ShellPanel,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

type Props = {
  onClose: () => void;
};

const SPHERE_LABEL: Record<string, string> = {
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  sun: "Sun",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
};

const VERB_LABEL: Record<string, string> = {
  name: "Name",
  attune: "Attune",
  stand: "Stand",
  weigh: "Weigh",
  release: "Release",
};

export function DesktopShellInventory({ onClose }: Props) {
  const [save] = useState<SaveSlot | null>(() => loadSave());

  const safeClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape" || k === "i" || k === "I" || k === "b" || k === "B") {
        e.preventDefault();
        e.stopPropagation();
        safeClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [safeClose]);

  const sections = useMemo(() => {
    if (!save) return null;
    return {
      relics: save.relics ?? [],
      shardInv: save.shardInventory ?? [],
      garments: save.garmentsReleased ?? {},
      verbs:
        save.sphereVerbs ?? {
          name: false,
          attune: false,
          stand: false,
          weigh: false,
          release: false,
        },
    };
  }, [save]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center font-mono"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ShellPanel
        tone="accent"
        style={{
          width: "min(94vw, 720px)",
          maxHeight: "92vh",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "1px solid rgba(168,200,232,0.3)" }}
        >
          <ShellPanelTitle style={{ marginBottom: 0 }}>INVENTORY</ShellPanelTitle>
          <button
            type="button"
            onClick={safeClose}
            className="rounded px-2 py-1 text-xs"
            style={{
              background: "rgba(216,74,74,0.85)",
              color: "#fff",
              border: "1px solid rgba(255,200,200,0.5)",
            }}
          >
            CLOSE (ESC)
          </button>
        </header>
        <div
          className="overflow-y-auto px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
          style={{ flex: 1 }}
        >
          {!sections && (
            <div
              className="col-span-full text-center py-8 opacity-60"
              style={{ color: "#a8c8e8" }}
            >
              No save loaded yet.
            </div>
          )}
          {sections && (
            <>
              <Section title="Relics">
                {sections.relics.length === 0 ? (
                  <Empty>No relics carried.</Empty>
                ) : (
                  <ul className="space-y-0.5">
                    {sections.relics.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Work Materials">
                <ul className="space-y-0.5">
                  <li>Fragments: {save?.fragments ?? 0}</li>
                  <li>Carried shards: {sections.shardInv.length}</li>
                  <li>Black stones: {save?.blackStones ?? 0}</li>
                  <li>White stones: {save?.whiteStones ?? 0}</li>
                  <li>Yellow stones: {save?.yellowStones ?? 0}</li>
                  <li>Red stones: {save?.redStones ?? 0}</li>
                  <li>Gold stone: {save?.goldStone ? "yes" : "no"}</li>
                </ul>
              </Section>
              <Section title="Garments Released">
                {Object.values(sections.garments).every((v) => !v) ? (
                  <Empty>None released.</Empty>
                ) : (
                  <ul className="space-y-0.5">
                    {Object.entries(sections.garments).map(([k, v]) =>
                      v ? <li key={k}>· {SPHERE_LABEL[k] ?? k}</li> : null,
                    )}
                  </ul>
                )}
              </Section>
              <Section title="Sphere Verbs">
                <ul className="space-y-0.5">
                  {Object.entries(sections.verbs).map(([k, v]) => (
                    <li
                      key={k}
                      style={{ color: v ? "#e8c890" : "rgba(200,210,230,0.4)" }}
                    >
                      {v ? "✓" : "·"} {VERB_LABEL[k] ?? k}
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>
      </ShellPanel>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ShellPanel compact tone="subdued">
      <ShellPanelTitle style={{ color: "#a8c8e8", marginBottom: 6 }}>
        {title}
      </ShellPanelTitle>
      <div style={{ color: "#eef3ff" }}>{children}</div>
    </ShellPanel>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="opacity-50 italic" style={{ color: "#a8c8e8" }}>
      {children}
    </div>
  );
}
