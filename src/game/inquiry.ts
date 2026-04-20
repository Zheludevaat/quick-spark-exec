import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "./gbcArt";
import { getAudio } from "./audio";

export type InquiryChoice = "observe" | "ask" | "confess" | "silent";

export type InquiryOption = {
  choice: InquiryChoice;
  label: string;
  /** Reply line shown after choosing (UPPERCASED in render). */
  reply: string;
};

/**
 * A small four-option inquiry wheel. Renders inside the standard dialog box,
 * waits for the player to pick one, then resolves with their choice.
 */
export function runInquiry(
  scene: Phaser.Scene,
  prompt: { who: string; text: string },
  options: InquiryOption[],
  onDone: (picked: InquiryOption) => void,
) {
  const boxX = 4, boxY = GBC_H - 64, boxW = GBC_W - 8, boxH = 60;
  const box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
  const who = new GBCText(scene, boxX + 6, boxY + 4, prompt.who.toUpperCase(), { color: COLOR.textAccent, depth: 251, scrollFactor: 0 });
  const text = new GBCText(scene, boxX + 6, boxY + 14, prompt.text.toUpperCase(), {
    color: COLOR.textLight, depth: 251, scrollFactor: 0, maxWidthPx: boxW - 16,
  });

  let cursor = 0;
  const opts: GBCText[] = [];
  options.forEach((o, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = boxX + 14 + col * 70;
    const y = boxY + 36 + row * 10;
    const t = new GBCText(scene, x, y, o.label.toUpperCase(), { color: COLOR.textLight, depth: 251, scrollFactor: 0 });
    t.obj.setInteractive({ useHandCursor: true });
    t.obj.on("pointerdown", () => { cursor = i; refresh(); pick(); });
    opts.push(t);
  });
  const mark = new GBCText(scene, boxX + 6, boxY + 36, "▶", { color: COLOR.textGold, depth: 251, scrollFactor: 0 });

  const refresh = () => {
    opts.forEach((t, i) => t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight));
    const col = cursor % 2;
    const row = Math.floor(cursor / 2);
    mark.setPosition(boxX + 6 + col * 70, boxY + 36 + row * 10);
  };
  refresh();

  const move = (d: number) => {
    cursor = (cursor + d + options.length) % options.length;
    getAudio().sfx("cursor");
    refresh();
  };

  const pick = () => {
    cleanup();
    const picked = options[cursor];
    getAudio().sfx("confirm");
    // Briefly show the reply via a small in-line dialog before resolving.
    const replyBox = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
    const replyWho = new GBCText(scene, boxX + 6, boxY + 4, prompt.who.toUpperCase(), { color: COLOR.textAccent, depth: 251, scrollFactor: 0 });
    const replyText = new GBCText(scene, boxX + 6, boxY + 16, picked.reply.toUpperCase(), {
      color: COLOR.textLight, depth: 251, scrollFactor: 0, maxWidthPx: boxW - 16,
    });
    const hint = new GBCText(scene, boxX + boxW - 10, boxY + boxH - 8, "▼", { color: COLOR.textAccent, depth: 251, scrollFactor: 0 });
    scene.tweens.add({ targets: hint.obj, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    const dismiss = () => {
      replyBox.destroy(); replyWho.destroy(); replyText.destroy(); hint.destroy();
      scene.input.keyboard?.off("keydown-SPACE", dismiss);
      scene.input.keyboard?.off("keydown-ENTER", dismiss);
      scene.events.off("vinput-action", dismiss);
      scene.input.off("pointerdown", dismiss);
      onDone(picked);
    };
    scene.input.keyboard?.on("keydown-SPACE", dismiss);
    scene.input.keyboard?.on("keydown-ENTER", dismiss);
    scene.events.on("vinput-action", dismiss);
    scene.time.delayedCall(150, () => scene.input.on("pointerdown", dismiss));
  };

  const cleanup = () => {
    box.destroy(); who.destroy(); text.destroy(); mark.destroy();
    opts.forEach(t => t.destroy());
    scene.input.keyboard?.off("keydown-LEFT", left);
    scene.input.keyboard?.off("keydown-RIGHT", right);
    scene.input.keyboard?.off("keydown-UP", up);
    scene.input.keyboard?.off("keydown-DOWN", down);
    scene.input.keyboard?.off("keydown-SPACE", pick);
    scene.input.keyboard?.off("keydown-ENTER", pick);
    scene.events.off("vinput-action", pick);
    scene.events.off("vinput-down", vmove);
  };

  const left = () => move(-1);
  const right = () => move(1);
  const up = () => move(-2);
  const down = () => move(2);
  const vmove = (dir: string) => {
    if (dir === "left") move(-1);
    if (dir === "right") move(1);
    if (dir === "up") move(-2);
    if (dir === "down") move(2);
  };
  scene.input.keyboard?.on("keydown-LEFT", left);
  scene.input.keyboard?.on("keydown-RIGHT", right);
  scene.input.keyboard?.on("keydown-UP", up);
  scene.input.keyboard?.on("keydown-DOWN", down);
  scene.input.keyboard?.on("keydown-SPACE", pick);
  scene.input.keyboard?.on("keydown-ENTER", pick);
  scene.events.on("vinput-action", pick);
  scene.events.on("vinput-down", vmove);
}
