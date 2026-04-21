/**
 * Player Hub — folio-style modal overlay opened by the desktop STATS
 * button. Left vertical tab rail, right content field. Reads from the
 * save snapshot and the live UI bridge.
 *
 * Tabs: Overview, Inventory, Journal, Quests, Progress, Controls.
 *
 * Keyboard: ESC closes; movement/action keys are swallowed while open
 * so they don't leak into the Phaser scene.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadSave } from "@/game/save";
import { getControls, keyLabel, type GameAction } from "@/game/controls";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import type { SaveSlot } from "@/game/types";

type TabKey =
  | "overview"
  | "inventory"
  | "journal"
  | "quests"
  | "progress"
  | "controls";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "OVERVIEW" },
  { key: "inventory", label: "INVENTORY" },
  { key: "journal", label: "JOURNAL" },
  { key: "quests", label: "QUESTS" },
  { key: "progress", label: "PROGRESS" },
  { key: "controls", label: "CONTROLS" },
];

const ACTION_ORDER: GameAction[] = [
  "up",
  "down",
  "left",
  "right",
  "action",
  "cancel",
  "lore",
  "settings",
  "skip",
  "mute",
  "lcd",
];

const BLOCKED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "Enter",
  "Escape",
  "KeyQ",
  "KeyL",
  "KeyP",
  "Tab",
]);

export function DesktopPlayerHubOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [save, setSave] = useState<SaveSlot | null>(null);
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    if (!open) return;
    setTab("overview");
    setSave(loadSave());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return subscribeGameUi((s) => {
      setScene(s.scene);
      // Scene transitions usually flush a save; refresh so any
      // newly-persisted state is visible without re-opening.
      setSave(loadSave());
    });
  }, [open]);

  // Live-refresh on save writes (writeSave dispatches "hermetic-saved").
  useEffect(() => {
    if (!open) return;
    const onSaved = () => setSave(loadSave());
    window.addEventListener("hermetic-saved", onSaved);
    return () => window.removeEventListener("hermetic-saved", onSaved);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!BLOCKED_KEYS.has(e.code)) return;
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const controls = useMemo(() => getControls(), []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(2,4,10,0.78)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-lg font-mono flex"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(96vw, 1100px)",
          height: "min(86vh, 720px)",
          background:
            "linear-gradient(180deg, rgba(8,14,28,0.98), rgba(4,8,18,0.98))",
          color: "#eef3ff",
          border: "1px solid rgba(232,200,144,0.5)",
          boxShadow:
            "0 0 40px rgba(74,120,200,0.25), inset 0 0 0 1px rgba(0,0,0,0.5)",
        }}
      >
        {/* Left rail */}
        <div
          className="flex flex-col gap-2 p-4 shrink-0"
          style={{
            width: 220,
            borderRight: "1px solid rgba(168,200,232,0.25)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "#e8c890" }}
          >
            PLAYER HUB
          </div>
          <div className="text-[10px]" style={{ color: "#a8c8e8" }}>
            {scene.label || "—"}
            {scene.zone ? ` · ${scene.zone}` : ""}
          </div>

          <div
            className="mt-3 rounded p-2"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(168,200,232,0.2)",
            }}
          >
            <div
              className="text-[9px] uppercase tracking-wider mb-1"
              style={{ color: "#e8c890" }}
            >
              Current State
            </div>
            <div className="text-[10px]" style={{ color: "#a8c8e8" }}>
              Act {scene.act || "—"}
            </div>
            <div className="text-[10px] mt-1" style={{ color: "#eef3ff" }}>
              ◇ {save?.stats.clarity ?? 0} · ♡ {save?.stats.compassion ?? 0} · ▲ {save?.stats.courage ?? 0}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wider transition-colors"
                style={{
                  background:
                    tab === t.key
                      ? "linear-gradient(180deg, rgba(74,120,200,0.95), rgba(42,53,80,0.95))"
                      : "linear-gradient(180deg, rgba(20,28,48,0.95), rgba(8,12,24,0.95))",
                  color: "#eef3ff",
                  border:
                    tab === t.key
                      ? "1px solid rgba(232,200,144,0.55)"
                      : "1px solid rgba(168,200,232,0.35)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md px-3 py-2 text-xs uppercase tracking-wider"
              style={{
                background: "rgba(216,106,106,0.15)",
                color: "#e8a8a8",
                border: "1px solid rgba(216,106,106,0.45)",
              }}
            >
              CLOSE (ESC)
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto p-5">
          <HubContent tab={tab} save={save} controls={controls} />
        </div>
      </div>
    </div>
  );
}

