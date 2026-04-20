import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, wrapText } from "./gbcArt";
import { getAudio } from "./audio";
import { onActionDown, onDirection } from "./controls";

export type InquiryChoice = "observe" | "ask" | "confess" | "silent";

export type InquiryOption = {
  choice: InquiryChoice;
  label: string;
  /** Reply line shown after choosing (UPPERCASED in render). */
  reply: string;
};

const LINE_H = 9; // px per text line (7 glyph + 2 leading)
const PAD = 6;

/**
 * A small inquiry list. Renders inside a dynamically-sized dialog box so the
 * prompt and option labels never overlap, regardless of length.
 */
export function runInquiry(
  scene: Phaser.Scene,
  prompt: { who: string; text: string },
  options: InquiryOption[],
  onDone: (picked: InquiryOption) => void,
) {
  const boxW = GBC_W - 8;
  const innerW = boxW - PAD * 2;
  const promptText = prompt.text.toUpperCase();
  const promptLines = wrapText(promptText, innerW);

  // Layout: who(1) + prompt(N) + 1 spacer + options(M) + 1 hint pad
  const totalLines = 1 + promptLines.length + 1 + options.length + 1;
  const boxH = Math.min(GBC_H - 14, totalLines * LINE_H + PAD * 2);
  const boxX = 4;
  const boxY = GBC_H - boxH - 2;

  const box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
  const who = new GBCText(scene, boxX + PAD, boxY + 4, prompt.who.toUpperCase(), {
    color: COLOR.textAccent,
    depth: 251,
    scrollFactor: 0,
  });
  const text = new GBCText(scene, boxX + PAD, boxY + 4 + LINE_H, promptText, {
    color: COLOR.textLight,
    depth: 251,
    scrollFactor: 0,
    maxWidthPx: innerW,
  });

  // Options: one per line, marker on the left.
  const optionsTop = boxY + 4 + LINE_H + promptLines.length * LINE_H + LINE_H;
  let cursor = 0;
  const opts: GBCText[] = [];
  options.forEach((o, i) => {
    const y = optionsTop + i * LINE_H;
    const t = new GBCText(scene, boxX + PAD + 8, y, o.label.toUpperCase(), {
      color: COLOR.textLight,
      depth: 251,
      scrollFactor: 0,
      maxWidthPx: innerW - 8,
    });
    t.obj.setInteractive({ useHandCursor: true });
    t.obj.on("pointerdown", () => {
      cursor = i;
      refresh();
      pick();
    });
    opts.push(t);
  });
  const mark = new GBCText(scene, boxX + PAD, optionsTop, "▶", {
    color: COLOR.textGold,
    depth: 251,
    scrollFactor: 0,
  });

  const refresh = () => {
    opts.forEach((t, i) => t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight));
    mark.setPosition(boxX + PAD, optionsTop + cursor * LINE_H);
  };
  refresh();

  const move = (d: number) => {
    cursor = (cursor + d + options.length) % options.length;
    getAudio().sfx("cursor");
    refresh();
  };

  let unbindAct: (() => void) | null = null;
  let unbindDir: (() => void) | null = null;

  const pick = () => {
    cleanup();
    const picked = options[cursor];
    getAudio().sfx("confirm");

    // Reply: dynamically sized like the prompt.
    const replyText = picked.reply.toUpperCase();
    const replyLines = wrapText(replyText, innerW);
    const rTotal = 1 + replyLines.length + 1;
    const rBoxH = Math.min(GBC_H - 14, rTotal * LINE_H + PAD * 2);
    const rBoxY = GBC_H - rBoxH - 2;
    const replyBox = drawGBCBox(scene, boxX, rBoxY, boxW, rBoxH, 250);
    const replyWho = new GBCText(scene, boxX + PAD, rBoxY + 4, prompt.who.toUpperCase(), {
      color: COLOR.textAccent,
      depth: 251,
      scrollFactor: 0,
    });
    const replyBody = new GBCText(scene, boxX + PAD, rBoxY + 4 + LINE_H, replyText, {
      color: COLOR.textLight,
      depth: 251,
      scrollFactor: 0,
      maxWidthPx: innerW,
    });
    const hint = new GBCText(scene, boxX + boxW - 10, rBoxY + rBoxH - 8, "▼", {
      color: COLOR.textAccent,
      depth: 251,
      scrollFactor: 0,
    });
    scene.tweens.add({ targets: hint.obj, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    let dismissed = false;
    let unbindReplyAct: (() => void) | null = null;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      replyBox.destroy();
      replyWho.destroy();
      replyBody.destroy();
      hint.destroy();
      unbindReplyAct?.();
      scene.events.off("vinput-action", dismiss);
      scene.input.off("pointerdown", dismiss);
      onDone(picked);
    };
    unbindReplyAct = onActionDown(scene, "action", dismiss);
    scene.events.on("vinput-action", dismiss);
    scene.time.delayedCall(150, () => scene.input.on("pointerdown", dismiss));
  };

  const cleanup = () => {
    box.destroy();
    who.destroy();
    text.destroy();
    mark.destroy();
    opts.forEach((t) => t.destroy());
    unbindAct?.();
    unbindDir?.();
    scene.events.off("vinput-action", pick);
    scene.events.off("vinput-down", vmove);
  };

  const vmove = (dir: string) => {
    if (dir === "up" || dir === "left") move(-1);
    if (dir === "down" || dir === "right") move(1);
  };
  unbindAct = onActionDown(scene, "action", pick);
  unbindDir = onDirection(scene, (d) => vmove(d));
  scene.events.on("vinput-action", pick);
  scene.events.on("vinput-down", vmove);
}
