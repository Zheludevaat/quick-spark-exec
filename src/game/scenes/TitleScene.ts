import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox, spawnMotes, fitSingleLineState, textHeightPx } from "../gbcArt";
import { loadSave, newSave, clearSave } from "../save";
import type { SceneKey } from "../types";
import { getAudio, SONG_TITLE } from "../audio";
import { onActionDown, onDirection } from "../controls";
import { openSettings } from "./settings";
import { setSceneSnapshot } from "../gameUiBridge";

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

    setSceneSnapshot({
      key: "Title",
      label: "THE HERMETIC COMEDY",
      act: 0,
      zone: null,
      nodes: null,
      marker: null,
      shellMode: "minimal",
      idleTitle: null,
      idleBody: null,
      footerHint: null,
      allowPlayerHub: false,
      showMiniMap: false,
    });

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
      const reached = i <= actReached;
      const haloAlpha = reached ? 0.28 : 0.12;
      const bodyAlpha = reached ? 1 : 0.35;

      const wrap = this.add.container(sx, sphereCY);

      const halo = this.add.circle(0, 0, sp.r + 3, sp.halo, haloAlpha);
      wrap.add(halo);

      const outer = this.add.circle(0, 0, sp.r, sp.halo, bodyAlpha);
      const mid = this.add.circle(0, 0, Math.max(1, sp.r - 1), sp.mid, bodyAlpha);
      const core = this.add.circle(0, 0, Math.max(1, sp.r - 2), sp.core, bodyAlpha);
      wrap.add([outer, mid, core]);

      if (reached) {
        const shine = this.add.circle(-1, -1, 1, 0xffffff, 0.55);
        wrap.add(shine);
      }

      this.tweens.add({
        targets: halo,
        scale: 1.3,
        alpha: haloAlpha * 0.3,
        duration: 1800 + i * 140,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });

      this.tweens.add({
        targets: wrap,
        y: sphereCY - (reached ? 1.5 : 1),
        duration: 1800 + i * 160,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
        delay: i * 120,
      });

      this.tweens.add({
        targets: wrap,
        scaleX: reached ? 1.04 : 1.02,
        scaleY: reached ? 1.04 : 1.02,
        duration: 2200 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
        delay: 200 + i * 90,
      });
    });

    spawnMotes(this, {
      count: 18,
      color: 0xdde6f5,
      alpha: 0.5,
      driftY: -0.01,
      driftX: 0.003,
      depth: 30,
    });

    // ---- Title block — "THE HERMETIC COMEDY", with THE as a quieter lead-in. ----
    const titleY = 56;

    const t0 = "THE";
    const t1 = "HERMETIC";
    const t2 = "COMEDY";

    new GBCText(this, GBC_W / 2 - measure(t0) / 2, titleY, t0, {
      color: COLOR.textGold,
      shadow: "#1a2030",
    });

    new GBCText(this, GBC_W / 2 - measure(t1) / 2, titleY + 7, t1, {
      color: COLOR.textLight,
      shadow: "#1a2030",
    });

    new GBCText(this, GBC_W / 2 - measure(t2) / 2, titleY + 17, t2, {
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
          { label: "SETTINGS", action: "settings" },
          { label: "ERASE SAVE", action: "erase" },
        ]
      : [
          { label: primaryLabel, action: "launch" },
          { label: "SETTINGS", action: "settings" },
        ];

    // Gate to suppress title-menu input while the settings overlay is open.
    let settingsOpen = false;
    const openTitleSettings = () => {
      if (settingsOpen) return;
      settingsOpen = true;
      getAudio().sfx("confirm");
      openSettings(this, () => {
        settingsOpen = false;
      });
    };

    // Tighter menu box — supports the title rather than competing with it.
    const lineH = 10;
    const menuBoxX = 18;
    const menuBoxW = GBC_W - 36;
    const boxH = 12 + options.length * lineH;
    const menuY = GBC_H - boxH - 8;

    drawGBCBox(this, menuBoxX, menuY, menuBoxW, boxH);

    const menuTextX = menuBoxX + 16;
    const menuCursorX = menuBoxX + 8;
    const menuRowY = menuY + 7;

    let cursor = 0;
    const labels: GBCText[] = options.map(
      (opt, i) =>
        new GBCText(this, menuTextX, menuRowY + i * lineH, opt.label, {
          color: COLOR.textLight,
          depth: 110,
        }),
    );

    const cursorMark = new GBCText(this, menuCursorX, menuRowY, "▶", {
      color: COLOR.textGold,
      depth: 111,
    });

    const refresh = () => {
      labels.forEach((t, i) => t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight));
      cursorMark.setPosition(menuCursorX, menuRowY + cursor * lineH);
    };
    refresh();
    this.tweens.add({ targets: cursorMark.obj, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // ---- Top-right DEV button (opens skip-act menu) ----
    const devBtnX = GBC_W - 30;
    const devBtnY = 4;
    drawGBCBox(this, devBtnX - 2, devBtnY, 28, 10, 120);
    const devBtn = new GBCText(this, devBtnX + 2, devBtnY + 2, "DEV", {
      color: COLOR.textDim,
      depth: 121,
    });
    devBtn.obj
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (settingsOpen) return;
        this.openSkipMenu();
      });

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
      if (settingsOpen) return;
      const opt = options[cursor];
      if (opt.action === "launch") launch();
      else if (opt.action === "erase") erase();
      else if (opt.action === "settings") openTitleSettings();
    };
    const move = (d: number) => {
      if (settingsOpen) return;
      if (options.length < 2) return;
      cursor = (cursor + d + options.length) % options.length;
      audio.sfx("cursor");
      refresh();
    };

    labels.forEach((t, i) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerover", () => {
        if (settingsOpen) return;
        cursor = i;
        refresh();
      });
      t.obj.on("pointerdown", () => {
        if (settingsOpen) return;
        cursor = i;
        refresh();
        confirm();
      });
    });

    onDirection(this, (d) => {
      if (settingsOpen) return;
      if (d === "up") move(-1);
      else if (d === "down") move(1);
    });
    onActionDown(this, "action", confirm);
    this.input.keyboard?.on("keydown-BACKSPACE", () => {
      if (settingsOpen) return;
      if (save) {
        cursor = options.findIndex((o) => o.action === "erase");
        if (cursor < 0) cursor = 0;
        refresh();
        erase();
      }
    });

    // (Footer hint omitted — the HTML footer below the canvas already lists controls.)
  }

  /**
   * DEV-only skip menu — jumps to any scene with a fresh maxed save so the
   * player can spot-check Act 2/3 work without replaying the whole game.
   */
  private openSkipMenu() {
    const audio = getAudio();
    audio.sfx("cursor");

    const jumps: { label: string; scene: SceneKey; act: number }[] = [
      { label: "ACT 0 · LAST DAY", scene: "LastDay", act: 0 },
      { label: "ACT 0 · CROSSING", scene: "Crossing", act: 0 },
      { label: "ACT 1 · SILVER THR.", scene: "SilverThreshold", act: 1 },
      { label: "ACT 2 · IMAGINAL", scene: "ImaginalRealm", act: 2 },
      { label: "ACT 3 · MOON THR.", scene: "AthanorThreshold", act: 3 },
      { label: "ACT 3 · NIGREDO", scene: "Nigredo", act: 3 },
      { label: "ACT 3 · ALBEDO", scene: "Albedo", act: 3 },
      { label: "ACT 3 · CITRINITAS", scene: "Citrinitas", act: 3 },
      { label: "ACT 3 · RUBEDO", scene: "Rubedo", act: 3 },
      { label: "ACT 3 · SEALED MOON", scene: "SealedVessel", act: 3 },
      { label: "METAXY HUB", scene: "MetaxyHub", act: 3 },
      { label: "ACT 4 · MERCURY", scene: "MercuryPlateau", act: 4 },
      { label: "ACT 5 · VENUS", scene: "VenusPlateau", act: 5 },
      { label: "ACT 6 · SUN HALL", scene: "CuratedSelf", act: 6 },
      { label: "ACT 7 · MARS", scene: "MarsPlateau", act: 7 },
      { label: "ACT 10 · ENDINGS", scene: "Epilogue", act: 10 },
    ];

    const dim = this.add
      .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.88)
      .setOrigin(0, 0)
      .setDepth(950)
      .setInteractive();

    const box = drawGBCBox(this, 6, 8, GBC_W - 12, GBC_H - 16, 951);
    const title = new GBCText(this, 12, 12, "DEV · SKIP TO SCENE", {
      color: COLOR.textGold,
      depth: 952,
    });
    const counter = new GBCText(this, GBC_W - 36, 12, "", {
      color: COLOR.textDim,
      depth: 952,
    });

    const lineH = 9;
    const startY = 24;
    const ITEM_X = 18;
    const ITEM_FIT_W = GBC_W - ITEM_X - 8;
    const READOUT_W = GBC_W - 24;

    // Per-jump display state. If any label trims, reserve a wrapped readout
    // band inside the same overlay so the selected destination is always
    // fully readable.
    const jumpStates = jumps.map((j) => fitSingleLineState(j.label, ITEM_FIT_W));
    const needsReadout = jumpStates.some((s) => s.trimmed);
    const readoutH = needsReadout
      ? Math.max(...jumpStates.map((s) => textHeightPx(s.full, READOUT_W)))
      : 0;
    const readoutBandH = needsReadout ? lineH + readoutH : 0;

    const maxRows = Math.floor((GBC_H - 16 - (startY - 8) - readoutBandH - 8) / lineH);
    const visibleRows = Math.max(1, Math.min(10, Math.min(jumps.length, maxRows)));
    let pick = 0;

    // Render slots are reused; only their text/visibility/color change as we
    // scroll the windowed list.
    const items: GBCText[] = [];
    for (let i = 0; i < visibleRows; i++) {
      items.push(
        new GBCText(this, ITEM_X, startY + i * lineH, "", {
          color: COLOR.textLight,
          depth: 952,
        }),
      );
    }
    const mark = new GBCText(this, 10, startY, "▶", {
      color: COLOR.textGold,
      depth: 953,
    });

    const readoutY = startY + visibleRows * lineH + lineH;
    const selectedReadout = needsReadout
      ? new GBCText(this, 12, readoutY, "", {
          color: COLOR.textAccent,
          depth: 952,
          maxWidthPx: READOUT_W,
        })
      : null;

    const computeStart = (p: number): number => {
      const half = Math.floor(visibleRows / 2);
      const max = Math.max(0, jumps.length - visibleRows);
      return Math.max(0, Math.min(max, p - half));
    };

    // Map row index → absolute jumps index for current frame, used by pointer
    // handlers (rebuilt on every refreshSkip).
    let rowToJump: number[] = [];

    const refreshSkip = () => {
      const start = computeStart(pick);
      rowToJump = [];
      for (let row = 0; row < visibleRows; row++) {
        const abs = start + row;
        const j = jumps[abs];
        if (!j) {
          items[row].setText("");
          items[row].obj.setVisible(false);
          rowToJump.push(-1);
          continue;
        }
        items[row].obj.setVisible(true);
        items[row].setText(jumpStates[abs].fitted);
        items[row].setColor(abs === pick ? COLOR.textGold : COLOR.textLight);
        rowToJump.push(abs);
      }
      const visiblePick = pick - start;
      mark.setPosition(10, startY + visiblePick * lineH);
      counter.setText(`${pick + 1}/${jumps.length}`);
      if (selectedReadout) selectedReadout.setText(jumpStates[pick].full);
    };
    refreshSkip();

    const cleanup = () => {
      unbindAct();
      unbindCancel();
      unbindDir();
      dim.destroy();
      box.destroy();
      title.destroy();
      counter.destroy();
      items.forEach((t) => t.destroy());
      selectedReadout?.destroy();
      mark.destroy();
    };

    const jumpTo = (idx: number) => {
      const j = jumps[idx];
      if (!j) return;
      audio.sfx("confirm");
      // Fully-stocked save so reactive content (Act 2/3) has something to show.
      const slot = newSave();
      slot.act = j.act;
      slot.scene = j.scene;
      slot.stats = { clarity: 9, compassion: 9, courage: 9 };
      slot.verbs = { witness: true, transmute: true };
      slot.blackStones = 3;
      slot.whiteStones = 3;
      slot.yellowStones = 3;
      slot.redStones = 3;
      slot.goldStone = true;
      slot.weddingType = "strong";
      slot.act2Inscription = "I AM WHAT I MET";
      slot.convictions = {
        ...(slot.convictions ?? {}),
        i_am_loved: true,
        i_can_rest: true,
        i_will_remain: true,
      };
      slot.shadesEncountered = {
        ...(slot.shadesEncountered ?? {}),
        the_critic: "sat_with",
        the_orphan: "sat_with",
        the_lover: "sat_with",
      };
      slot.garmentsReleased.moon = j.act >= 4;
      slot.garmentsReleased.mercury = j.act >= 5;
      slot.garmentsReleased.venus = j.act >= 6;
      slot.garmentsReleased.sun = j.act >= 7;
      slot.garmentsReleased.mars = j.act >= 8;
      slot.sphereVerbs.name = j.act >= 4;
      slot.sphereVerbs.attune = j.act >= 5;
      slot.sphereVerbs.stand = j.act >= 7;
      slot.flags.legacy_sun_bridge = j.act >= 6;
      try {
        cleanup();
        audio.music.stop();
        this.scene.start(j.scene, { save: slot });
      } catch (err) {
        console.error("[dev-skip] failed to start", j.scene, err);
      }
    };

    const unbindAct = onActionDown(this, "action", () => jumpTo(pick));
    const unbindCancel = onActionDown(this, "cancel", () => {
      audio.sfx("cursor");
      cleanup();
    });
    const unbindDir = onDirection(this, (d) => {
      if (d === "up") {
        pick = (pick - 1 + jumps.length) % jumps.length;
        audio.sfx("cursor");
        refreshSkip();
      } else if (d === "down") {
        pick = (pick + 1) % jumps.length;
        audio.sfx("cursor");
        refreshSkip();
      }
    });

    items.forEach((t, row) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerover", () => {
        const abs = rowToJump[row];
        if (abs < 0) return;
        pick = abs;
        refreshSkip();
      });
      t.obj.on("pointerdown", () => {
        const abs = rowToJump[row];
        if (abs >= 0) jumpTo(abs);
      });
    });
  }
}

/** Cheap proportional-ish measure: 6px per glyph in the GBC bitmap font. */
function measure(text: string): number {
  return text.length * 6;
}
