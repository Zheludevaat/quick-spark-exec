import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { getAudio } from "../audio";
import { onActionDown, onDirection } from "../controls";

export type LoreEntry = {
  id: string;
  title: string;
  /** Source line, like "POSTCARD ON THE DESK" or "MARGIN NOTE". */
  source: string;
  /** Body lines (already uppercase-friendly). */
  body: string[];
};

/**
 * The lore log. Keep entries terse — GBC dialog box can render only ~3 short lines.
 * Tone: melancholic-mythic with absurd edges. Plotinus by way of a thrift-store paperback.
 */
export const LORE_ENTRIES: Record<string, LoreEntry> = {
  // ===== Act 0 — Last Day =====
  postcard_seaside: {
    id: "postcard_seaside",
    title: "A POSTCARD",
    source: "POSTCARD ON THE DESK",
    body: [
      "WISH YOU WERE HERE.",
      "ACTUALLY I DON'T. THE GULLS ARE LOUD AND",
      "I'VE STARTED TALKING TO THEM. — D.",
    ],
  },
  margin_plotinus: {
    id: "margin_plotinus",
    title: "MARGIN NOTE",
    source: "INSIDE A SECOND-HAND BOOK",
    body: [
      '"WITHDRAW INTO YOURSELF AND LOOK."',
      "SOMEONE CIRCLED THIS IN PENCIL AND WROTE:",
      '"OK BUT WHEN."',
    ],
  },
  // ===== Act 0 — Crossing =====
  refusal_kitchen: {
    id: "refusal_kitchen",
    title: "DOOR I — KITCHEN",
    source: "REFUSAL DOOR",
    body: [
      "THE KETTLE STILL WHISTLING. TWO CUPS.",
      "ONE OF THEM IS YOURS. YOU CAN'T REMEMBER",
      "WHICH. IT FEELS IMPORTANT TO REMEMBER.",
    ],
  },
  refusal_phone: {
    id: "refusal_phone",
    title: "DOOR II — PHONE",
    source: "REFUSAL DOOR",
    body: [
      "MARA IS LEAVING A VOICEMAIL.",
      "SHE SAYS YOUR NAME LIKE A QUESTION.",
      "YOU LISTEN UNTIL THE BEEP. THEN AGAIN.",
    ],
  },
  refusal_window: {
    id: "refusal_window",
    title: "DOOR III — WINDOW",
    source: "REFUSAL DOOR",
    body: [
      "THE CHILD ACROSS THE STREET HAS GROWN.",
      "STILL WAVING. AT NO ONE NOW.",
      "OR AT EVERYONE. IT'S HARD TO TELL FROM HERE.",
    ],
  },
  wanderer_brief: {
    id: "wanderer_brief",
    title: "THE OTHER WALKER",
    source: "MET IN THE CROSSING",
    body: [
      "A SHAPE WALKING THE OTHER WAY.",
      '"YOU\'RE THE SECOND ONE TODAY," IT SAID.',
      "IT DID NOT CLARIFY THE FIRST.",
    ],
  },
};

/** Idempotently unlock a lore entry. Returns true if it was newly unlocked. */
export function unlockLore(save: SaveSlot, id: string): boolean {
  if (!LORE_ENTRIES[id]) return false;
  if (save.lore.includes(id)) return false;
  save.lore.push(id);
  writeSave(save);
  return true;
}

/**
 * Show a small "+ LORE: title" toast at the top-center of the screen.
 * Auto-dismisses. Safe to call from any scene.
 */
export function showLoreToast(scene: Phaser.Scene, id: string) {
  const e = LORE_ENTRIES[id];
  if (!e) return;
  const t = new GBCText(scene, GBC_W / 2 - 40, 26, `+ LORE: ${e.title}`, {
    color: COLOR.textGold,
    depth: 240,
    scrollFactor: 0,
  });
  scene.tweens.add({
    targets: t.obj,
    y: 16,
    alpha: 0,
    duration: 1800,
    delay: 600,
    onComplete: () => t.destroy(),
  });
  getAudio().sfx("confirm");
}

/**
 * Open a full-screen lore log overlay. Pauses input flow for the calling scene
 * (caller is responsible for guarding update with a flag during open).
 *
 * Navigation: UP/DOWN cycle entries, A/SPACE/ENTER closes. ESC also closes.
 */
export function openLoreLog(scene: Phaser.Scene, save: SaveSlot, onClose?: () => void) {
  const ids = save.lore.slice();
  const dim = scene.add
    .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.78)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(900);
  const box = drawGBCBox(scene, 6, 14, GBC_W - 12, GBC_H - 28, 901);
  const title = new GBCText(scene, 12, 18, "LORE LOG", {
    color: COLOR.textAccent,
    depth: 902,
    scrollFactor: 0,
  });
  const counter = new GBCText(scene, GBC_W - 40, 18, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  const srcText = new GBCText(scene, 12, 30, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  const body = new GBCText(scene, 12, 42, "", {
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

  let idx = 0;
  const render = () => {
    if (ids.length === 0) {
      title.setText("LORE LOG");
      counter.setText("");
      srcText.setText("(EMPTY)");
      body.setText("WALK. TOUCH. LISTEN. THE WORLD WHISPERS.");
      return;
    }
    const e = LORE_ENTRIES[ids[idx]];
    if (!e) return;
    title.setText(e.title);
    counter.setText(`${idx + 1}/${ids.length}`);
    srcText.setText(e.source);
    body.setText(e.body.join(" "));
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
    title.destroy();
    counter.destroy();
    srcText.destroy();
    body.destroy();
    hint.destroy();
    onClose?.();
  };
  const up = () => {
    if (ids.length === 0) return;
    idx = (idx - 1 + ids.length) % ids.length;
    render();
    getAudio().sfx("cursor");
  };
  const down = () => {
    if (ids.length === 0) return;
    idx = (idx + 1) % ids.length;
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