function HubContent({
  tab,
  save,
  controls,
}: {
  tab: TabKey;
  save: SaveSlot | null;
  controls: ReturnType<typeof getControls>;
}) {
  if (tab === "overview") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card title="Identity" span={1}>
          <KV label="Calling" value={save?.calling ?? "—"} />
          <KV label="Coherence" value={save?.coherence ?? 0} />
          <KV label="Daimon Bond" value={save?.daimonBond ?? 0} />
          <KV label="Stains Carried" value={save?.stainsCarried ?? 0} />
        </Card>

        <Card title="Stats" span={1}>
          <KV label="Clarity" value={save?.stats.clarity ?? 0} />
          <KV label="Compassion" value={save?.stats.compassion ?? 0} />
          <KV label="Courage" value={save?.stats.courage ?? 0} />
        </Card>

        <Card title="Witness" span={1}>
          <KV label="Witness uses" value={save?.witnessUses ?? 0} />
          <KV label="Souls completed" value={save?.soulsCompleted ?? 0} />
          <KV
            label="Verbs"
            value={
              [
                save?.verbs.witness ? "witness" : null,
                save?.verbs.transmute ? "transmute" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"
            }
          />
        </Card>

        <Card title="Region" span={1}>
          <KV label="Region" value={save?.region ?? "—"} />
          <KV
            label="Wedding"
            value={save?.weddingType ?? "—"}
          />
          <KV
            label="Inscription"
            value={save?.act2Inscription ?? "—"}
          />
          <KV
            label="Soryn"
            value={save?.sorynReleased ? "released" : "bound"}
          />
        </Card>
      </div>
    );
  }

  if (tab === "inventory") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card title="Shards" span={2}>
          <List
            items={save?.shardInventory ?? []}
            empty="No shards held."
          />
        </Card>

        <Card title="Stones" span={1}>
          <KV label="Black" value={save?.blackStones ?? 0} />
          <KV label="White" value={save?.whiteStones ?? 0} />
          <KV label="Yellow" value={save?.yellowStones ?? 0} />
          <KV label="Red" value={save?.redStones ?? 0} />
          <KV label="Gold" value={save?.goldStone ? "✓" : "—"} />
        </Card>

        <Card title="Relics" span={1}>
          <List items={save?.relics ?? []} empty="No relics gathered." />
        </Card>

        <Card title="Fragments" span={2}>
          <KV label="Memory fragments" value={save?.fragments ?? 0} />
          <KV label="Shard fragments" value={save?.shardFragments ?? 0} />
        </Card>
      </div>
    );
  }

  if (tab === "journal") {
    return (
      <Card title="Lore" span={2}>
        <List items={save?.lore ?? []} empty="No lore unlocked yet." />
      </Card>
    );
  }

  if (tab === "quests") {
    return (
      <Card title="Side Quests" span={2}>
        <List
          items={Object.entries(save?.sideQuests ?? {}).map(
            ([k, v]) => `${k}: ${v}`,
          )}
          empty="No tracked side quests."
        />
      </Card>
    );
  }

  if (tab === "progress") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card title="Garments Released" span={1}>
          <List
            items={Object.entries(save?.garmentsReleased ?? {})
              .filter(([, v]) => !!v)
              .map(([k]) => k)}
            empty="None released."
          />
        </Card>

        <Card title="Sphere Verbs" span={1}>
          <List
            items={Object.entries(save?.sphereVerbs ?? {})
              .filter(([, v]) => !!v)
              .map(([k]) => k)}
            empty="No sphere verbs yet."
          />
        </Card>

        <Card title="Plateau Notes" span={2}>
          <List
            items={[
              ...Object.entries(save?.plateauSettled ?? {})
                .filter(([, v]) => !!v)
                .map(([k]) => `settled:${k}`),
              ...(save?.sorynReleased ? ["soryn_released"] : []),
              ...(save?.weddingType ? [`wedding:${save.weddingType}`] : []),
              ...(save?.act2Inscription
                ? [`inscription:${save.act2Inscription}`]
                : []),
            ]}
            empty="No marked progress notes."
          />
        </Card>
      </div>
    );
  }

  if (tab === "controls") {
    return (
      <Card title="Key Bindings" span={2}>
        <div className="grid grid-cols-2 gap-2">
          {ACTION_ORDER.map((a) => {
            const b = controls.bindings[a];
            return (
              <div
                key={a}
                className="flex items-center justify-between px-2 py-1 rounded"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(168,200,232,0.2)",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "#a8c8e8" }}
                >
                  {a.toUpperCase()}
                </span>
                <span className="text-[10px]" style={{ color: "#eef3ff" }}>
                  {keyLabel(b.primary)}
                  {b.secondary ? ` / ${keyLabel(b.secondary)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return null;
}

function Card({
  title,
  span,
  children,
}: {
  title: string;
  span: number;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded p-3"
      style={{
        gridColumn: `span ${span} / span ${span}`,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(168,200,232,0.25)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider mb-2"
        style={{ color: "#e8c890" }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: "#a8c8e8" }}>{label}</span>
      <span style={{ color: "#eef3ff" }}>{value}</span>
    </div>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) {
    return (
      <div className="text-[11px]" style={{ color: "rgba(168,200,232,0.6)" }}>
        {empty}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <div key={i} className="text-[11px]" style={{ color: "#eef3ff" }}>
          · {item}
        </div>
      ))}
    </div>
  );
}
