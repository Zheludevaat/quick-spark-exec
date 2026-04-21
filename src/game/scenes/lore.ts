import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, fitSingleLineText } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { getAudio } from "../audio";
import { onActionDown, onDirection } from "../controls";

export { LORE_ENTRIES, type LoreEntry } from "./loreData";
import { LORE_ENTRIES } from "./loreData";

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
  // Row 1: static section title + counter (separate columns, never collide)
  const sectionTitle = new GBCText(scene, 12, 18, "LORE LOG", {
    color: COLOR.textAccent,
    depth: 902,
    scrollFactor: 0,
  });
  const counter = new GBCText(scene, GBC_W - 40, 18, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  // Row 2: entry title (single-line fit)
  const entryTitle = new GBCText(scene, 12, 30, "", {
    color: COLOR.textGold,
    depth: 902,
    scrollFactor: 0,
  });
  // Row 3: source (single-line fit)
  const srcText = new GBCText(scene, 12, 40, "", {
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
    if (ids.length === 0) {
      counter.setText("");
      entryTitle.setText(fitSingleLineText("(EMPTY)", FIT_W));
      srcText.setText("");
      body.setText("WALK. TOUCH. LISTEN. THE WORLD WHISPERS.");
      return;
    }
    const e = LORE_ENTRIES[ids[idx]];
    if (!e) return;
    counter.setText(`${idx + 1}/${ids.length}`);
    entryTitle.setText(fitSingleLineText(e.title, FIT_W));
    srcText.setText(fitSingleLineText(e.source, FIT_W));
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
    sectionTitle.destroy();
    counter.destroy();
    entryTitle.destroy();
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
