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

    // ---- Seven Planetary Spheres (Hermetic order, traditional colors) ----
    // Moon · Mercury · Venus · Sun · Mars · Jupiter · Saturn
    const spheres: { name: string; core: number; mid: number; halo: number; r: number }[] = [
      { name: "Moon", core: 0xdde6f5, mid: 0xa8c8e8, halo: 0x7898c0, r: 5 }, // silver
      { name: "Mercury", core: 0xf0e0a8, mid: 0xc8a868, halo: 0x886838, r: 4 }, // quicksilver/amber
      { name: "Venus", core: 0xf0c8d8, mid: 0xc88898, halo: 0x885868, r: 5 }, // rose-copper
      { name: "Sun", core: 0xfff0a8, mid: 0xf0b048, halo: 0xc06820, r: 7 }, // gold (largest)
      { name: "Mars", core: 0xf0a888, mid: 0xc85838, halo: 0x782818, r: 5 }, // iron red
      { name: "Jupiter", core: 0xc8d8f0, mid: 0x6890c8, halo: 0x305078, r: 6 }, // royal blue / tin
      { name: "Saturn", core: 0x988878, mid: 0x584838, halo: 0x281810, r: 5 }, // lead
    ];
    const sphereCY = 44;
    const spacing = 22;
    const totalW = spacing * (spheres.length - 1);
    const startX = GBC_W / 2 - totalW / 2;
    const saveForSpheres = loadSave();
    const actReached = saveForSpheres?.act ?? 0;
    spheres.forEach((sp, i) => {
      const sx = startX + i * spacing;
      // Spheres at or below the player's current Act glow at full strength;
      // unreached spheres are dimmer to hint at the road ahead.
      const reached = i <= actReached;
      const haloAlpha = reached ? 0.28 : 0.12;
      const bodyAlpha = reached ? 1 : 0.35;
      // Soft halo
      const halo = this.add.circle(sx, sphereCY, sp.r + 3, sp.halo, haloAlpha);
      this.tweens.add({
        targets: halo,
        scale: 1.3,
        alpha: haloAlpha * 0.3,
        duration: 1800 + i * 140,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      // Sphere body — concentric discs for a pixel-shaded ball
      g.fillStyle(sp.halo, bodyAlpha);
      g.fillCircle(sx, sphereCY, sp.r);
      g.fillStyle(sp.mid, bodyAlpha);
      g.fillCircle(sx, sphereCY, Math.max(1, sp.r - 1));
      g.fillStyle(sp.core, bodyAlpha);
      g.fillCircle(sx, sphereCY, Math.max(1, sp.r - 2));
      // Specular highlight (only on reached spheres)
      if (reached) {
        g.fillStyle(0xffffff, 0.55);
        g.fillCircle(sx - 1, sphereCY - 1, 1);
      }
    });

    spawnMotes(this, {
      count: 18,
      color: 0xdde6f5,
      alpha: 0.5,
      driftY: -0.01,
      driftX: 0.003,
      depth: 30,
    });

    // ---- Title block — centered, just the name. ----
    const titleY = 70;
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
    const primaryLabel = remaining ? "LEAVE THE IMAGINAL" : save ? "CONTINUE" : "BEGIN";

    const options: { label: string; action: "launch" | "erase" | "settings" }[] = save
      ? [
          { label: primaryLabel, action: "launch" },
          { label: "ERASE SAVE", action: "erase" },
          { label: "SETTINGS (DEV)", action: "settings" },
        ]
      : [
          { label: primaryLabel, action: "launch" },
          { label: "SETTINGS (DEV)", action: "settings" },
        ];

    // Larger menu box that fits 2-3 options comfortably.
    const lineH = 11;
    const boxH = 14 + options.length * lineH;
    const menuY = GBC_H - boxH - 8;
    drawGBCBox(this, 12, menuY, GBC_W - 24, boxH);

    let cursor = 0;
    const labels: GBCText[] = options.map(
      (opt, i) =>
        new GBCText(this, 26, menuY + 8 + i * lineH, opt.label, {
          color: COLOR.textLight,
          depth: 110,
        }),
    );
    const cursorMark = new GBCText(this, 18, menuY + 8, "▶", {
      color: COLOR.textGold,
      depth: 111,
    });
    const refresh = () => {
      labels.forEach((t, i) => t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight));
      cursorMark.setPosition(18, menuY + 8 + cursor * lineH);
    };
    refresh();
    this.tweens.add({ targets: cursorMark.obj, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // ---- Top-right DEV button (opens skip-act menu) ----
    const devBtnX = GBC_W - 32;
    const devBtnY = 4;
    drawGBCBox(this, devBtnX - 2, devBtnY, 32, 12, 120);
    const devBtn = new GBCText(this, devBtnX + 2, devBtnY + 3, "DEV▸", {
      color: COLOR.textGold,
      depth: 121,
    });
    devBtn.obj
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.openSkipMenu());

    // ---- Boot audio on first user gesture ----
    const audio = getAudio();
    const startMusic = () => {
      audio.resume();
      audio.music.play("title", SONG_TITLE);
    };
    this.input.keyboard?.once("keydown", startMusic);
    this.input.once("pointerdown", startMusic);
    this.events.once("vinput-action", startMusic);

    let launching = false;
    const launch = () => {
      if (launching) return;
      launching = true;
      audio.sfx("confirm");
      const slot = save ?? newSave();
      let next = save ? save.scene : "LastDay";
      // Guard: if the saved scene key is not registered in this build, fall back.
      if (!this.scene.manager.keys[next]) {
        console.warn("[title] saved scene not registered:", next, "— falling back to LastDay");
        next = "LastDay";
        slot.scene = "LastDay";
      }
      audio.music.stop();
      try {
        console.log("[title] starting scene:", next);
        this.scene.start(next, { save: slot });
      } catch (err) {
        console.error("[title] scene.start failed:", err);
        launching = false;
      }
    };
    const erase = () => {
      // Two-step gate: show a confirmation overlay before wiping the save.
      audio.sfx("cursor");
      const dim = this.add
        .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.82)
        .setOrigin(0, 0)
        .setDepth(950)
        .setInteractive();
      const box = drawGBCBox(this, 16, 50, GBC_W - 32, 44, 951);
      const q1 = new GBCText(this, 24, 56, "ERASE THE SAVE?", {
        color: COLOR.textGold,
        depth: 952,
      });
      const q2 = new GBCText(this, 24, 66, "THIS CANNOT BE UNDONE.", {
        color: COLOR.textDim,
        depth: 952,
      });
      const yes = new GBCText(this, 24, 80, "▶ YES, ERASE", {
        color: COLOR.textLight,
        depth: 952,
      });
      const no = new GBCText(this, 92, 80, "  NO", {
        color: COLOR.textLight,
        depth: 952,
      });
      let pick = 0; // 0 = YES, 1 = NO (default cursor on YES; user must move)
      const refreshConfirm = () => {
        yes.setText(pick === 0 ? "▶ YES, ERASE" : "  YES, ERASE");
        no.setText(pick === 1 ? "▶ NO" : "  NO");
        yes.setColor(pick === 0 ? COLOR.textGold : COLOR.textLight);
        no.setColor(pick === 1 ? COLOR.textGold : COLOR.textLight);
      };
      refreshConfirm();
      const cleanupConfirm = () => {
        unbindAct();
        unbindCancel();
        unbindDir();
        dim.destroy();
        box.destroy();
        q1.destroy();
        q2.destroy();
        yes.destroy();
        no.destroy();
      };
      const unbindAct = onActionDown(this, "action", () => {
        if (pick === 0) {
          audio.sfx("cancel");
          cleanupConfirm();
          clearSave();
          this.scene.restart();
        } else {
          audio.sfx("cursor");
          cleanupConfirm();
        }
      });
      const unbindCancel = onActionDown(this, "cancel", () => {
        audio.sfx("cursor");
        cleanupConfirm();
      });
      const unbindDir = onDirection(this, (d) => {
        if (d === "left" || d === "right") {
          pick = pick === 0 ? 1 : 0;
          audio.sfx("cursor");
          refreshConfirm();
        }
      });
      // Pointer support
      yes.obj.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        pick = 0;
        refreshConfirm();
        audio.sfx("cancel");
        cleanupConfirm();
        clearSave();
        this.scene.restart();
      });
      no.obj.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        audio.sfx("cursor");
        cleanupConfirm();
      });
    };
    const confirm = () => {
      const opt = options[cursor];
      if (opt.action === "launch") launch();
      else if (opt.action === "erase") erase();
      else this.openSkipMenu();
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

    // (Footer hint omitted — the HTML footer below the canvas already lists controls.)
  }
}

/** Cheap proportional-ish measure: 6px per glyph in the GBC bitmap font. */
function measure(text: string): number {
  return text.length * 6;
}
