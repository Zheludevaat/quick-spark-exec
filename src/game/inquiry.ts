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
import { runDialog } from "./scenes/hud";

export type InquiryChoice = "observe" | "ask" | "confess" | "silent";

export type InquiryOption = {
  /** Optional stable id carried through to onDone(picked). */
  id?: string;
  choice: InquiryChoice;
  label: string;
  /** Reply line shown after choosing (UPPERCASED in render). */
  reply: string;
};

const PAD = 6;

/**
 * Centralized inquiry presenter.
 *
 * Information architecture:
 *  - Long framing prompts are shown FIRST as a normal dialog (runDialog).
 *  - The actual choice UI is then a compact, lower-third menu.
 *  - The picked option's reply is shown in a compact reply box.
 *
 * Threshold: if the wrapped prompt exceeds ~2 lines, we pre-dialog it.
 * This keeps short prompts inline and keeps long ones from bloating the menu.
 */
export function runInquiry(
  scene: Phaser.Scene,
  prompt: { who: string; text: string },
  options: InquiryOption[],
  onDone: (picked: InquiryOption) => void,
) {
  const innerW = GBC_W - 8 - PAD * 2;
  const promptH = textHeightPx(prompt.text.toUpperCase(), innerW);
  const usePreambleDialog = promptH > GBC_LINE_H * 2 - 2;

  if (usePreambleDialog) {
    runDialog(scene, [{ who: prompt.who, text: prompt.text }], () => {
      openCompactInquiry(scene, prompt, options, onDone, true);
    });
    return;
  }

  openCompactInquiry(scene, prompt, options, onDone, false);
}

function openCompactInquiry(
  scene: Phaser.Scene,
  prompt: { who: string; text: string },
  options: InquiryOption[],
  onDone: (picked: InquiryOption) => void,
  cameFromPreamble: boolean,
) {
  const boxW = GBC_W - 8;
  const innerW = boxW - PAD * 2;
  const boxX = 4;

  const optionRowW = innerW - 8;
  const optionStates = options.map((o) => fitSingleLineState(o.label, optionRowW));
  const needsOptionReadout = optionStates.some((o) => o.trimmed);
  const optionReadoutW = innerW;
  const optionReadoutH = needsOptionReadout
    ? Math.max(...optionStates.map((o) => textHeightPx(o.full, optionReadoutW)))
    : 0;

  // Compact header: short topic only. Don't repeat the full prompt.
  const compactHeader = cameFromPreamble
    ? "CHOOSE ONE"
    : fitSingleLineText(prompt.text, innerW);

  const headerH = GBC_LINE_H;
  const rowsH = options.length * GBC_LINE_H;
  const readoutBandH = needsOptionReadout ? GBC_LINE_H + optionReadoutH : 0;

  const totalPx = GBC_LINE_H + headerH + rowsH + readoutBandH + GBC_LINE_H;
  const boxH = Math.min(58, Math.max(34, totalPx + PAD));
  const boxY = GBC_H - boxH - 2;

  const box = drawGBCBox(scene, boxX, boxY, boxW, boxH, 250);

  const who = new GBCText(scene, boxX + PAD, boxY + 4, fitSingleLineText(prompt.who, innerW), {
    color: COLOR.textAccent,
    depth: 251,
    scrollFactor: 0,
  });

  const header = new GBCText(scene, boxX + PAD, boxY + 4 + GBC_LINE_H, compactHeader, {
    color: COLOR.textDim,
    depth: 251,
    scrollFactor: 0,
    maxWidthPx: innerW,
  });

  const optionsTop = boxY + 4 + GBC_LINE_H + GBC_LINE_H;
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

  const cleanup = () => {
    box.destroy();
    who.destroy();
    header.destroy();
    mark.destroy();
    opts.forEach((t) => t.destroy());
    optionReadout?.destroy();
    unbindAct?.();
    unbindDir?.();
    scene.events.off("vinput-action", pick);
    scene.events.off("vinput-down", vmove);
  };

  const pick = () => {
    cleanup();
    const picked = options[cursor];
    getAudio().sfx("confirm");
    runInquiryReply(scene, prompt.who, picked, onDone);
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

function runInquiryReply(
  scene: Phaser.Scene,
  whoText: string,
  picked: InquiryOption,
  onDone: (picked: InquiryOption) => void,
) {
  const boxW = GBC_W - 8;
  const innerW = boxW - PAD * 2;
  const boxX = 4;

  const replyText = picked.reply.toUpperCase();
  const replyH = textHeightPx(replyText, innerW);
  const rTotalPx = GBC_LINE_H + replyH + GBC_LINE_H;
  const rBoxH = Math.min(52, Math.max(28, rTotalPx + PAD * 2));
  const rBoxY = GBC_H - rBoxH - 2;

  const replyBox = drawGBCBox(scene, boxX, rBoxY, boxW, rBoxH, 250);
  const replyWho = new GBCText(
    scene,
    boxX + PAD,
    rBoxY + 4,
    fitSingleLineText(whoText, innerW),
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

  scene.tweens.add({
    targets: hint.obj,
    alpha: 0.25,
    duration: 500,
    yoyo: true,
    repeat: -1,
  });

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
}
