/**
 * EpilogueScene — extracted from CuratedSelfScene.ts so that Sun completion
 * routes back to MetaxyHub instead of chaining straight into the finale.
 *
 * Reachable only by explicit transition (e.g. an EndingsRouter). Not
 * triggered by SunTrial victory.
 */

import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes } from "../gbcArt";
import { writeSave, clearSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD } from "./hud";
import { runInquiry } from "../inquiry";
import { getAudio, SONG_EPILOGUE } from "../audio";
import { onActionDown, onDirection } from "../controls";
import { endingTier, endingParagraphs } from "../act3/harvest";

export class EpilogueScene extends Phaser.Scene {
  private save!: SaveSlot;
  private cursor = 0;
  private optionTexts: GBCText[] = [];
  private cursorMark!: GBCText;
  private options: { label: string; action: "ngplus" | "ascend" | "erase" }[] = [];

  constructor() {
    super("Epilogue");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.cursor = 0;
    this.optionTexts = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#05060f");
    this.cameras.main.fadeIn(900);
    getAudio().music.play("epilogue", SONG_EPILOGUE);

    const tier = endingTier(this.save);
    const TIER_TINT: Record<string, [number, number, number]> = {
      ascent: [0xfff5d0, 0xffe098, 0xc8b070],
      gold: [0xffe098, 0xd8a060, 0x8a5028],
      silver: [0xc8d0e8, 0x88a0c8, 0x4a5878],
      iron: [0xa8b0c0, 0x687088, 0x2a3048],
      brittle: [0x9088a0, 0x584860, 0x1a1428],
    };
    const tint = TIER_TINT[tier];

    const bg = this.add.graphics().setDepth(0);
    const bandsBg: [number, number][] = [
      [0x05060f, 30],
      [tint[2], 40],
      [tint[1], 50],
      [tint[0], 24],
    ];
    let yy = 0;
    for (const [c, h] of bandsBg) {
      bg.fillStyle(c, 0.55);
      bg.fillRect(0, yy, GBC_W, h);
      yy += h;
    }

    for (let i = 0; i < 70; i++) {
      const s = this.add
        .rectangle(
          Phaser.Math.Between(0, GBC_W),
          Phaser.Math.Between(0, GBC_H),
          1,
          1,
          0xdde6f5,
          Phaser.Math.FloatBetween(0.3, 1),
        )
        .setDepth(1);
      this.tweens.add({
        targets: s,
        alpha: 0.1,
        duration: Phaser.Math.Between(700, 2200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    const ribbons = [tint[0], tint[1], 0x88c0f0, 0xa8e8c8, 0xc8a8e8];
    for (let b = 0; b < ribbons.length; b++) {
      const band = this.add
        .rectangle(GBC_W / 2, 18 + b * 7, GBC_W * 1.6, 2, ribbons[b], 0.22)
        .setDepth(2);
      this.tweens.add({
        targets: band,
        x: GBC_W / 2 + (b % 2 === 0 ? 18 : -18),
        alpha: 0.06,
        scaleX: 1.15,
        duration: 3400 + b * 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    const halo = this.add.circle(GBC_W / 2, 24, 24, tint[0], 0.18).setDepth(3);
    this.tweens.add({
      targets: halo,
      scale: 1.3,
      alpha: 0.05,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    spawnMotes(this, { count: 12, color: tint[0], alpha: 0.4, driftY: -0.01, depth: 4 });

    this.cameras.main.zoomTo(1.04, 4000, "Sine.inOut", true);

    const tierLabel: Record<string, string> = {
      ascent: "ASCENT",
      gold: "GOLD",
      silver: "SILVER",
      iron: "IRON",
      brittle: "BRITTLE",
    };
    new GBCText(this, GBC_W / 2 - 22, 16, "ACT THREE", { color: COLOR.textAccent, depth: 10 });
    new GBCText(this, GBC_W / 2 - 26, 26, `ENDING: ${tierLabel[tier]}`, {
      color: COLOR.textGold,
      depth: 10,
    });

    const vignette = this.add.graphics().setDepth(180);
    vignette.fillStyle(0x000000, 0.5);
    vignette.fillRect(0, 0, GBC_W, 4);
    vignette.fillRect(0, GBC_H - 4, GBC_W, 4);
    vignette.fillRect(0, 0, 4, GBC_H);
    vignette.fillRect(GBC_W - 4, 0, 4, GBC_H);

    drawGBCBox(this, 8, 38, GBC_W - 16, 64);
    const allParas = endingParagraphs(this.save);
    const paragraphs =
      allParas.length <= 3
        ? allParas
        : [...allParas.slice(0, 2), `${allParas[2]} ${allParas.slice(3).join(" ")}`];
    let y = 42;
    for (const para of paragraphs) {
      new GBCText(this, 12, y, para, {
        color: COLOR.textLight,
        depth: 110,
        maxWidthPx: GBC_W - 24,
      });
      y += 14;
    }
    const ng = this.save.flags.ng_plus ? " ★" : "";
    new GBCText(
      this,
      12,
      94,
      `C:${this.save.stats.clarity} K:${this.save.stats.compassion} V:${this.save.stats.courage} ◆${this.save.shards.length}${ng}`,
      { color: COLOR.textDim, depth: 110 },
    );

    this.options = [];
    if (tier === "ascent" || this.save.goldStone) {
      this.options.push({ label: "ASCEND (NG+ ★)", action: "ascend" });
    }
    this.options.push({ label: "WALK AGAIN (NG+)", action: "ngplus" });
    this.options.push({ label: "ERASE RESTART", action: "erase" });

    this.add
      .rectangle(0, GBC_H - 40, GBC_W, 40, 0x05070d, 0.92)
      .setOrigin(0, 0)
      .setDepth(199);
    this.optionTexts = this.options.map(
      (o, i) =>
        new GBCText(this, 18, GBC_H - 34 + i * 10, o.label, {
          color: i === 0 ? COLOR.textGold : COLOR.textDim,
          depth: 200,
        }),
    );
    this.cursorMark = new GBCText(this, 8, GBC_H - 34, "▶", {
      color: COLOR.textGold,
      depth: 200,
    });
    this.optionTexts.forEach((t, i) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerdown", () => {
        this.cursor = i;
        this.refreshCursor();
        this.choose();
      });
    });
    this.refreshCursor();

    attachHUD(this, () => this.save.stats);

    const move = (d: number) => {
      this.cursor = (this.cursor + d + this.options.length) % this.options.length;
      getAudio().sfx("cursor");
      this.refreshCursor();
    };
    onDirection(this, (d) => {
      if (d === "up") move(-1);
      else if (d === "down") move(1);
    });
    onActionDown(this, "action", () => this.choose());
    this.events.on("vinput-down", (dir: string) => {
      if (dir === "up") move(-1);
      if (dir === "down") move(1);
    });
    this.events.on("vinput-action", () => this.choose());
  }

  private refreshCursor() {
    this.optionTexts.forEach((t, i) =>
      t.setColor(i === this.cursor ? COLOR.textGold : COLOR.textDim),
    );
    this.cursorMark.setPosition(8, GBC_H - 34 + this.cursor * 10);
  }

  private choose() {
    const a = getAudio();
    a.sfx("confirm");
    const opt = this.options[this.cursor];
    if (opt.action === "ngplus") {
      this.save.flags.ng_plus = true;
      this.save.scene = "LastDay";
      this.save.flags.curated_progress_exposed = false;
      writeSave(this.save);
      a.music.stop();
      this.scene.start("Title");
      return;
    }
    if (opt.action === "ascend") {
      this.save.flags.ng_plus = true;
      this.save.flags.ng_plus_ascended = true;
      this.save.scene = "LastDay";
      this.save.flags.curated_progress_exposed = false;
      writeSave(this.save);
      const flash = this.add
        .rectangle(0, 0, GBC_W, GBC_H, 0xffffff, 0)
        .setOrigin(0, 0)
        .setDepth(900);
      const line = new GBCText(this, GBC_W / 2 - 60, GBC_H / 2 - 4, "AND BEGIN AGAIN, GOLDEN.", {
        color: "#1a1a1a",
        depth: 901,
      });
      line.obj.setAlpha(0);
      this.tweens.add({ targets: flash, alpha: 1, duration: 1200 });
      this.tweens.add({
        targets: line.obj,
        alpha: 1,
        duration: 1200,
        delay: 600,
        onComplete: () => {
          this.time.delayedCall(1400, () => {
            a.music.stop();
            this.scene.start("Title");
          });
        },
      });
      return;
    }
    runInquiry(
      this,
      { who: "Sophene", text: "Erase the entire journey? This cannot be undone." },
      [
        { choice: "silent", label: "KEEP IT", reply: "We keep it. The shards remain." },
        { choice: "confess", label: "ERASE", reply: "The slate is bare. Begin again, kindly." },
      ],
      (picked) => {
        if (picked.label === "ERASE") {
          clearSave();
          a.music.stop();
          this.scene.start("Title");
        }
      },
    );
  }
}
