import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../../gbcArt";
import { getAudio } from "../../audio";
import { onActionDown } from "../../controls";

/**
 * Generic rhythm-tap mini-game.
 *
 * The player must press A on each beat. Each beat has a small accept window.
 * After all beats, calls onDone with hits/total and a "judgment" tag.
 *
 * Used by: phone (3 beats — pick up), kettle pour (longer hold — see pourPuzzle),
 * and any future timing micro-puzzle.
 *
 * Designed to be self-contained: spawns its own UI, listens to keys + vinput,
 * and cleans up on completion.
 */
export type RhythmJudgment = "miss" | "ok" | "great";
export type RhythmResult = { hits: number; total: number; judgment: RhythmJudgment };

export function runRhythmTap(
  scene: Phaser.Scene,
  opts: {
    title: string;
    /** Beat times in ms from start. e.g. [600, 1200, 1800]. */
    beats: number[];
    /** Accept window in ms either side of each beat. Default 220. */
    window?: number;
  },
  onDone: (r: RhythmResult) => void,
) {
  const win = opts.window ?? 220;
  const total = opts.beats.length;
  let hits = 0;
  let active = true;

  const boxW = GBC_W - 24;
  const box = drawGBCBox(scene, 12, 50, boxW, 44, 800);
  const title = new GBCText(scene, 16, 54, opts.title, { color: COLOR.textAccent, depth: 801, scrollFactor: 0 });
  const result = new GBCText(scene, 16, 64, "PRESS A ON THE BEAT", {
    color: COLOR.textLight, depth: 801, scrollFactor: 0, maxWidthPx: boxW - 8,
  });

  // Beat markers along a line
  const trackY = 82;
  const trackX0 = 18;
  const trackX1 = GBC_W - 18;
  scene.add.rectangle(trackX0, trackY, trackX1 - trackX0, 1, 0x586878, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(801);
  const lastBeat = opts.beats[opts.beats.length - 1] + win;
  const xForT = (t: number) => trackX0 + (t / lastBeat) * (trackX1 - trackX0);
  const beatMarks: Phaser.GameObjects.Arc[] = opts.beats.map((bt) =>
    scene.add.circle(xForT(bt), trackY, 3, 0xdde6f5, 0.9).setScrollFactor(0).setDepth(802),
  );
  const cursor = scene.add.circle(trackX0, trackY, 2, 0xd84a4a, 1).setScrollFactor(0).setDepth(803);

  const startedAt = scene.time.now;
  const used = new Array(total).fill(false);

  const tap = () => {
    if (!active) return;
    const t = scene.time.now - startedAt;
    let bestI = -1; let bestD = Infinity;
    for (let i = 0; i < total; i++) {
      if (used[i]) continue;
      const d = Math.abs(opts.beats[i] - t);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestI >= 0 && bestD <= win) {
      used[bestI] = true;
      hits++;
      beatMarks[bestI].setFillStyle(0xa8e8c8);
      getAudio().sfx("confirm");
      result.setText(bestD < win * 0.4 ? "GREAT" : "OK");
    } else {
      getAudio().sfx("miss");
      result.setText("OFF-BEAT");
    }
  };

  const unbindTap = onActionDown(scene, "action", tap);
  scene.events.on("vinput-action", tap);

  const update = scene.time.addEvent({
    delay: 16,
    repeat: -1,
    callback: () => {
      if (!active) return;
      const t = scene.time.now - startedAt;
      cursor.x = xForT(Math.min(t, lastBeat));
      if (t >= lastBeat + 200) finish();
    },
  });

  const finish = () => {
    if (!active) return;
    active = false;
    update.remove(false);
    unbindTap();
    scene.events.off("vinput-action", tap);
    let judgment: RhythmJudgment = "miss";
    if (hits === total) judgment = "great";
    else if (hits >= Math.ceil(total / 2)) judgment = "ok";
    box.destroy(); title.destroy(); result.destroy();
    beatMarks.forEach(m => m.destroy()); cursor.destroy();
    onDone({ hits, total, judgment });
  };
  void GBC_H;
}
