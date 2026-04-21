/**
 * Read-only inventory overlay for touch landscape mode.
 *
 * Sections:
 *   1. Relics (save.relics)
 *   2. Work Materials (shardInventory + black/white/yellow/red/gold stones)
 *   3. Garments Released (per-sphere)
 *   4. Sphere Verbs (sphereVerbs booleans)
 *
 * Closed by tapping the close button or pressing virtual B.
 */
import { useEffect, useMemo, useState } from "react";
import { loadSave } from "@/game/save";
import { subscribeVirtualInput } from "@/game/virtualInput";
import type { SaveSlot } from "@/game/types";

type Props = {
  open: boolean;
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

export function TouchInventoryOverlay({ open, onClose }: Props) {
  const [save, setSave] = useState<SaveSlot | null>(null);

  useEffect(() => {
    if (!open) return;
    setSave(loadSave());
  }, [open]);

  // Close on virtual B (cancel) press.
  useEffect(() => {
    if (!open) return;
    return subscribeVirtualInput((e) => {
      if (e.type === "down" && e.action === "cancel") onClose();
      if (e.type === "pulse" && e.action === "cancel") onClose();
    });
  }, [open, onClose]);

  const sections = useMemo(() => {
    if (!save) return null;
    const relics = save.relics ?? [];
    const shardInv = save.shardInventory ?? [];
    const garments = save.garmentsReleased ?? {};
    const verbs = save.sphereVerbs ?? {
      name: false,
      attune: false,
      stand: false,
      weigh: false,
      release: false,
    };
    return { relics, shardInv, garments, verbs };
  }, [save]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center font-mono"
      style={{
        background: "rgba(0,0,0,0.78)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative rounded-lg"
        style={{
          width: "min(94vw, 720px)",
          maxHeight: "92vh",
          background: "linear-gradient(180deg, #0c1428 0%, #050a18 100%)",
          border: "1px solid rgba(168,200,232,0.5)",
          boxShadow: "0 0 30px rgba(74,120,200,0.4)",
          color: "#eef3ff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: "1px solid rgba(168,200,232,0.3)" }}
        >
          <h2
            className="text-sm uppercase tracking-wider"
            style={{ color: "#e8c890" }}
          >
            Inventory
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs"
            style={{
              background: "rgba(216,74,74,0.85)",
              color: "#fff",
              border: "1px solid rgba(255,200,200,0.5)",
            }}
            aria-label="Close inventory"
          >
            CLOSE (B)
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
                {sections.shardInv.length > 0 ? (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(74,120,200,0.25)" }}>
                    <h4
                      className="text-[9px] uppercase tracking-wider mb-1"
                      style={{ color: "#a8c8e8", opacity: 0.85 }}
                    >
                      Carried shard IDs
                    </h4>
                    <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                      {sections.shardInv.map((id, idx) => (
                        <li key={`${id}-${idx}`} style={{ color: "#e8c890" }}>
                          · {id}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 opacity-50 italic" style={{ borderTop: "1px solid rgba(74,120,200,0.25)", color: "#a8c8e8" }}>
                    No carried shards.
                  </div>
                )}
              </Section>
              <Section title="Garments Released">
                {Object.keys(sections.garments).length === 0 ? (
                  <Empty>None released.</Empty>
                ) : (
                  <ul className="space-y-0.5">
                    {Object.entries(sections.garments).map(([k, v]) =>
                      v ? (
                        <li key={k}>
                          · {SPHERE_LABEL[k] ?? k}
                        </li>
                      ) : null,
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
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded p-2"
      style={{
        background: "rgba(20,30,55,0.6)",
        border: "1px solid rgba(74,120,200,0.3)",
      }}
    >
      <h3
        className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: "#a8c8e8" }}
      >
        {title}
      </h3>
      <div style={{ color: "#eef3ff" }}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="opacity-50 italic" style={{ color: "#a8c8e8" }}>
      {children}
    </div>
  );
}
