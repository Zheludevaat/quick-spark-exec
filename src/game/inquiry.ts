import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  GBC_LINE_H,
  textHeightPx,
  fitSingleLineText,
  fitSingleLineState,
} from "./gbcArt";
import { getAudio } from "./audio";
import { onActionDown, onDirection } from "./controls";

export type InquiryChoice = "observe" | "ask" | "confess" | "silent";

export type InquiryOption = {
  choice: InquiryChoice;
  label: string;
  /** Reply line shown after choosing (UPPERCASED in render). */
  reply: string;
};

const PAD = 6;

/**
 * A small inquiry list. Renders inside a dynamically-sized dialog box so the
 * prompt and option labels never overlap, regardless of length.
 *
 * Layout discipline:
 *  - speaker name: single-line, "..." trim
 *  - prompt body: wraps; box height computed from wrapped line count
 *  - option labels: single-line ONLY (rows are fixed at GBC_LINE_H)
 *  - if ANY option label is trimmed, a wrapped readout band is reserved at
 *    the bottom of the box and shows the FULL text of the currently-selected
 *    option. Compact rows + readable selection — no hidden meaning.
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
  const promptH = textHeightPx(promptText, innerW);

  // Per-option compact + full state. Use the same width we render the row at.
  const optionRowW = innerW - 8;
  const optionStates = options.map((o) => fitSingleLineState(o.label, optionRowW));
  const needsOptionReadout = optionStates.some((o) => o.trimmed);

  // Readout uses the full inner width so it can wrap further than the row.
  const optionReadoutW = innerW;
  const optionReadoutH = needsOptionReadout
    ? Math.max(...optionStates.map((o) => textHeightPx(o.full, optionReadoutW)))
    : 0;

  const rowsH = options.length * GBC_LINE_H;
  const readoutBandH = needsOptionReadout ? GBC_LINE_H + optionReadoutH : 0;

  // who(1 line) + prompt(promptH) + spacer(1 line) + rows + [spacer + readout] + bottom pad(1 line)
  const totalPx = GBC_LINE_H + promptH + GBC_LINE_H + rowsH + readoutBandH + GBC_LINE_H;
  const boxH = Math.min(GBC_H - 14, totalPx + PAD * 2);
  const boxX = 4;
  const boxY = GBC_H - boxH - 2;

  const box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);
  const who = new GBCText(scene, boxX + PAD, boxY + 4, fitSingleLineText(prompt.who, innerW), {
    color: COLOR.textAccent,
    depth: 251,
    scrollFactor: 0,
  });
  const text = new GBCText(scene, boxX + PAD, boxY + 4 + GBC_LINE_H, promptText, {
    color: COLOR.textLight,
    depth: 251,
    scrollFactor: 0,
    maxWidthPx: innerW,
  });

  // Options: one per line, marker on the left. Labels are forced to single-line.
  const optionsTop = boxY + 4 + GBC_LINE_H + promptH + GBC_LINE_H;
  let cursor = 0;
  const opts: GBCText[] = [];
  options.forEach((o, i) => {
    const y = optionsTop + i * GBC_LINE_H;
    const t = new GBCText(scene, boxX + PAD + 8, y, optionStates[i].fitted, {
      color: COLOR.textLight,
      depth: 251,
      scrollFactor: 0,
    });
    t.obj.setInteractive({ useHandCursor: true });
    t.obj.on("pointerdown", () => {
      cursor = i;
      refresh();
      pick();
    });
    opts.push(t);
    void o;
  });
  const mark = new GBCText(scene, boxX + PAD, optionsTop, "▶", {
    color: COLOR.textGold,
    depth: 251,
    scrollFactor: 0,
  });

  // Selected-option full-text readout — only if any option was trimmed.
  const optionReadoutY = optionsTop + rowsH + GBC_LINE_H;
  const optionReadout = needsOptionReadout
    ? new GBCText(scene, boxX + PAD, optionReadoutY, optionStates[0].full, {
        color: COLOR.textAccent,
        depth: 251,
        scrollFactor: 0,
        maxWidthPx: optionReadoutW,
      })
    : null;

  const refresh = () => {
    opts.forEach((t, i) => t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight));
    mark.setPosition(boxX + PAD, optionsTop + cursor * GBC_LINE_H);
    if (optionReadout) optionReadout.setText(optionStates[cursor].full);
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
    const replyH = textHeightPx(replyText, innerW);
    const rTotalPx = GBC_LINE_H + replyH + GBC_LINE_H;
    const rBoxH = Math.min(GBC_H - 14, rTotalPx + PAD * 2);
    const rBoxY = GBC_H - rBoxH - 2;
    const replyBox = drawGBCBox(scene, boxX, rBoxY, boxW, rBoxH, 250);
    const replyWho = new GBCText(
      scene,
      boxX + PAD,
      rBoxY + 4,
      fitSingleLineText(prompt.who, innerW),
      {
        color: COLOR.textAccent,
        depth: 251,
        scrollFactor: 0,
      },
    );
    const replyBody = new GBCText(scene, boxX + PAD, rBoxY + 4 + GBC_LINE_H, replyText, {
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
    optionReadout?.destroy();
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
