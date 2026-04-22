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
import { loadSave, newSave, clearSave, consumeSaveLoadWarning, writeSave } from "../save";
import { ACT_BY_SCENE, ACT_TITLES, SCENE_LABEL, type SceneKey } from "../types";
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
type DevJumpSeed =
  | "prelude_last_day"
  | "prelude_crossing"
  | "reception"
  | "moon_plateau"
  | "moon_trial"
  | "metaxy"
  | "secret_annex"
  | "mercury_plateau"
  | "mercury_trial"
  | "venus_plateau"
  | "venus_trial"
  | "sun_plateau"
  | "sun_district"
  | "sun_trial"
  | "mars_plateau"
  | "mars_trial"
  | "endings_router"
  | "epilogue";

type DevJumpEntry = {
  label: string;
  scene: SceneKey;
  seed: DevJumpSeed;
  readout?: string;
};

export class TitleScene extends Phaser.Scene {
  private devMenuOpen = false;

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
    const saveLoadWarning = consumeSaveLoadWarning();
    const actReached = save?.act ?? 0;
    const remaining = save?.flags?.plateau_remain;

    this.buildTitleBackdrop();
    const sphereFx = this.buildSphereFrieze(actReached);
    this.buildTitleLockup();

    if (saveLoadWarning?.kind === "backup_recovered") {
      const note = new GBCText(this, 16, 82, "SAVE RECOVERED FROM BACKUP.", {
        color: COLOR.textGold,
        depth: 120,
      });
      this.tweens.add({
        targets: note.obj,
        alpha: 0,
        duration: 1800,
        delay: 1800,
        onComplete: () => note.destroy(),
      });
    } else if (saveLoadWarning?.kind === "corrupt_reset") {
      const note = new GBCText(this, 16, 82, "SAVE CORRUPTED. STARTING FRESH.", {
        color: COLOR.textGold,
        depth: 120,
      });
      this.tweens.add({
        targets: note.obj,
        alpha: 0,
        duration: 2200,
        delay: 2200,
        onComplete: () => note.destroy(),
      });
    }

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

    const hasSave = !!save;
    const primaryLabel = remaining ? "RETURN" : hasSave ? "CONTINUE" : "BEGIN";

    const options: { label: string; action: "launch" | "settings" | "erase" }[] = [
      { label: primaryLabel, action: "launch" },
      { label: "SETTINGS", action: "settings" },
      ...(hasSave ? [{ label: "ERASE SAVE", action: "erase" as const }] : []),
    ];

