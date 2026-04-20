import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { loadSave, newSave, clearSave } from "../save";
import { getAudio, SONG_TITLE } from "../audio";
import { onActionDown, onDirection } from "../controls";

/**
 * Title screen — intentionally minimal.
 *
 * Just the moon, the title, and the menu. No act/chapter spoilers.
 * The journey reveals itself as the player walks it.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.void);

    // ---- Starfield ----
    const g = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const c = Phaser.Math.RND.pick(["#2a3550", "#7889a8", "#dde6f5"]);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      g.fillRect(Phaser.Math.Between(0, GBC_W), Phaser.Math.Between(0, GBC_H), 1, 1);
    }
    for (let i = 0; i < 12; i++) {
      const s = this.add.rectangle(
        Phaser.Math.Between(0, GBC_W),
        Phaser.Math.Between(0, 80),
        1,
        1,
        0xffffff,
        1,
      );
      this.tweens.add({
        targets: s,
        alpha: 0.15,
        duration: Phaser.Math.Between(500, 1500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    // ---- Moon disc + halo ----
    const cx = GBC_W / 2;
    const cy = 42;
    const halo = this.add.circle(cx, cy, 28, 0xa8c8e8, 0.18);
    this.tweens.add({
      targets: halo,
      scale: 1.18,
      alpha: 0.08,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    g.fillStyle(0x243058, 1);
    g.fillCircle(cx, cy, 24);
    g.fillStyle(0x3a5078, 1);
    g.fillCircle(cx, cy, 20);
    g.fillStyle(0x7898c0, 1);
    g.fillCircle(cx, cy, 16);
    g.fillStyle(0xa8c8e8, 1);
    g.fillCircle(cx, cy, 12);
    g.fillStyle(0xdde6f5, 0.4);
    g.fillCircle(cx - 3, cy - 3, 5);
    g.fillStyle(0x7898c0, 0.6);
    g.fillCircle(cx + 4, cy + 2, 2);
    g.fillStyle(0x7898c0, 0.6);
    g.fillCircle(cx - 5, cy + 5, 1);

    spawnMotes(this, {
      count: 18,
      color: 0xdde6f5,
      alpha: 0.5,
      driftY: -0.01,
      driftX: 0.003,
      depth: 30,
    });

    // ---- Title block — centered, just the name. ----
    const titleY = 92;
    const t1 = "HERMETIC";
    const t2 = "COMEDY";
    new GBCText(this, GBC_W / 2 - measure(t1) / 2, titleY, t1, {
      color: COLOR.textLight,
      shadow: "#1a2030",
    });
    new GBCText(this, GBC_W / 2 - measure(t2) / 2, titleY + 10, t2, {
      color: COLOR.textLight,
      shadow: "#1a2030",
    });

    const save = loadSave();
    const remaining = save?.flags?.plateau_remain;

    // ---- Menu options ----
    const primaryLabel = remaining
      ? "LEAVE THE IMAGINAL"
      : save
      ? "CONTINUE"
      : "BEGIN";

    const options: { label: string; action: "launch" | "erase" }[] = save
      ? [
          { label: primaryLabel, action: "launch" },
          { label: "ERASE SAVE", action: "erase" },
        ]
      : [{ label: primaryLabel, action: "launch" }];

    const boxH = save ? 28 : 18;
    const menuY = 124;
    drawGBCBox(this, 18, menuY, GBC_W - 36, boxH);

    let cursor = 0;
    const labels: GBCText[] = options.map(
      (opt, i) =>
        new GBCText(this, 30, menuY + 6 + i * 10, opt.label, {
          color: COLOR.textLight,
          depth: 110,
        }),
    );
    const cursorMark = new GBCText(this, 22, menuY + 6, "▶", {
      color: COLOR.textGold,
      depth: 111,
    });
    const refresh = () => {
      labels.forEach((t, i) => t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight));
      cursorMark.setPosition(22, menuY + 6 + cursor * 10);
    };
    refresh();
    this.tweens.add({ targets: cursorMark.obj, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // ---- Boot audio on first user gesture ----
    const audio = getAudio();
    const startMusic = () => {
      audio.resume();
      audio.music.play("title", SONG_TITLE);
    };
    this.input.keyboard?.once("keydown", startMusic);
    this.input.once("pointerdown", startMusic);
    this.events.once("vinput-action", startMusic);

    const launch = () => {
      audio.sfx("confirm");
      const slot = save ?? newSave();
      const next = save ? save.scene : "LastDay";
      audio.music.stop();
      this.scene.start(next, { save: slot });
    };
    const erase = () => {
      audio.sfx("cancel");
      clearSave();
      this.scene.restart();
    };
    const confirm = () => {
      const opt = options[cursor];
      if (opt.action === "launch") launch();
      else erase();
    };
    const move = (d: number) => {
      if (options.length < 2) return;
      cursor = (cursor + d + options.length) % options.length;
      audio.sfx("cursor");
      refresh();
    };

    labels.forEach((t, i) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerover", () => {
        cursor = i;
        refresh();
      });
      t.obj.on("pointerdown", () => {
        cursor = i;
        refresh();
        confirm();
      });
    });

    onDirection(this, (d) => {
      if (d === "up") move(-1);
      else if (d === "down") move(1);
    });
    onActionDown(this, "action", confirm);
    this.input.keyboard?.on("keydown-BACKSPACE", () => {
      if (save) {
        cursor = 1;
        refresh();
        erase();
      }
    });

    // ---- Footer hint ----
    new GBCText(this, 4, GBC_H - 7, "≡ SETTINGS  ·  ENTER", {
      color: COLOR.textAccent,
    });
  }
}

/** Cheap proportional-ish measure: 6px per glyph in the GBC bitmap font. */
function measure(text: string): number {
  return text.length * 6;
}
