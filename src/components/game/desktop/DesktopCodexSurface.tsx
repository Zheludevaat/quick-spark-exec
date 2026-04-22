import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadSave } from "@/game/save";
import { getControls, keyLabel, type GameAction } from "@/game/controls";
import {
  subscribeGameUi,
  getGameUiSnapshot,
} from "@/game/gameUiBridge";
import type { SaveSlot } from "@/game/types";
import {
  getPublicSceneLabel,
  getPublicChapterTitle,
} from "@/game/canon/registry";
import { LORE_ENTRIES, type LoreEntry } from "@/game/scenes/loreData";
import { DesktopSurfaceFrame } from "./DesktopSurfaceFrame";
import type { CodexTabKey } from "./desktopUiModel";
import {
  ShellPanel,
  ShellPanelTitle,
} from "@/components/game/shell/ShellPanel";

const TABS: { key: CodexTabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "inventory", label: "Inventory" },
  { key: "journal", label: "Journal" },
  { key: "lore", label: "Lore" },
  { key: "quests", label: "Quests" },
  { key: "progress", label: "Progress" },
  { key: "controls", label: "Controls" },
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

type Props = {
  initialTab: CodexTabKey;
  onClose: () => void;
};

export function DesktopCodexSurface({ initialTab, onClose }: Props) {
  const [tab, setTab] = useState<CodexTabKey>(initialTab);
  const [save, setSave] = useState<SaveSlot | null>(() => loadSave());
  const [scene, setScene] = useState(() => getGameUiSnapshot().scene);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return subscribeGameUi((s) => setScene(s.scene));
  }, []);

  useEffect(() => {
    const onSaved = () => setSave(loadSave());
    window.addEventListener("hermetic-saved", onSaved);
    return () => window.removeEventListener("hermetic-saved", onSaved);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, {
        capture: true,
      } as EventListenerOptions);
  }, [onClose]);

  const loreEntries: LoreEntry[] = useMemo(() => {
    const ids = save?.lore ?? [];
    return ids.map((id) => LORE_ENTRIES[id]).filter(Boolean) as LoreEntry[];
  }, [save]);

  const controls = useMemo(() => getControls(), []);

  const rail = (
    <div className="flex h-full flex-col gap-2">
      <div>
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "#e8c890" }}
        >
          Codex
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: "#a8c8e8" }}>
          {getPublicSceneLabel(scene.key)}
          {scene.zone ? ` · ${scene.zone}` : ""}
        </div>
      </div>

      <div
        className="rounded p-2"
        style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(168,200,232,0.18)",
        }}
      >
        <div
          className="text-[9px] uppercase tracking-wider"
          style={{ color: "#e8c890" }}
        >
          Current State
        </div>
        <div className="text-[10px] mt-1" style={{ color: "#eef3ff" }}>
          {getPublicChapterTitle(scene.key)}
        </div>
        <div className="text-[10px]" style={{ color: "#a8c8e8" }}>
          ◇ {save?.stats.clarity ?? 0} · ♡ {save?.stats.compassion ?? 0} · ▲{" "}
          {save?.stats.courage ?? 0}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="w-full rounded-md px-3 py-2 text-left text-xs uppercase tracking-wider"
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
    </div>
  );

  return (
    <DesktopSurfaceFrame
      title="Codex"
      subtitle={`${getPublicSceneLabel(scene.key)}${scene.zone ? ` · ${scene.zone}` : ""}`}
      onClose={onClose}
      rail={rail}
      footer="Esc closes · codex unifies overview, inventory, journal, lore, quests, progress, and controls"
    >
      <CodexContent
        tab={tab}
        save={save}
        loreEntries={loreEntries}
        controls={controls}
      />
    </DesktopSurfaceFrame>
  );
}