    let settingsOpen = false;
    const openTitleSettings = () => {
      if (settingsOpen || this.devMenuOpen) return;
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
    const menuY = options.length === 3 ? 92 : 96;

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
        const opt = options[i];
        const selected = i === cursor;

        if (opt.action === "erase") {
          t.setColor(selected ? COLOR.textWarn : COLOR.textDim);
        } else {
          t.setColor(selected ? COLOR.textGold : COLOR.textLight);
        }
      });

      const current = options[cursor];
      cursorMark.setColor(current.action === "erase" ? COLOR.textWarn : COLOR.textGold);
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
      if (settingsOpen || this.devMenuOpen) return;
      const opt = options[cursor];

      if (opt.action === "launch") {
        launch();
      } else if (opt.action === "settings") {
        openTitleSettings();
      } else if (opt.action === "erase") {
        erase();
      }
    };

    const move = (d: number) => {
      if (settingsOpen || this.devMenuOpen) return;
      if (options.length < 2) return;
      cursor = (cursor + d + options.length) % options.length;
      audio.sfx("cursor");
      refresh();
    };

    labels.forEach((t, i) => {
      t.obj.setInteractive({ useHandCursor: true });
      t.obj.on("pointerover", () => {
        if (settingsOpen || this.devMenuOpen) return;
        cursor = i;
        refresh();
      });
      t.obj.on("pointerdown", () => {
        if (settingsOpen || this.devMenuOpen) return;
        cursor = i;
        refresh();
        confirm();
      });
    });

    onDirection(this, (d) => {
      if (settingsOpen || this.devMenuOpen) return;
      if (d === "up") move(-1);
      else if (d === "down") move(1);
    });

    onActionDown(this, "action", confirm);

    // Erase stays available, but no longer pollutes the main menu.
    this.input.keyboard?.on("keydown-BACKSPACE", () => {
      if (settingsOpen || this.devMenuOpen) return;
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
    devBtn.obj.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      if (this.devMenuOpen) return;
      this.openSkipMenu();
    });
  }

  private devMenuLabel(scene: SceneKey, fallback: string): string {
    if (scene === "MetaxyHub") return "INTERLUDE · METAXY";
    if (scene === "AthanorThreshold") return "ACT I · GREAT WORK · ATHANOR THRESHOLD";
    if (scene === "Nigredo") return "ACT I · GREAT WORK · NIGREDO";
    if (scene === "Albedo") return "ACT I · GREAT WORK · ALBEDO";
    if (scene === "Citrinitas") return "ACT I · GREAT WORK · CITRINITAS";
    if (scene === "Rubedo") return "ACT I · GREAT WORK · RUBEDO";
    if (scene === "SealedVessel") return "ACT I · GREAT WORK · SEALED VESSEL";
    return fallback;
  }

  private devSceneReadout(scene: SceneKey): string {
    const act = ACT_BY_SCENE[scene] ?? 0;
    const actTitle = ACT_TITLES[act] ?? `ACT ${act}`;
    const sceneTitle = SCENE_LABEL[scene] ?? scene;
    return `${sceneTitle} · ${actTitle}`;
  }

  private buildDevJumpEntries(): DevJumpEntry[] {
    const all: Array<{ fallback: string; scene: SceneKey; seed: DevJumpSeed }> = [
      { fallback: "PRELUDE · LAST DAY", scene: "LastDay", seed: "prelude_last_day" },
      { fallback: "PRELUDE · CROSSING", scene: "Crossing", seed: "prelude_crossing" },

      { fallback: "ACT 0 · RECEPTION", scene: "SilverThreshold", seed: "reception" },

      { fallback: "ACT I · MOON PLATEAU", scene: "ImaginalRealm", seed: "moon_plateau" },
      { fallback: "ACT I · SELENOS' TRIAL", scene: "MoonTrial", seed: "moon_trial" },

      { fallback: "INTERLUDE · METAXY", scene: "MetaxyHub", seed: "metaxy" },

      { fallback: "ACT I · GREAT WORK · ATHANOR THRESHOLD", scene: "AthanorThreshold", seed: "secret_annex" },
      { fallback: "ACT I · GREAT WORK · NIGREDO", scene: "Nigredo", seed: "secret_annex" },
      { fallback: "ACT I · GREAT WORK · ALBEDO", scene: "Albedo", seed: "secret_annex" },
      { fallback: "ACT I · GREAT WORK · CITRINITAS", scene: "Citrinitas", seed: "secret_annex" },
      { fallback: "ACT I · GREAT WORK · RUBEDO", scene: "Rubedo", seed: "secret_annex" },
      { fallback: "ACT I · GREAT WORK · SEALED VESSEL", scene: "SealedVessel", seed: "secret_annex" },

      { fallback: "ACT II · MERCURY PLATEAU", scene: "MercuryPlateau", seed: "mercury_plateau" },
      { fallback: "ACT II · HERMAIA'S TRIAL", scene: "MercuryTrial", seed: "mercury_trial" },

      { fallback: "ACT III · VENUS PLATEAU", scene: "VenusPlateau", seed: "venus_plateau" },
      { fallback: "ACT III · KYPRIA'S TRIAL", scene: "VenusTrial", seed: "venus_trial" },

      { fallback: "ACT IV · SUN PLATEAU", scene: "SunPlateau", seed: "sun_plateau" },
      { fallback: "ACT IV · CURATED SELF", scene: "CuratedSelf", seed: "sun_district" },
      { fallback: "ACT IV · HELION'S TRIAL", scene: "SunTrial", seed: "sun_trial" },

      { fallback: "ACT V · MARS PLATEAU", scene: "MarsPlateau", seed: "mars_plateau" },
      { fallback: "ACT V · AREON'S TRIAL", scene: "MarsTrial", seed: "mars_trial" },

      { fallback: "EPILOGUE · ENDINGS ROUTER", scene: "EndingsRouter", seed: "endings_router" },
      { fallback: "EPILOGUE · BEYOND THE SPHERES", scene: "Epilogue", seed: "epilogue" },
    ];

    return all
      .filter((entry) => !!this.scene.manager.keys[entry.scene])
      .map((entry) => ({
        scene: entry.scene,
        seed: entry.seed,
        label: this.devMenuLabel(entry.scene, entry.fallback),
        readout: this.devSceneReadout(entry.scene),
      }));
  }

  private seedDevBase(slot = newSave()) {
    slot.stats = { clarity: 9, compassion: 9, courage: 9 };
    slot.coherence = 100;
    slot.clarityPoints = 18;
    slot.daimonBond = 6;
    slot.sopheneNamed = true;

    slot.plateauSettled = {};
    slot.gnosticAccepted = false;
    slot.endingChosen = null;

    slot.sphereVerbs = {
      witness: true,
      name: false,
      attune: false,
      expose: false,
      stand: false,
      weigh: false,
      release: false,
    };

    slot.garmentsReleased = {};
    slot.garmentWeights = {
      moon: 3,
      mercury: 3,
      venus: 3,
      sun: 3,
      mars: 3,
      jupiter: 3,
      saturn: 3,
    };

    slot.resonanceProfile = {
      witnessing: 2,
      control: 0,
      possession: 0,
      performance: 0,
      struggle: 0,
      structure: 1,
      surrender: 1,
    };

    slot.memoryLattice = [];
    slot.relics = [];

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

    return slot;
  }

  private seedReceptionComplete(slot: ReturnType<typeof newSave>) {
    slot.flags.intro_done = true;
    slot.flags.elem_air = true;
    slot.flags.elem_fire = true;
    slot.flags.elem_water = true;
    slot.flags.elem_earth = true;
    slot.flags.elements_done = true;
    slot.flags.daimon_bound = true;

    slot.flags.sophene_bound = true;
    slot.flags.sophene_threshold_intro_seen = true;
    slot.flags.sophene_daimon_intro_seen = true;
    slot.flags.encounter_seen_sophene_threshold = true;
    slot.flags.encounter_seen_sophene_daimon = true;

    slot.flags.soryn_bound = true;
    slot.flags.soryn_threshold_intro_seen = true;
    slot.flags.soryn_daimon_intro_seen = true;
    slot.flags.encounter_seen_soryn_threshold = true;
    slot.flags.encounter_seen_soryn_daimon = true;

    slot.flags.stone_found = true;
    slot.flags.reception_observe_taught = true;
    slot.flags.threshold_gate_preview_seen = true;
    slot.flags.threshold_basin_seen = true;
    slot.flags.threshold_quiet_completion = true;

    slot.sopheneNamed = true;
    slot.daimonBond = Math.max(slot.daimonBond, 4);
  }

  private seedMoonComplete(slot: ReturnType<typeof newSave>) {
    slot.garmentsReleased.moon = true;
    slot.garmentWeights.moon = 0;
    slot.sphereVerbs.witness = true;
    slot.flags.sphere_moon_trial_passed = true;
    slot.soulsCompleted = Math.max(slot.soulsCompleted, 5);
    slot.act2Inscription = slot.act2Inscription ?? "I AM WHAT I MET";
  }

  private seedAlchemyUnlocked(slot: ReturnType<typeof newSave>) {
    slot.flags.alchemy_hint_reception_basin = true;
    slot.flags.alchemy_hint_moon_flaw = true;
    slot.flags.alchemy_hint_metaxy_whisper = true;
    slot.flags.alchemy_secret_annex_unlocked = true;
    slot.flags.alchemy_secret_annex_seen = true;

    slot.verbs = { ...slot.verbs, witness: true, transmute: true };
    slot.blackStones = 3;
    slot.whiteStones = 3;
    slot.yellowStones = 3;
    slot.redStones = 3;
    slot.goldStone = true;
  }

  private seedMercuryPlateauReady(slot: ReturnType<typeof newSave>) {
    this.seedReceptionComplete(slot);
    this.seedMoonComplete(slot);
    slot.flags.sphere_mercury_seen = false;
  }

  private seedMercuryTrialReady(slot: ReturnType<typeof newSave>) {
    this.seedMercuryPlateauReady(slot);

    slot.flags.sphere_mercury_soul_the_defender = true;
    slot.flags.sphere_mercury_soul_the_pedant = true;
    slot.flags.sphere_mercury_soul_the_casuist = true;
    slot.flags.sphere_mercury_op_argument = true;
    slot.flags.sphere_mercury_op_proof = true;
    slot.flags.sphere_mercury_op_refutation = true;
    slot.flags.sphere_mercury_op_silence = true;
    slot.flags.sphere_mercury_cracked = true;
    slot.flags.sphere_mercury_plateau_done = true;
  }

  private seedMercuryComplete(slot: ReturnType<typeof newSave>) {
    this.seedMercuryTrialReady(slot);
    slot.flags.sphere_mercury_trial_passed = true;
    slot.garmentsReleased.mercury = true;
    slot.garmentWeights.mercury = 0;
    slot.sphereVerbs.name = true;
    if (!slot.relics.includes("I CAN NAME WHAT I DO NOT KNOW")) {
      slot.relics.push("I CAN NAME WHAT I DO NOT KNOW");
    }
  }

  private seedVenusPlateauReady(slot: ReturnType<typeof newSave>) {
    this.seedMercuryComplete(slot);
  }

  private seedVenusTrialReady(slot: ReturnType<typeof newSave>) {
    this.seedVenusPlateauReady(slot);
    slot.flags.introSeen = true;
    slot.flags.trialThresholdSeen = true;
  }

  private seedVenusComplete(slot: ReturnType<typeof newSave>) {
    this.seedVenusTrialReady(slot);
    slot.garmentsReleased.venus = true;
    slot.garmentWeights.venus = 0;
    slot.sphereVerbs.attune = true;
  }

  private seedSunPlateauReady(slot: ReturnType<typeof newSave>) {
    this.seedVenusComplete(slot);
    slot.flags.legacy_sun_bridge = true;
  }

  private seedSunTrialReady(slot: ReturnType<typeof newSave>) {
    this.seedSunPlateauReady(slot);
    slot.sunTrialReady = true;
  }

  private seedSunComplete(slot: ReturnType<typeof newSave>) {
    this.seedSunTrialReady(slot);
    slot.garmentsReleased.sun = true;
    slot.garmentWeights.sun = 0;
    slot.sphereVerbs.expose = true;
  }

  private seedMarsPlateauReady(slot: ReturnType<typeof newSave>) {
    this.seedSunComplete(slot);
  }

  private seedMarsTrialReady(slot: ReturnType<typeof newSave>) {
    this.seedMarsPlateauReady(slot);
  }

  private seedMarsComplete(slot: ReturnType<typeof newSave>) {
    this.seedMarsTrialReady(slot);
    slot.garmentsReleased.mars = true;
    slot.garmentWeights.mars = 0;
    slot.sphereVerbs.stand = true;
  }

  private seedEndgameReady(slot: ReturnType<typeof newSave>) {
    this.seedMarsComplete(slot);

    slot.garmentsReleased.jupiter = true;
    slot.garmentWeights.jupiter = 0;
    slot.sphereVerbs.weigh = true;

    slot.garmentsReleased.saturn = true;
    slot.garmentWeights.saturn = 0;
    slot.sphereVerbs.release = true;
  }

  private buildDevSkipSave(seed: DevJumpSeed, scene: SceneKey) {
    const slot = this.seedDevBase(newSave());

    switch (seed) {
      case "prelude_last_day":
        break;

      case "prelude_crossing":
        break;

      case "reception":
        break;

      case "moon_plateau":
        this.seedReceptionComplete(slot);
        break;

      case "moon_trial":
        this.seedReceptionComplete(slot);
        slot.soulsCompleted = Math.max(slot.soulsCompleted, 3);
        break;

      case "metaxy":
        this.seedReceptionComplete(slot);
        this.seedMoonComplete(slot);
        break;

      case "secret_annex":
        this.seedReceptionComplete(slot);
        this.seedMoonComplete(slot);
        this.seedAlchemyUnlocked(slot);
        break;

      case "mercury_plateau":
        this.seedMercuryPlateauReady(slot);
        break;

      case "mercury_trial":
        this.seedMercuryTrialReady(slot);
        break;

      case "venus_plateau":
        this.seedVenusPlateauReady(slot);
        break;

      case "venus_trial":
        this.seedVenusTrialReady(slot);
        break;

      case "sun_plateau":
        this.seedSunPlateauReady(slot);
        break;

      case "sun_district":
        this.seedSunPlateauReady(slot);
        break;

      case "sun_trial":
        this.seedSunTrialReady(slot);
        break;

      case "mars_plateau":
        this.seedMarsPlateauReady(slot);
        break;

      case "mars_trial":
        this.seedMarsTrialReady(slot);
        break;

      case "endings_router":
        this.seedEndgameReady(slot);
        break;

      case "epilogue":
        this.seedEndgameReady(slot);
        break;
    }

    slot.scene = scene;
    slot.act = ACT_BY_SCENE[scene] ?? slot.act;
    return slot;
  }

  /**
   * DEV-only scene jump menu — auto-filters to currently registered scenes
   * and seeds a coherent canonical save before launching.
   */
  /**
   * DEV-only scene jump menu — auto-filters to currently registered scenes
   * and seeds a coherent canonical save before launching.
   */
  private openSkipMenu() {
    if (this.devMenuOpen) return;
    this.devMenuOpen = true;

    const audio = getAudio();
    audio.sfx("cursor");

    const jumps = this.buildDevJumpEntries();

    if (!jumps.length) {
      this.devMenuOpen = false;
      const note = new GBCText(this, 18, 110, "NO REGISTERED DEV DESTINATIONS.", {
        color: COLOR.textGold,
        depth: 960,
      });
      this.time.delayedCall(1600, () => note.destroy());
      return;
    }

    const dim = this.add
      .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.88)
      .setOrigin(0, 0)
      .setDepth(950)
      .setInteractive({ useHandCursor: true });

    const box = drawGBCBox(this, 6, 8, GBC_W - 12, GBC_H - 16, 951);
    const title = new GBCText(this, 12, 12, "DEV · SCENE JUMP", {
      color: COLOR.textGold,
      depth: 952,
    });

    const counter = new GBCText(this, GBC_W - 36, 12, "", {
      color: COLOR.textDim,
      depth: 952,
    });

    const lineH = 9;
    const startY = 24;
    const itemX = 18;
    const itemFitW = GBC_W - itemX - 8;
    const bandW = GBC_W - 24;

    const jumpStates = jumps.map((j) => fitSingleLineState(j.label, itemFitW));
    const metaStates = jumps.map((j) =>
      fitSingleLineState(j.readout ?? this.devSceneReadout(j.scene), bandW),
    );

    const helpText = "↑↓ MOVE  ←→ PAGE  A JUMP  B CLOSE";
    const helpH = textHeightPx(helpText, bandW);

    const needsReadout = jumpStates.some((s) => s.trimmed);
    const maxReadoutH = needsReadout
      ? Math.max(...jumpStates.map((s) => textHeightPx(s.full, bandW)))
      : 0;

    const metaLineH = lineH;
    const footerGap = 4;

    // Reserve the entire bottom information band first:
    // [selected full label readout] + gap + [selected scene meta] + gap + [help]
    const reservedBottomH =
      (needsReadout ? maxReadoutH + footerGap : 0) +
      metaLineH +
      footerGap +
      helpH +
      6;

    const availableListH = GBC_H - 16 - startY - reservedBottomH;
    const maxRows = Math.floor(availableListH / lineH);
    const visibleRows = Math.max(1, Math.min(10, Math.min(jumps.length, maxRows)));

    const readoutY = startY + visibleRows * lineH + 4;
    const metaY = readoutY + (needsReadout ? maxReadoutH + footerGap : 0);
    const helpY = metaY + metaLineH + footerGap;

    const help = new GBCText(this, 12, helpY, helpText, {
      color: COLOR.textDim,
      depth: 952,
      maxWidthPx: bandW,
    });

    let pick = 0;

    const items: GBCText[] = [];
    for (let i = 0; i < visibleRows; i++) {
      items.push(
        new GBCText(this, itemX, startY + i * lineH, "", {
          color: COLOR.textLight,
          depth: 952,
        }),
      );
    }

    const mark = new GBCText(this, 10, startY, "▶", {
      color: COLOR.textGold,
      depth: 953,
    });

    const selectedReadout = needsReadout
      ? new GBCText(this, 12, readoutY, "", {
          color: COLOR.textAccent,
          depth: 952,
          maxWidthPx: bandW,
        })
      : null;

    // Important: metadata line is forced to single-line fitted text.
    const selectedSceneLine = new GBCText(this, 12, metaY, "", {
      color: COLOR.textDim,
      depth: 952,
    });

    const computeStart = (p: number): number => {
      const half = Math.floor(visibleRows / 2);
      const max = Math.max(0, jumps.length - visibleRows);
      return Math.max(0, Math.min(max, p - half));
    };

    let rowToJump: number[] = [];
    let closed = false;

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

      if (selectedReadout) {
        selectedReadout.setText(jumpStates[pick].full);
      }

      const chosen = jumps[pick];
      selectedSceneLine.setText(chosen.readout ?? this.devSceneReadout(chosen.scene));
    };

    refreshSkip();

    const cleanup = () => {
      if (closed) return;
      closed = true;
      this.devMenuOpen = false;

      unbindAct();
      unbindCancel();
      unbindDir();

      dim.removeAllListeners();
      items.forEach((t) => t.obj.removeAllListeners());

      dim.destroy();
      box.destroy();
      title.destroy();
      counter.destroy();
      help.destroy();
      items.forEach((t) => t.destroy());
      selectedReadout?.destroy();
      selectedSceneLine.destroy();
      mark.destroy();
    };

    const closeMenu = () => {
      audio.sfx("cursor");
      cleanup();
    };

    dim.on("pointerdown", closeMenu);

    const jumpTo = (idx: number) => {
      const j = jumps[idx];
      if (!j) return;
      if (!this.scene.manager.keys[j.scene]) {
        audio.sfx("cancel");
        console.warn("[dev-skip] scene not registered:", j.scene);
        return;
      }

      const slot = this.buildDevSkipSave(j.seed, j.scene);

      try {
        writeSave(slot);
      } catch (err) {
        console.warn("[dev-skip] failed to persist seeded save", err);
      }

      audio.sfx("confirm");

      try {
        cleanup();
        audio.music.stop();
        this.scene.start(j.scene, { save: slot });
      } catch (err) {
        console.error("[dev-skip] failed to start", j.scene, err);
      }
    };

    const pageMove = (dir: -1 | 1) => {
      const page = Math.max(1, visibleRows - 1);
      pick = (pick + dir * page + jumps.length) % jumps.length;
      audio.sfx("cursor");
      refreshSkip();
    };

    const unbindAct = onActionDown(this, "action", () => jumpTo(pick));

    const unbindCancel = onActionDown(this, "cancel", () => {
      closeMenu();
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
      } else if (d === "left") {
        pageMove(-1);
      } else if (d === "right") {
        pageMove(1);
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

    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
  }
}
