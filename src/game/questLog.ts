import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, fitSingleLineText } from "./gbcArt";
import type { SaveSlot } from "./types";
import { getAudio } from "./audio";
import { onActionDown, onDirection } from "./controls";
import { SIDE_QUEST_TITLES, SIDE_QUEST_NEXT_HINT, type SideQuestId } from "./sideQuests";

/**
 * Full-screen quest-log overlay. Mirrors the lore log layout. Shows active
 * quests first, then completed. Each quest can carry a hint pointing to its
 * follow-up (chain encoded in `SIDE_QUEST_NEXT_HINT`).
 */
export function openQuestLog(scene: Phaser.Scene, save: SaveSlot, onClose?: () => void) {
  const allIds = Object.keys(SIDE_QUEST_TITLES) as SideQuestId[];
  const ordered = [
    ...allIds.filter((id) => save.sideQuests[id] === "active"),
    ...allIds.filter((id) => save.sideQuests[id] === "done"),
  ];

  const dim = scene.add
    .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.78)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(900);
  const box = drawGBCBox(scene, 6, 14, GBC_W - 12, GBC_H - 28, 901);
  // Row 1: static section title + counter
  const sectionTitle = new GBCText(scene, 12, 18, "QUEST LOG", {
    color: COLOR.textAccent,
    depth: 902,
    scrollFactor: 0,
  });
  const counter = new GBCText(scene, GBC_W - 40, 18, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  // Row 2: quest title (single-line fit)
  const questTitle = new GBCText(scene, 12, 30, "", {
    color: COLOR.textGold,
    depth: 902,
    scrollFactor: 0,
  });
  // Row 3: status (single-line fit)
  const status = new GBCText(scene, 12, 40, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  const body = new GBCText(scene, 12, 52, "", {
    color: COLOR.textLight,
    depth: 902,
    scrollFactor: 0,
    maxWidthPx: GBC_W - 24,
  });
  const hint = new GBCText(scene, 12, GBC_H - 20, "↑↓ NEXT  A CLOSE", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });

  const FIT_W = GBC_W - 24;
  let idx = 0;
  const render = () => {
    if (ordered.length === 0) {
      counter.setText("");
      questTitle.setText(fitSingleLineText("(NO QUESTS YET)", FIT_W));
      status.setText("");
      body.setText("WALK. SPEAK. SOULS WILL ASK.");
      return;
    }
    const id = ordered[idx];
    const st = save.sideQuests[id];
    questTitle.setText(fitSingleLineText(SIDE_QUEST_TITLES[id], FIT_W));
    counter.setText(`${idx + 1}/${ordered.length}`);
    const statusText = st === "done" ? "✓ DONE" : "● ACTIVE";
    status.setText(fitSingleLineText(statusText, FIT_W));
    status.setColor(st === "done" ? COLOR.textGold : COLOR.textAccent);
    const next = SIDE_QUEST_NEXT_HINT[id];
    if (st === "done" && next && save.sideQuests[next] !== "done") {
      body.setText(`AFTERMATH: ${SIDE_QUEST_TITLES[next]}`);
    } else {
      body.setText(questHint(id, save));
    }
  };
  render();

  let unbindAction: (() => void) | null = null;
  let unbindCancel: (() => void) | null = null;
  let unbindSettings: (() => void) | null = null;
  let unbindDir: (() => void) | null = null;
  const cleanup = () => {
    unbindAction?.();
    unbindCancel?.();
    unbindSettings?.();
    unbindDir?.();
    scene.events.off("vinput-action", close);
    scene.events.off("vinput-cancel", close);
    dim.destroy();
    box.destroy();
    sectionTitle.destroy();
    counter.destroy();
    questTitle.destroy();
    status.destroy();
    body.destroy();
    hint.destroy();
    onClose?.();
  };
  const up = () => {
    if (ordered.length === 0) return;
    idx = (idx - 1 + ordered.length) % ordered.length;
    render();
    getAudio().sfx("cursor");
  };
  const down = () => {
    if (ordered.length === 0) return;
    idx = (idx + 1) % ordered.length;
    render();
    getAudio().sfx("cursor");
  };
  const close = () => {
    getAudio().sfx("cancel");
    cleanup();
  };
  unbindAction = onActionDown(scene, "action", close);
  unbindCancel = onActionDown(scene, "cancel", close);
  unbindSettings = onActionDown(scene, "settings", close);
  unbindDir = onDirection(scene, (d) => {
    if (d === "up") up();
    else if (d === "down") down();
  });
  scene.events.on("vinput-action", close);
  scene.events.on("vinput-cancel", close);
}

function questHint(id: SideQuestId, save: SaveSlot): string {
  switch (id) {
    case "all_seeds_lastday":
      return "TOUCH EVERY SEED IN THE FLAT BEFORE YOU LEAVE.";
    case "all_echoes_field":
      {
        const refs = ["seed_call", "seed_window", "seed_kettle", "seed_coat", "seed_mirror"];
        const got = refs.filter((s) => save.seedEchoes[s]).length;
        return `MOTES TOUCHED: ${got}/${refs.length}. WALK THE FIELD.`;
      }
    case "release_lantern":
      return "FIND THE LANTERN. RELEASE IT, DON'T HOLD IT.";
    case "chart_the_pools":
      return "RETURN TO THE POOLS. STAND WHERE EACH POOL SHIMMERS.";
    case "feed_the_collector":
      {
        const got = Object.keys(save.seedEchoes).length;
        return `BRING THE COLLECTOR ECHOES. (${got} TOUCHED)`;
      }
    case "name_the_stonechild":
      return "OBSERVE THREE LANTERNS NEAR THE STONECHILD. RETURN.";
    case "the_unfinished_song":
      return "ANSWER THE DROWNED ONE. PANSIES ARE FOR — ?";
    case "weigh_the_feather":
      return "STAND STILL FOR HER. EIGHT SECONDS WITHOUT MOVING.";
    case "witness_the_saint":
      return "REFUSE HER GIFT. THEN STAY. WITNESS, NOT GIVE.";
    case "salvage_a_shard":
      return "RETURN TO THE BATH. THE SHARD STILL FLOATS.";
    case "read_the_fourth_book":
      return "ASK THE LIBRARIAN AGAIN. SHE LIES BY OMISSION.";
    case "meet_the_thirteenth":
      return "TWELVE SOULS WALKED IN. ONE STILL WAITS.";
    case "release_soryn":
      return "AT THE WEDDING TABLE. THANK HER. LET HER GO.";
  }
}
