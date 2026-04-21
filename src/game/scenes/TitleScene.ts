import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  spawnMotes,
  fitSingleLineState,
  textHeightPx,
  measureText,
} from "../gbcArt";
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
      zone: "TITLE",
      nodes: [
        { id: "moon", label: "Moon", x: 0.12, y: 0.52 },
        { id: "mercury", label: "Mercury", x: 0.24, y: 0.52 },
        { id: "venus", label: "Venus", x: 0.36, y: 0.52 },
        { id: "sun", label: "Sun", x: 0.5, y: 0.5, active: true },
        { id: "mars", label: "Mars", x: 0.64, y: 0.52 },
        { id: "jupiter", label: "Jupiter", x: 0.78, y: 0.52 },
        { id: "saturn", label: "Saturn", x: 0.9, y: 0.52 },
      ],
      marker: null,
      idleTitle: "METAXY",
      idleBody: "Seven spheres. One ascent.",
      footerHint: null,
      showStatsBar: false,
      showUtilityRail: false,
      showDialogueDock: false,
      showMiniMap: true,
      allowPlayerHub: false,
      showFooter: false,
    });

    const save = loadSave();
    const actReached = save?.act ?? 0;
    const remaining = save?.flags?.plateau_remain;

    this.buildTitleBackdrop();
    const sphereFx = this.buildSphereFrieze(actReached);
    this.buildTitleLockup();
    this.buildTitleOrnament();

    spawnMotes(this, {
      count: 14,
      color: 0xdde6f5,
      alpha: 0.42,
      driftY: -0.008,
      driftX: 0.002,
      depth: 40,
      bounds: { x: 0, y: 8, w: GBC_W, h: 92 },
    });

    // Signature event: a slow solar wave occasionally passes through the frieze.
    this.time.addEvent({
      delay: 11000,
      loop: true,
      callback: () => {
        sphereFx.forEach((fx, i) => {
          this.tweens.add({
            targets: [fx.halo, fx.core],
            alpha: { from: fx.baseAlpha, to: Math.min(0.95, fx.baseAlpha + 0.25) },
            scale: { from: 1, to: 1.08 },
            duration: 500,
            delay: i * 90,
            yoyo: true,
            ease: "Sine.inOut",
          });
        });
      },
    });

    const primaryLabel = remaining ? "RETURN" : save ? "CONTINUE" : "BEGIN";
    const options: { label: string; action: "launch" | "settings" }[] = [
      { label: primaryLabel, action: "launch" },
      { label: "SETTINGS", action: "settings" },
    ];

    let settingsOpen = false;
    const openTitleSettings = () => {
      if (settingsOpen) return;
      settingsOpen = true;
      getAudio().sfx("confirm");
      openSettings(this, () => {
        settingsOpen = false;
      });
    };

    // Smaller, quieter menu frame so the title art remains dominant.
    const menuBoxW = 122;
    const menuBoxX = Math.floor((GBC_W - menuBoxW) / 2);
    const lineH = 10;
    const boxH = 12 + options.length * lineH;
    const menuY = 96;

    drawGBCBox(this, menuBoxX, menuY, menuBoxW, boxH);

    const menuTextX = menuBoxX + 18;
    const menuCursorX = menuBoxX + 9;
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
      labels.forEach((t, i) => {
        t.setColor(i === cursor ? COLOR.textGold : COLOR.textLight);
      });
      cursorMark.setPosition(menuCursorX, menuRowY + cursor * lineH);
    };
    refresh();

    this.tweens.add({
      targets: cursorMark.obj,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

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
      audio.sfx("cursor");

      const dim = this.add
        .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.84)
        .setOrigin(0, 0)
        .setDepth(950)
        .setInteractive();

      const boxX = 16;
      const boxY = 44;
      const boxW = GBC_W - 32;
      const boxH = 56;

      const box = drawGBCBox(this, boxX, boxY, boxW, boxH, 951);

      const q1 = new GBCText(this, boxX + 8, boxY + 6, "ERASE THE SAVE?", {
        color: COLOR.textGold,
        depth: 952,
      });

      const q2 = new GBCText(this, boxX + 8, boxY + 16, "THIS CANNOT BE UNDONE.", {
        color: COLOR.textDim,
        depth: 952,
      });

      const optionX = boxX + 8;
      const noY = boxY + 32;
      const yesY = boxY + 42;

      const no = new GBCText(this, optionX, noY, "", {
        color: COLOR.textLight,
        depth: 952,
      });

      const yes = new GBCText(this, optionX, yesY, "", {
        color: COLOR.textLight,
        depth: 952,
      });

      let pick = 0; // 0 = NO, 1 = YES

      const refreshConfirm = () => {
        no.setText(pick === 0 ? "▶ NO" : "  NO");
        yes.setText(pick === 1 ? "▶ YES, ERASE" : "  YES, ERASE");
        no.setColor(pick === 0 ? COLOR.textGold : COLOR.textLight);
        yes.setColor(pick === 1 ? COLOR.textGold : COLOR.textLight);
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
        no.destroy();
        yes.destroy();
      };

      const confirmPick = () => {
        if (pick === 1) {
          audio.sfx("cancel");
          cleanupConfirm();
          clearSave();
          this.scene.restart();
        } else {
          audio.sfx("cursor");
          cleanupConfirm();
        }
      };

      const unbindAct = onActionDown(this, "action", confirmPick);

      const unbindCancel = onActionDown(this, "cancel", () => {
        audio.sfx("cursor");
        cleanupConfirm();
      });

      const unbindDir = onDirection(this, (d) => {
        if (d === "up" || d === "down" || d === "left" || d === "right") {
          pick = pick === 0 ? 1 : 0;
          audio.sfx("cursor");
          refreshConfirm();
        }
      });

      no.obj.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        pick = 0;
        refreshConfirm();
        audio.sfx("cursor");
        cleanupConfirm();
      });

      yes.obj.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        pick = 1;
        refreshConfirm();
        audio.sfx("cancel");
        cleanupConfirm();
        clearSave();
        this.scene.restart();
      });
    };

    const confirm = () => {
      if (settingsOpen) return;
      const opt = options[cursor];
      if (opt.action === "launch") launch();
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

    // Erase stays available, but no longer pollutes the main menu.
    this.input.keyboard?.on("keydown-BACKSPACE", () => {
      if (settingsOpen) return;
      if (save) erase();
    });

    const isDevBuild =
      typeof import.meta !== "undefined" &&
      !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;

    if (isDevBuild) {
      this.buildDevButton();
    }
  }

  private buildTitleBackdrop() {
    const g = this.add.graphics();

    // Dense deep-space field with controlled clustering.
    for (let i = 0; i < 92; i++) {
      const c = Phaser.Math.RND.pick(["#202a40", "#445370", "#7d8eae", "#dde6f5"]);
      const a = c === "#dde6f5" ? 1 : 0.9;
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, a);
      g.fillRect(
        Phaser.Math.Between(0, GBC_W - 1),
        Phaser.Math.Between(0, GBC_H - 1),
        1,
        1,
      );
    }

    // Subtle world-soul lattice behind the spheres and title.
    g.lineStyle(1, 0x1f2a48, 0.45);
    g.strokeEllipse(GBC_W / 2, 42, 126, 24);
    g.strokeEllipse(GBC_W / 2, 42, 98, 18);
    g.strokeEllipse(GBC_W / 2, 42, 70, 12);

    // Solar axis.
    g.lineStyle(1, 0x2e3f62, 0.35);
    g.beginPath();
    g.moveTo(GBC_W / 2, 18);
    g.lineTo(GBC_W / 2, 92);
    g.strokePath();

    // Lower converging beams into the title block.
    g.lineStyle(1, 0x18233d, 0.32);
    g.beginPath();
    g.moveTo(54, 74);
    g.lineTo(80, 58);
    g.lineTo(106, 74);
    g.strokePath();

    // Sparse twinklers.
    for (let i = 0; i < 10; i++) {
      const s = this.add.rectangle(
        Phaser.Math.Between(4, GBC_W - 4),
        Phaser.Math.Between(6, 96),
        1,
        1,
        0xffffff,
        1,
      );
      this.tweens.add({
        targets: s,
        alpha: 0.18,
        duration: Phaser.Math.Between(700, 1500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1400),
      });
    }
  }

  private buildSphereFrieze(actReached: number) {
    const spheres: {
      name: string;
      core: number;
      mid: number;
      halo: number;
      r: number;
      x: number;
      y: number;
    }[] = [
      { name: "Moon",    core: 0xdde6f5, mid: 0xa8c8e8, halo: 0x7898c0, r: 5, x: 12,  y: 41 },
      { name: "Mercury", core: 0xf0e0a8, mid: 0xc8a868, halo: 0x886838, r: 4, x: 33,  y: 39 },
      { name: "Venus",   core: 0xf0c8d8, mid: 0xc88898, halo: 0x885868, r: 5, x: 54,  y: 37 },
      { name: "Sun",     core: 0xfff0a8, mid: 0xf0b048, halo: 0xc06820, r: 8, x: 80,  y: 34 },
      { name: "Mars",    core: 0xf0a888, mid: 0xc85838, halo: 0x782818, r: 5, x: 106, y: 37 },
      { name: "Jupiter", core: 0xc8d8f0, mid: 0x6890c8, halo: 0x305078, r: 6, x: 127, y: 39 },
      { name: "Saturn",  core: 0x988878, mid: 0x584838, halo: 0x281810, r: 5, x: 148, y: 41 },
    ];

    const connector = this.add.graphics();
    connector.lineStyle(1, 0x24314d, 0.45);
    connector.beginPath();
    connector.moveTo(spheres[0].x, spheres[0].y + 1);
    for (let i = 1; i < spheres.length; i++) {
      connector.lineTo(spheres[i].x, spheres[i].y + 1);
    }
    connector.strokePath();

    const handles: {
      halo: Phaser.GameObjects.Arc;
      core: Phaser.GameObjects.Arc;
      baseAlpha: number;
    }[] = [];

    spheres.forEach((sp, i) => {
      const reached = i <= actReached;
      const baseAlpha = reached ? 0.24 : 0.10;
      const bodyAlpha = reached ? 1 : 0.42;

      const wrap = this.add.container(sp.x, sp.y);

      const halo = this.add.circle(0, 0, sp.r + 5, sp.halo, baseAlpha);
      const corona = this.add.circle(0, 0, sp.r + 2, sp.halo, reached ? 0.18 : 0.08);
      const outer = this.add.circle(0, 0, sp.r, sp.halo, bodyAlpha);
      const mid = this.add.circle(0, 0, Math.max(1, sp.r - 1), sp.mid, bodyAlpha);
      const core = this.add.circle(0, 0, Math.max(1, sp.r - 2), sp.core, bodyAlpha);
      wrap.add([halo, corona, outer, mid, core]);

      if (reached) {
        wrap.add(this.add.circle(-1, -1, 1, 0xffffff, 0.6));
      }

      // Tiny sphere-specific silhouette cues.
      if (sp.name === "Saturn") {
        const ring = this.add.ellipse(0, 0, sp.r * 3.1, sp.r * 1.3, 0xc8b090, 0.18);
        ring.setAngle(-12);
        wrap.addAt(ring, 1);
      }
      if (sp.name === "Mercury") {
        wrap.add(this.add.rectangle(0, -sp.r - 3, 1, 2, 0xf0e0a8, 0.5));
      }
      if (sp.name === "Venus") {
        wrap.add(this.add.rectangle(0, sp.r + 3, 1, 2, 0xf0c8d8, 0.45));
      }
      if (sp.name === "Jupiter") {
        wrap.add(this.add.circle(sp.r + 3, -1, 1, 0xdde6f5, 0.45));
      }

      this.tweens.add({
        targets: halo,
        scale: reached ? 1.22 : 1.14,
        alpha: reached ? 0.08 : 0.04,
        duration: 1900 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });

      this.tweens.add({
        targets: wrap,
        y: sp.y - (reached ? 1.6 : 0.9),
        duration: 2100 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
        delay: i * 80,
      });

      handles.push({ halo, core, baseAlpha });
    });

    return handles;
  }

  private buildTitleLockup() {
    const lead = "THE";
    const mainA = "HERMETIC";
    const mainB = "COMEDY";

    const leadY = 58;
    const aY = 67;
    const bY = 77;

    const leadX = Math.floor(GBC_W / 2 - measureText(lead) / 2);
    const aX = Math.floor(GBC_W / 2 - measureText(mainA) / 2);
    const bX = Math.floor(GBC_W / 2 - measureText(mainB) / 2);

    new GBCText(this, leadX, leadY, lead, {
      color: COLOR.textGold,
      shadow: "#1a2030",
      depth: 70,
    });

    new GBCText(this, aX, aY, mainA, {
      color: COLOR.textLight,
      shadow: "#1a2030",
      depth: 70,
    });

    new GBCText(this, bX, bY, mainB, {
      color: COLOR.textLight,
      shadow: "#1a2030",
      depth: 70,
    });

    const g = this.add.graphics();
    g.lineStyle(1, 0x445370, 0.5);
    g.beginPath();
    g.moveTo(48, 61);
    g.lineTo(66, 61);
    g.moveTo(94, 61);
    g.lineTo(112, 61);
    g.strokePath();

    g.lineStyle(1, 0x24314d, 0.5);
    g.beginPath();
    g.moveTo(46, 88);
    g.lineTo(114, 88);
    g.strokePath();
  }

  private buildTitleOrnament() {
    const g = this.add.graphics();

    // Small central seal between spheres and title.
    g.lineStyle(1, 0x7889a8, 0.5);
    g.strokeCircle(80, 52, 4);
    g.fillStyle(0xdde6f5, 0.7);
    g.fillRect(79, 49, 2, 2);
    g.fillRect(79, 53, 2, 2);
    g.fillRect(77, 51, 2, 2);
    g.fillRect(81, 51, 2, 2);
  }

  private buildDevButton() {
    const devBtnX = GBC_W - 28;
    const devBtnY = 4;
    drawGBCBox(this, devBtnX - 2, devBtnY, 24, 10, 120);

    const devBtn = new GBCText(this, devBtnX + 2, devBtnY + 2, "DEV", {
      color: COLOR.textDim,
      depth: 121,
    });

    devBtn.obj.setAlpha(0.78);
    devBtn.obj
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.openSkipMenu());
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