function CodexContent({
  tab,
  save,
  loreEntries,
  controls,
}: {
  tab: CodexTabKey;
  save: SaveSlot | null;
  loreEntries: LoreEntry[];
  controls: ReturnType<typeof getControls>;
}) {
  if (tab === "overview") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <CodexCard title="Identity">
          <KV label="Calling" value={save?.calling ?? "—"} />
          <KV label="Coherence" value={save?.coherence ?? 0} />
          <KV label="Daimon Bond" value={save?.daimonBond ?? 0} />
          <KV label="Stains Carried" value={save?.stainsCarried ?? 0} />
        </CodexCard>

        <CodexCard title="Stats">
          <KV label="Clarity" value={save?.stats.clarity ?? 0} />
          <KV label="Compassion" value={save?.stats.compassion ?? 0} />
          <KV label="Courage" value={save?.stats.courage ?? 0} />
          <KV label="Souls Completed" value={save?.soulsCompleted ?? 0} />
        </CodexCard>

        <CodexCard title="Witness">
          <KV label="Witness Uses" value={save?.witnessUses ?? 0} />
          <KV label="Fragments" value={save?.fragments ?? 0} />
          <KV
            label="Core Verbs"
            value={
              [
                save?.verbs.witness ? "witness" : null,
                save?.verbs.transmute ? "transmute" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"
            }
          />
        </CodexCard>

        <CodexCard title="State">
          <KV label="Region" value={save?.region ?? "—"} />
          <KV label="Wedding" value={save?.weddingType ?? "—"} />
          <KV label="Inscription" value={save?.act2Inscription ?? "—"} />
          <KV
            label="Sophene"
            value={save?.sorynReleased ? "released" : "bound"}
          />
        </CodexCard>
      </div>
    );
  }

  if (tab === "inventory") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <CodexCard title="Relics">
          <SimpleList items={save?.relics ?? []} empty="No relics carried." />
        </CodexCard>

        <CodexCard title="Work Materials">
          <KV label="Fragments" value={save?.fragments ?? 0} />
          <KV
            label="Carried Shards"
            value={(save?.shardInventory ?? []).length}
          />
          <KV label="Black Stones" value={save?.blackStones ?? 0} />
          <KV label="White Stones" value={save?.whiteStones ?? 0} />
          <KV label="Yellow Stones" value={save?.yellowStones ?? 0} />
          <KV label="Red Stones" value={save?.redStones ?? 0} />
          <KV label="Gold Stone" value={save?.goldStone ? "yes" : "no"} />
        </CodexCard>

        <CodexCard title="Shards" span={2}>
          <SimpleList
            items={save?.shardInventory ?? []}
            empty="No shards held."
          />
        </CodexCard>
      </div>
    );
  }

  if (tab === "journal") {
    return (
      <CodexCard title="Journal Notes" span={2}>
        <SimpleList
          items={save?.soulEventLog ?? []}
          empty="No journal notes recorded yet."
        />
      </CodexCard>
    );
  }

  if (tab === "lore") {
    return (
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <CodexCard title="Entries">
            {loreEntries.length === 0 ? (
              <Empty>Walk. Touch. Listen. The world whispers.</Empty>
            ) : (
              <div className="flex flex-col gap-1">
                {loreEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded px-2 py-1.5"
                    style={{
                      background: "rgba(0,0,0,0.26)",
                      border: "1px solid rgba(168,200,232,0.16)",
                    }}
                  >
                    <div style={{ color: "#eef3ff", fontSize: 11 }}>
                      {entry.title}
                    </div>
                    <div style={{ color: "#a8c8e8", fontSize: 10 }}>
                      {entry.source}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CodexCard>
        </div>

        <div className="col-span-8">
          <CodexCard title="Reading" span={2}>
            {loreEntries.length === 0 ? (
              <Empty>No lore unlocked yet.</Empty>
            ) : (
              <div className="space-y-4">
                {loreEntries.map((entry) => (
                  <div key={entry.id}>
                    <div
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "#e8c890" }}
                    >
                      {entry.title}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "#a8c8e8" }}
                    >
                      {entry.source}
                    </div>
                    <div
                      className="text-xs leading-relaxed whitespace-pre-line mt-2"
                      style={{ color: "#eef3ff" }}
                    >
                      {entry.body.join("\n\n")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CodexCard>
        </div>
      </div>
    );
  }

  if (tab === "quests") {
    return (
      <CodexCard title="Quests" span={2}>
        <SimpleList
          items={Object.entries(save?.sideQuests ?? {}).map(
            ([k, v]) => `${k}: ${v}`,
          )}
          empty="No tracked side quests."
        />
      </CodexCard>
    );
  }

  if (tab === "progress") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <CodexCard title="Garments Released">
          <SimpleList
            items={Object.entries(save?.garmentsReleased ?? {})
              .filter(([, v]) => !!v)
              .map(([k]) => k)}
            empty="None released."
          />
        </CodexCard>

        <CodexCard title="Sphere Verbs">
          <SimpleList
            items={Object.entries(save?.sphereVerbs ?? {})
              .filter(([, v]) => !!v)
              .map(([k]) => k)}
            empty="No sphere verbs yet."
          />
        </CodexCard>

        <CodexCard title="Plateau Notes" span={2}>
          <SimpleList
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
        </CodexCard>
      </div>
    );
  }

  if (tab === "controls") {
    return (
      <CodexCard title="Bindings" span={2}>
        <div className="grid grid-cols-2 gap-2">
          {ACTION_ORDER.map((action) => {
            const binding = controls.bindings[action];
            return (
              <div
                key={action}
                className="flex items-center justify-between rounded px-2 py-1.5"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(168,200,232,0.2)",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: "#a8c8e8" }}
                >
                  {action}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: "#eef3ff" }}
                >
                  {keyLabel(binding.primary)}
                  {binding.secondary
                    ? ` / ${keyLabel(binding.secondary)}`
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      </CodexCard>
    );
  }

  return null;
}

function CodexCard({
  title,
  children,
  span = 1,
}: {
  title: string;
  children: ReactNode;
  span?: number;
}) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <ShellPanel compact tone="subdued" style={{ height: "100%" }}>
        <ShellPanelTitle>{title}</ShellPanelTitle>
        <div className="flex flex-col gap-1">{children}</div>
      </ShellPanel>
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

function SimpleList({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <div
          key={`${item}-${i}`}
          className="text-[11px]"
          style={{ color: "#eef3ff" }}
        >
          · {item}
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px]" style={{ color: "rgba(168,200,232,0.62)" }}>
      {children}
    </div>
  );
}
