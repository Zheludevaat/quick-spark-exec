import * as Phaser from "phaser";
import { GBC_W, GBC_H, TILE, COLOR, GBCText, TILE_INDEX, gbcWipe, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { ImaginalRegion, SaveSlot } from "../types";
import { attachHUD, mountImaginalProgressBadge, InputState, makeRowan, animateRowan, runDialog } from "./hud";
import { SorynCompanion } from "../companion";
import { getAudio, SONG_MOON } from "../audio";
import {
  dispatchKnot,
  KNOT_TAGLINE,
  KNOT_VERB,
  type KnotKind,
  type KnotResult,
} from "./imaginal/knots";
import { onActionDown } from "../controls";
import { awardShardFragment } from "../shardFeedback";
import { emitHudStatChanged } from "../ui/hudSignals";
import { activateQuest, completeQuest, questStatus } from "../sideQuests";
import { soulsForRegion, type SoulDef } from "./imaginal/souls";
import { buildSoulSprite, type SoulMood } from "./imaginal/soulSprites";
import { runSoul, isSoulDone, recentSoulEvents } from "./imaginal/soulRunner";
import { getArc } from "./imaginal/soulArcs";
import { openQuestLog } from "../questLog";

type Knot = {
  kind: KnotKind;
  region: ImaginalRegion;
  x: number;
  y: number;
  cleared: boolean;
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Arc;
};

type SeedEchoMote = {
  id: string;
  x: number;
  y: number;
  seedRef: string;
  sprite: Phaser.GameObjects.Arc;
  halo: Phaser.GameObjects.Arc;
  touched: boolean;
};

const REGION_TITLE: Record<ImaginalRegion, string> = {
  pools: "THE REFLECTING POOLS",
  field: "THE GLITTERING FIELD",
  corridor: "THE QUIET CORRIDOR",
};

const REGION_BG: Record<ImaginalRegion, string> = {
  pools: "#0a1428",
  field: "#1a1830",
  corridor: "#080a14",
};

const MAP_W = 10,
  MAP_H = 9;

function buildMap(region: ImaginalRegion): number[][] {
  const T = TILE_INDEX;
  const m: number[][] = [];

  // Pass 1: Base Scatter Floor (Organic Noise)
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push(Math.random() > 0.65 ? T.MOON_FLOOR_REFLECT : T.MOON_FLOOR);
    }
    m.push(row);
  }

  // Pass 2: Organic Boundaries & Jagged Edges
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const isTopEdge = y === 0;
      const isSideEdge = x === 0 || x === MAP_W - 1;
      const isBottomEdge = y === MAP_H - 1 && region === "corridor";

      if (isTopEdge || isSideEdge || isBottomEdge) {
        m[y][x] = T.MOON_WALL;

        if (Math.random() > 0.8) {
          if (isTopEdge && y + 1 < MAP_H) m[y + 1][x] = T.MOON_PILLAR;
          if (x === 0 && x + 1 < MAP_W) m[y][x + 1] = T.MOON_PILLAR;
          if (x === MAP_W - 1 && x - 1 >= 0) m[y][x - 1] = T.MOON_PILLAR;
        }
      }
    }
  }

  // Pass 3: Region-Specific Landmarks
  if (region === "pools") {
    if (m[2][2] !== T.MOON_WALL) m[2][2] = T.MOON_PILLAR;
    if (m[4][8] !== T.MOON_WALL) m[4][8] = T.MOON_PILLAR;
    if (m[6][3] !== T.MOON_WALL) m[6][3] = T.MOON_PILLAR;
  } else if (region === "field") {
    [ [2, 8], [3, 2], [6, 7], [7, 2] ].forEach(([py, px]) => {
      if (m[py][px] !== T.MOON_WALL) m[py][px] = T.MOON_PILLAR;
    });
  } else if (region === "corridor") {
    for (let y = 2; y < MAP_H - 2; y++) {
      if (Math.random() > 0.4) m[y][2] = T.MOON_PILLAR;
      if (Math.random() > 0.4) m[y][7] = T.MOON_PILLAR;
    }
  }

  return m;
}

const KNOT_LAYOUT: Knot[] = [];
function defineLayout(): { kind: KnotKind; region: ImaginalRegion; x: number; y: number }[] {
  return [
    // Pools — soft tutorial, 2 knots
    { kind: "reflection", region: "pools", x: 48, y: 56 },
    { kind: "echo", region: "pools", x: 112, y: 56 },
    // Field — strange, 2 knots
    { kind: "glitter", region: "field", x: 40, y: 60 },
    { kind: "lantern", region: "field", x: 120, y: 60 },
    // Corridor — narrow, 1 optional knot
    { kind: "crown", region: "corridor", x: 80, y: 56 },
  ];
}

export class ImaginalRealmScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private input2!: InputState;
  private knots: Knot[] = [];
  private dialogActive = false;
  private knotActive = false;
  private hint!: GBCText;
  private titleText!: GBCText;
  private focusGlow!: Phaser.GameObjects.Arc;
  private companion?: SorynCompanion;
  private region: ImaginalRegion = "pools";
  private lastRegion: ImaginalRegion | null = null;
  private regionRoot!: Phaser.GameObjects.Container;
  private seedEchoes: SeedEchoMote[] = [];
  private daimonMark!: GBCText;
  private knotTracker!: GBCText;
  private soulTracker!: GBCText;
  /** Stonechild's 3 syllable lanterns — each lights when OBSERVED nearby. */
  private syllableLanterns: {
    syllable: string;
    x: number;
    y: number;
    flame: Phaser.GameObjects.Arc;
    halo: Phaser.GameObjects.Arc;
    label?: GBCText;
    lit: boolean;
  }[] = [];
  /** Echo follower (NG+ companion). Trails Rowan opposite Soryn. */
  private echoFollower?: {
    container: Phaser.GameObjects.Container;
    halo: Phaser.GameObjects.Arc;
    barkTimer?: Phaser.Time.TimerEvent;
  };
  private souls: {
    def: SoulDef;
    container: Phaser.GameObjects.Container;
    halo: Phaser.GameObjects.Arc;
    setMood: (m: SoulMood) => void;
    destroy: () => void;
    mood: SoulMood;
    nameLabel?: GBCText;
    hookLabel?: GBCText;
    nearTime: number;
    barkShown: boolean;
    bark?: GBCText;
  }[] = [];

  constructor() {
    super("ImaginalRealm");
  }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.knots = [];
    this.seedEchoes = [];
    this.souls = [];
    this.syllableLanterns = [];
    this.dialogActive = false;
    this.knotActive = false;
    this.save.act = 1;
    this.region = (this.save.region as ImaginalRegion) ?? "pools";
    if (!this.save.region) {
      this.save.region = "pools";
      writeSave(this.save);
    }
  }

  create() {
    getAudio().music.play("moon", SONG_MOON);
    this.rowanShadow = this.add.ellipse(24, 38, 10, 3, 0x000000, 0.35).setDepth(9);
    this.rowan = makeRowan(this, 24, 32, "soul");
    this.rowan.setDepth(10);
    this.focusGlow = this.add.circle(0, 0, 11, 0xffffff, 0).setDepth(15);

    attachHUD(this, () => this.save.stats);
    mountImaginalProgressBadge(this, {
      fragments: this.save.shardFragments ?? 0,
      shards: this.save.shards.length,
    });
    // Quest-log on J (DOM listener — simple, doesn't conflict with rebindable actions)
    const onJ = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "j" && !this.dialogActive && !this.knotActive) {
        this.dialogActive = true;
        openQuestLog(this, this.save, () => {
          this.dialogActive = false;
        });
      }
    };
    window.addEventListener("keydown", onJ);
    this.events.once("shutdown", () => window.removeEventListener("keydown", onJ));
    this.input2 = new InputState(this);
    this.events.on("vinput-action", () => this.tryInteract());
    onActionDown(this, "action", () => this.tryInteract());

    // Daimon Mark glyph (top-right of HUD bar) — uniform 4-letter codes.
    const bondLabel = this.daimonBondLabel();
    this.daimonMark = new GBCText(this, GBC_W - 30, 2, bondLabel, {
      color: COLOR.textAccent,
      depth: 220,
      scrollFactor: 0,
    });
    // Knot tracker chip (right of stats bar, left of daimon badge)
    this.knotTracker = new GBCText(this, GBC_W - 60, 2, "", {
      color: COLOR.textGold,
      depth: 220,
      scrollFactor: 0,
    });
    // Soul-completion chip (left of knot tracker) — per-region count.
    this.soulTracker = new GBCText(this, GBC_W - 96, 2, "", {
      color: COLOR.textAccent,
      depth: 220,
      scrollFactor: 0,
    });
    this.refreshKnotTracker();
    this.refreshSoulTracker();

    // Spawn the daimon companion (lives across all 3 sub-regions)
    this.companion = new SorynCompanion(this, this.rowan, () => this.companionLines(), [
      "BREATHE.",
      "I AM HERE.",
      "THE MIRROR LIES KINDLY.",
      "YOU ARE DOING WELL.",
      "WITNESS WHEN UNSURE.",
    ]);

    this.add.rectangle(0, 13, GBC_W, 9, 0x0a0e1a, 0.85).setOrigin(0, 0).setDepth(199);
    this.titleText = new GBCText(this, 4, 14, REGION_TITLE[this.region], {
      color: COLOR.textAccent,
      depth: 200,
    });
    this.add
      .rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "WALK", {
      color: COLOR.textDim,
      depth: 200,
      scrollFactor: 0,
    });

    // First entry: load the region first so the player can see the world,
    // THEN Soryn binds + teaches WITNESS over the rendered scene.
    if (!this.save.flags.imaginal_intro) {
      this.save.flags.imaginal_intro = true;
      this.save.verbs.witness = true;
      writeSave(this.save);
      this.loadRegion(this.region);
      this.dialogActive = true;
      this.time.delayedCall(500, () =>
        runDialog(
          this,
          [
            { who: "Soryn", text: "This is the Imaginal Realm. The Moon's first plateau." },
            { who: "Soryn", text: "Three regions. Five knots. One door at the south." },
            { who: "Soryn", text: "Here, thought is landscape. The mirrors are not glass —" },
            { who: "Soryn", text: "they are images you mistook for self." },
            {
              who: "Soryn",
              text: "I give you a verb: WITNESS. To stand and see without flinching.",
            },
            {
              who: "Soryn",
              text: "Walk south to leave each region. I will be a half-step behind.",
            },
          ],
          () => {
            this.dialogActive = false;
          },
        ),
      );
    } else {
      this.loadRegion(this.region);
    }
  }

  // ============================================================================
  // REGION LOAD / TRANSITION
  // ============================================================================
  private loadRegion(region: ImaginalRegion) {
    if (this.regionRoot) this.regionRoot.destroy();
    this.knots = [];
    this.seedEchoes = [];
    // Tear down any souls from the previous region.
    this.souls.forEach((s) => {
      s.destroy();
      s.nameLabel?.destroy();
      s.hookLabel?.destroy();
      s.bark?.destroy();
    });
    this.souls = [];
    this.region = region;
    this.save.region = region;
    writeSave(this.save);
    this.titleText.setText(REGION_TITLE[region]);
    this.cameras.main.setBackgroundColor(REGION_BG[region]);
    this.cameras.main.fadeIn(400);

    this.regionRoot = this.add.container(0, 0).setDepth(0);

    const map = buildMap(region);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const img = this.add.image(x * TILE, y * TILE, "gbc_tiles", map[y][x]).setOrigin(0, 0);
        this.regionRoot.add(img);
      }
    }

    // Region-flavour motes
    if (region === "pools") {
      spawnMotes(this, {
        count: 16,
        color: 0x88c0e8,
        alpha: 0.55,
        driftY: -0.004,
        driftX: 0.003,
        depth: 30,
      });
      // Pool reflections — translucent puddles
      [
        { x: 32, y: 80 },
        { x: 128, y: 80 },
        { x: 80, y: 96 },
      ].forEach((p) => {
        const pool = this.add.ellipse(p.x, p.y, 22, 6, 0x88c0e8, 0.35).setDepth(1);
        this.regionRoot.add(pool);
      });
    } else if (region === "field") {
      spawnMotes(this, {
        count: 18,
        color: 0xffe098,
        alpha: 0.5,
        driftY: -0.008,
        driftX: 0.004,
        depth: 30,
      });
      spawnMotes(this, {
        count: 6,
        color: 0xa8c8e8,
        alpha: 0.4,
        driftY: 0.005,
        driftX: -0.003,
        depth: 30,
      });
      this.spawnSeedEchoes();
    } else {
      spawnMotes(this, {
        count: 8,
        color: 0x5a78b8,
        alpha: 0.4,
        driftY: -0.002,
        driftX: 0,
        depth: 30,
      });
      // Corridor walls — vertical hint
      const g = this.add.graphics();
      g.fillStyle(0x1a2238, 0.4);
      g.fillRect(8, 24, 4, GBC_H - 36);
      g.fillRect(GBC_W - 12, 24, 4, GBC_H - 36);
      this.regionRoot.add(g);
      this.spawnSyllableLanterns();
    }

    // Place knots for this region
    for (const def of defineLayout().filter((k) => k.region === region)) {
      const cleared = !!this.save.flags[`knot_${def.kind}`];
      const sprite = this.add.image(
        def.x,
        def.y,
        "gbc_tiles",
        cleared ? TILE_INDEX.MIRROR_CLEARED : TILE_INDEX.MIRROR_FRAME,
      );
      let glow: Phaser.GameObjects.Arc | undefined;
      if (!cleared) {
        const c = def.kind === "lantern" ? 0xffe098 : def.kind === "crown" ? 0xd8a868 : 0xa8c8e8;
        glow = this.add.circle(def.x, def.y, 9, c, 0.25);
        this.tweens.add({
          targets: glow,
          scale: 1.4,
          alpha: 0.1,
          duration: 1100,
          yoyo: true,
          repeat: -1,
        });
        this.tweens.add({
          targets: sprite,
          y: def.y - 1,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }
      this.knots.push({ ...def, cleared, sprite, glow });
      this.regionRoot.add(sprite);
      if (glow) this.regionRoot.add(glow);
    }

    // Spawn souls — presence styling lives in buildSoulSprite/setMood now.
    for (const def of soulsForRegion(this.save, region)) {
      const built = buildSoulSprite(this, def.archetype, def.x, def.y);
      const done = isSoulDone(this.save, def.id);
      const initialMood: SoulMood = done ? "resolved" : "waiting";
      built.setMood(initialMood);

      this.regionRoot.add(built.halo);
      this.regionRoot.add(built.container);

      this.souls.push({
        def,
        container: built.container,
        halo: built.halo,
        setMood: built.setMood,
        destroy: built.destroy,
        mood: initialMood,
        nearTime: 0,
        barkShown: false,
      });
    }
    this.refreshSoulTracker();
    // so a "go back north" flow lands them at the south edge instead of
    // teleporting back to the original entry.
    const from = this.lastRegion;
    if (region === "pools") {
      if (from === "field") this.rowan.setPosition(80, GBC_H - 24);
      else this.rowan.setPosition(24, 56);
    } else if (region === "field") {
      if (from === "corridor") this.rowan.setPosition(80, GBC_H - 24);
      else this.rowan.setPosition(80, 32);
    } else {
      this.rowan.setPosition(80, 32);
    }
    this.lastRegion = region;

    // Region-specific intros (one-shot)
    const introFlag = `intro_${region}`;
    if (!this.save.flags[introFlag]) {
      this.save.flags[introFlag] = true;
      writeSave(this.save);
      this.dialogActive = true;
      this.time.delayedCall(500, () =>
        runDialog(this, this.regionIntro(region), () => {
          this.dialogActive = false;
        }),
      );
    }

    // Corridor: companion hides at south edge before boss door
    if (this.companion) this.companion.setVisible(true);
    // Spawn / refresh Echo follower if she's been unlocked.
    this.destroyEchoFollower();
    this.spawnEchoFollower();
  }

  private spawnSeedEchoes() {
    const all = ["seed_call", "seed_window", "seed_kettle", "seed_coat", "seed_mirror"];
    const seeds = all.filter((s) => this.save.seeds[s] && !this.save.seedEchoes[s]);
    // Fallback: if the player set few/no seeds in Act 0, spawn 2 generic echoes
    // so the field is never empty. They become "an echo" in copy.
    if (seeds.length < 2) {
      const generic = ["seed_call", "seed_mirror"].filter((s) => !this.save.seedEchoes[s]);
      for (const g of generic) {
        if (seeds.length >= 2) break;
        if (!seeds.includes(g)) seeds.push(g);
      }
    }
    const positions = [
      { x: 60, y: 80 },
      { x: 100, y: 80 },
      { x: 30, y: 96 },
      { x: 130, y: 96 },
      { x: 80, y: 100 },
    ];
    seeds.forEach((seed, i) => {
      const p = positions[i % positions.length];
      const halo = this.add.circle(p.x, p.y, 5, 0xffe098, 0.35).setDepth(19);
      const sprite = this.add.circle(p.x, p.y, 2, 0xffe098, 0.95).setDepth(20);
      this.tweens.add({
        targets: halo,
        scale: 1.6,
        alpha: 0.1,
        duration: 1100,
        yoyo: true,
        repeat: -1,
      });
      this.tweens.add({
        targets: sprite,
        y: p.y - 2,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      this.regionRoot.add(halo);
      this.regionRoot.add(sprite);
      this.seedEchoes.push({
        id: `${seed}_echo`,
        x: p.x,
        y: p.y,
        seedRef: seed,
        sprite,
        halo,
        touched: false,
      });
    });
  }

  /**
   * Three syllable lanterns for the Stonechild's name quest. Each lights when
   * Rowan stands within ~12px (no button press — passive OBSERVE). When all 3
   * are lit, save.flags.stonechild_name_known is set so the Stonechild's
   * "EL · I · AS" inquiry option becomes available.
   */
  private spawnSyllableLanterns() {
    const positions: { syllable: string; x: number; y: number }[] = [
      { syllable: "EL", x: 24, y: 48 },
      { syllable: "I", x: 80, y: 112 },
      { syllable: "AS", x: 144, y: 48 },
    ];
    const litFlags = this.save.flags;
    for (const p of positions) {
      const flagKey = `lantern_lit_${p.syllable}`;
      const lit = !!litFlags[flagKey];
      const halo = this.add
        .circle(p.x, p.y, 6, 0xffe098, lit ? 0.45 : 0.15)
        .setDepth(18);
      const flame = this.add
        .circle(p.x, p.y - 3, 2, lit ? 0xffe098 : 0x4a4a3a, lit ? 1 : 0.5)
        .setDepth(19);
      // Lantern body
      const body = this.add.rectangle(p.x, p.y, 4, 6, 0x584830, 1).setDepth(18);
      this.regionRoot.add(body);
      this.regionRoot.add(halo);
      this.regionRoot.add(flame);
      if (lit) {
        this.tweens.add({
          targets: halo,
          scale: 1.5,
          alpha: 0.2,
          duration: 1100,
          yoyo: true,
          repeat: -1,
        });
      }
      this.syllableLanterns.push({
        syllable: p.syllable,
        x: p.x,
        y: p.y,
        flame,
        halo,
        lit,
      });
    }
  }

  /** Light a lantern (idempotent). Updates save + checks the all-3 milestone. */
  private litLantern(l: (typeof this.syllableLanterns)[number]) {
    if (l.lit) return;
    l.lit = true;
    this.save.flags[`lantern_lit_${l.syllable}`] = true;
    l.flame.setFillStyle(0xffe098, 1);
    l.halo.setFillStyle(0xffe098, 0.45);
    this.tweens.add({
      targets: l.halo,
      scale: 1.5,
      alpha: 0.2,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });
    // Floating syllable text
    const t = new GBCText(this, l.x - 6, l.y - 18, l.syllable, {
      color: COLOR.textGold,
      depth: 220,
    });
    this.tweens.add({
      targets: t.obj,
      alpha: 0,
      y: l.y - 30,
      duration: 1800,
      onComplete: () => t.destroy(),
    });
    getAudio().sfx("confirm");
    // All 3 lit?
    if (this.syllableLanterns.every((x) => x.lit)) {
      this.save.flags.stonechild_name_known = true;
    }
    writeSave(this.save);
  }

  /**
   * Spawn the Echo as a permanent follower once the Walking Saint has been
   * witnessed (echo_follower_unlocked flag). She trails Rowan one step
   * behind on the opposite side from Soryn (Soryn left → Echo right).
   */
  private spawnEchoFollower() {
    if (this.echoFollower) return;
    if (!this.save.flags.echo_follower_unlocked) return;
    const c = this.add.container(this.rowan.x + 14, this.rowan.y - 4).setDepth(4);
    // Tiny robed figure — pale blue
    const robe = this.add.rectangle(0, 2, 6, 8, 0x586878, 0.85);
    const head = this.add.rectangle(0, -3, 5, 4, 0xa8c8e8, 0.9);
    c.add(robe);
    c.add(head);
    const halo = this.add.circle(this.rowan.x + 14, this.rowan.y - 4, 6, 0xa8c8e8, 0.18).setDepth(3);
    this.tweens.add({
      targets: halo,
      scale: 1.3,
      alpha: 0.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
    // Drifting bob
    this.tweens.add({
      targets: c,
      y: c.y - 1.5,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // Ambient bark every ~22s when idle
    const barkLines = [
      "I AM A FAINTER VERSION.",
      "YOU OUTPACE ME, KINDLY.",
      "THE SAINT WALKED ON. SO DID I.",
      "TWO SHADOWS. NEITHER FULL.",
    ];
    const barkTimer = this.time.addEvent({
      delay: 22000,
      loop: true,
      callback: () => {
        if (this.dialogActive || this.knotActive) return;
        const line = barkLines[Math.floor(Math.random() * barkLines.length)];
        const t = new GBCText(this, c.x - 24, c.y - 18, line, {
          color: COLOR.textDim,
          depth: 220,
        });
        this.tweens.add({
          targets: t.obj,
          alpha: 0,
          y: c.y - 32,
          duration: 2400,
          onComplete: () => t.destroy(),
        });
      },
    });
    this.echoFollower = { container: c, halo, barkTimer };
  }

  private updateEchoFollower() {
    if (!this.echoFollower) return;
    // Mirror Soryn: she sits opposite the player's facing direction.
    const dir = this.rowan.getData("dir") as string | undefined;
    let ox = 14,
      oy = -4;
    switch (dir) {
      case "up":
        ox = 0;
        oy = 10;
        break;
      case "down":
        ox = 0;
        oy = -16;
        break;
      case "left":
        ox = -16;
        oy = -4;
        break;
      case "right":
        ox = 16;
        oy = -4;
        break;
    }
    const tx = this.rowan.x + ox;
    const ty = this.rowan.y + oy;
    this.echoFollower.container.x = Phaser.Math.Linear(this.echoFollower.container.x, tx, 0.06);
    this.echoFollower.container.y = Phaser.Math.Linear(this.echoFollower.container.y, ty, 0.06);
    this.echoFollower.halo.setPosition(
      this.echoFollower.container.x,
      this.echoFollower.container.y,
    );
  }

  private destroyEchoFollower() {
    if (!this.echoFollower) return;
    this.echoFollower.barkTimer?.remove(false);
    this.echoFollower.container.destroy();
    this.echoFollower.halo.destroy();
    this.echoFollower = undefined;
  }

  private regionIntro(region: ImaginalRegion): { who: string; text: string }[] {
    if (region === "pools")
      return [
        { who: "Soryn", text: "The Pools. Standing silver-water. Things that mimic move slowly." },
        {
          who: "Soryn",
          text: "Two knots here. The one west copies you. The one east speaks back.",
        },
      ];
    if (region === "field")
      return [
        {
          who: "Soryn",
          text: "The Field. Suspended afternoon-light. Time is paused here, kindly.",
        },
        {
          who: "Soryn",
          text: "The little gold motes are echoes of what you touched in your last day.",
        },
        { who: "Soryn", text: "Walk through them. They will speak." },
      ];
    return [
      { who: "Soryn", text: "The Corridor. Narrow. A wished-self waits — optional." },
      {
        who: "Soryn",
        text: "The door at the south leads to the Curated Self. I cannot enter it with you.",
      },
    ];
  }

  // ============================================================================
  // UPDATE
  // ============================================================================
  update(_t: number, dt: number) {
    if (this.dialogActive || this.knotActive) return;
    const speed = 0.04 * dt;
    const i = this.input2.poll();
    let dx = 0,
      dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 12, GBC_W - 12);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 22, GBC_H - 18);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);
    if (this.companion) {
      this.companion.update();
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) this.companion.pingMovement();
    }
    this.updateEchoFollower();

    // Seed-echo touch
    for (const m of this.seedEchoes) {
      if (m.touched) continue;
      const sdx = this.rowan.x - m.x,
        sdy = this.rowan.y - m.y;
      if (sdx * sdx + sdy * sdy < 7 * 7) this.touchSeedEcho(m);
    }

    // Syllable lanterns: passive OBSERVE — light when Rowan stands within 12px.
    for (const l of this.syllableLanterns) {
      if (l.lit) continue;
      const lx = this.rowan.x - l.x;
      const ly = this.rowan.y - l.y;
      if (lx * lx + ly * ly < 12 * 12) this.litLantern(l);
    }

    // Edge transitions
    if (this.region === "pools" && this.rowan.y > GBC_H - 20 && this.allowExit("pools"))
      this.transitionTo("field");
    else if (this.region === "field" && this.rowan.y > GBC_H - 20 && this.allowExit("field"))
      this.transitionTo("corridor");
    else if (this.region === "field" && this.rowan.y < 24) this.transitionTo("pools");
    else if (this.region === "corridor" && this.rowan.y < 24) this.transitionTo("field");

    // Soul proximity: drive mood, show name/hook, accumulate ambient bark timer.
    const nearSoul = this.nearestSoul();
    for (const s of this.souls) {
      const isNear = s === nearSoul;
      const done = isSoulDone(this.save, s.def.id);

      if (isNear) {
        this.setSoulMood(s, done ? "resolved" : "engaged");

        if (!s.nameLabel) {
          s.nameLabel = new GBCText(this, s.def.x - 24, s.def.y - 18, s.def.name, {
            color: COLOR.textGold,
            depth: 22,
          });
          s.hookLabel = new GBCText(this, 4, GBC_H - 9, s.def.hook, {
            color: COLOR.textWarn,
            depth: 200,
            scrollFactor: 0,
            maxWidthPx: GBC_W - 8,
          });
        }

        s.nearTime += dt;

        if (!s.barkShown && !done && s.nearTime > 2400) {
          s.barkShown = true;
          s.bark = new GBCText(this, s.def.x - 18, s.def.y - 26, "...", {
            color: COLOR.textDim,
            depth: 23,
          });
          this.tweens.add({
            targets: s.bark.obj,
            alpha: 0,
            y: s.def.y - 36,
            duration: 1800,
            delay: 600,
            onComplete: () => s.bark?.destroy(),
          });
        }
      } else {
        this.setSoulMood(s, done ? "resolved" : "waiting");
        s.nearTime = 0;
        s.barkShown = false;

        if (s.nameLabel) {
          s.nameLabel.destroy();
          s.nameLabel = undefined;
          s.hookLabel?.destroy();
          s.hookLabel = undefined;
        }
      }
    }

    // Hint + focus
    const near = this.nearestKnot();
    if (nearSoul) {
      // Soul takes hint priority — its hookLabel is already showing.
      this.focusGlow.fillAlpha = 0;
    } else if (near && this.dist(near) < 16 * 16) {
      this.focusGlow.setPosition(near.x, near.y);
      this.focusGlow.fillColor = near.cleared ? 0xa8e8c8 : 0xa8c8e8;
      this.focusGlow.fillAlpha = 0.25;
      if (near.cleared) this.hint.setText("THIS KNOT IS QUIET.");
      else this.hint.setText(`A: ${KNOT_TAGLINE[near.kind]} (${KNOT_VERB[near.kind]})`);
    } else {
      this.focusGlow.fillAlpha = 0;
      // Region status
      if (this.region === "corridor") {
        const cleared = this.totalCleared();
        const needed = 3;
        if (cleared >= needed && this.rowan.y > GBC_H - 24)
          this.hint.setText("A: ENTER THE CURATED SELF");
        else this.hint.setText(`KNOTS QUIETED ${cleared}/5  (${needed} TO PROCEED)`);
      } else {
        this.hint.setText(
          this.region === "pools" ? "WALK SOUTH TO THE FIELD" : "WALK SOUTH TO THE CORRIDOR",
        );
      }
    }
  }

  private setSoulMood(soul: (typeof this.souls)[number], mood: SoulMood) {
    if (soul.mood === mood) return;
    soul.mood = mood;
    soul.setMood(mood);
  }

  private nearestSoul() {
    let best: (typeof this.souls)[number] | null = null;
    let bd = 18 * 18;
    for (const s of this.souls) {
      const dx = this.rowan.x - s.def.x;
      const dy = this.rowan.y - s.def.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  private touchSeedEcho(m: SeedEchoMote) {
    m.touched = true;
    this.save.seedEchoes[m.seedRef] = true;
    awardShardFragment(this, this.save, () => `field_${this.save.shards.length}`, {
      x: m.x,
      y: m.y,
    });
    writeSave(this.save);
    const lines: Record<string, string> = {
      seed_call: "MARA. SHE STILL CALLS.",
      seed_window: "THE CHILD IS GROWN. STILL WAVING.",
      seed_kettle: "TWO CUPS. STILL POURED.",
      seed_coat: "THE COAT. STILL WAITING.",
      seed_mirror: "YOU. STILL HERE.",
    };
    const t = new GBCText(this, m.x - 28, m.y - 12, lines[m.seedRef] ?? "AN ECHO.", {
      color: COLOR.textGold,
      depth: 220,
    });
    this.tweens.add({
      targets: t.obj,
      alpha: 0,
      y: m.y - 28,
      duration: 1800,
      onComplete: () => t.destroy(),
    });
    this.tweens.add({
      targets: m.sprite,
      scale: 3,
      alpha: 0,
      duration: 600,
      onComplete: () => m.sprite.destroy(),
    });
    this.tweens.add({
      targets: m.halo,
      scale: 3,
      alpha: 0,
      duration: 600,
      onComplete: () => m.halo.destroy(),
    });
    // Side quest: touch every echo in the field
    if (this.region === "field" && questStatus(this.save, "all_echoes_field") !== "done") {
      activateQuest(this, this.save, "all_echoes_field");
      const fieldRefs = ["seed_call", "seed_window", "seed_kettle", "seed_coat", "seed_mirror"];
      const allTouched = fieldRefs.every((s) => this.save.seedEchoes[s]);
      if (allTouched) completeQuest(this, this.save, "all_echoes_field");
    }
    this.events.emit("stats-changed");
  }

  private allowExit(_from: ImaginalRegion): boolean {
    // Always allow region transitions; knots are optional per region.
    return true;
  }

  private transitionTo(region: ImaginalRegion) {
    this.dialogActive = true;
    gbcWipe(this, () => {
      this.dialogActive = false;
      this.loadRegion(region);
    });
  }

  // ============================================================================
  // INTERACT
  // ============================================================================
  private dist(k: Knot) {
    const dx = this.rowan.x - k.x,
      dy = this.rowan.y - k.y;
    return dx * dx + dy * dy;
  }
  private nearestKnot(): Knot | null {
    let best: Knot | null = null;
    let bd = Infinity;
    for (const k of this.knots) {
      const d = this.dist(k);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }
  private totalCleared(): number {
    let n = 0;
    for (const k of defineLayout()) if (this.save.flags[`knot_${k.kind}`]) n++;
    return n;
  }

  private tryInteract() {
    if (this.dialogActive || this.knotActive) return;
    // Boss door (corridor south edge)
    if (this.region === "corridor" && this.rowan.y > GBC_H - 22) {
      const cleared = this.totalCleared();
      if (cleared >= 3) {
        this.save.scene = "AthanorThreshold";
        writeSave(this.save);
        const a = getAudio();
        a.sfx("boss");
        a.music.stop();
        if (this.companion) this.companion.setVisible(false);
        gbcWipe(this, () => this.scene.start("AthanorThreshold", { save: this.save }));
        return;
      }
    }
    // Soul takes priority over knot when both are in range.
    const soul = this.nearestSoul();
    if (soul) {
      this.dialogActive = true;
      runSoul(this, this.save, getArc(soul.def.id), () => {
        this.dialogActive = false;
        // Soul may have completed — refresh visual state on next frame.
        if (isSoulDone(this.save, soul.def.id)) {
          soul.container.setAlpha(0.45);
          soul.setMood("resolved");
        }
        this.refreshSoulTracker();
      });
      return;
    }
    const k = this.nearestKnot();
    if (!k || this.dist(k) > 16 * 16) return;
    if (k.cleared) {
      // Re-visit reading: short reflection, no state change.
      this.dialogActive = true;
      runDialog(this, [{ who: "Soryn", text: this.knotEcho(k.kind) }], () => {
        this.dialogActive = false;
      });
      return;
    }
    this.launchKnot(k);
  }

  /** Short reflective line shown when re-touching an already-quieted knot. */
  private knotEcho(kind: KnotKind): string {
    switch (kind) {
      case "reflection":
        return "THE MIRROR IS QUIET. NO INSIDE TO READ.";
      case "echo":
        return "THE LINE BENEATH HOLDS. YOU HEARD IT.";
      case "glitter":
        return "THE AFTERNOON IS WHOLE. EVEN THE DULL PARTS.";
      case "lantern":
        return "THE LANTERN STAYS DARK. KINDLY.";
      case "crown":
        return "PAPER. STILL PAPER.";
    }
  }

  private launchKnot(k: Knot) {
    this.knotActive = true;
    if (this.companion) this.companion.setVisible(false);
    dispatchKnot(this, k.kind, this.rowan, { x: k.x, y: k.y }, this.save, (r: KnotResult) => {
      this.knotActive = false;
      if (this.companion) this.companion.setVisible(true);
      if (!r.cleared) return;
      k.cleared = true;
      this.save.flags[`knot_${k.kind}`] = true;
      if (r.stats?.clarity) {
        this.save.stats.clarity += r.stats.clarity;
        emitHudStatChanged(this, "clarity", this.save.stats.clarity);
      }
      if (r.stats?.compassion) {
        this.save.stats.compassion += r.stats.compassion;
        emitHudStatChanged(this, "compassion", this.save.stats.compassion);
      }
      if (r.stats?.courage) {
        this.save.stats.courage += r.stats.courage;
        emitHudStatChanged(this, "courage", this.save.stats.courage);
      }
      if (r.shardFragments) {
        for (let i = 0; i < r.shardFragments; i++) {
          awardShardFragment(this, this.save, () => `imaginal_${this.save.shards.length}`, {
            x: this.rowan.x,
            y: this.rowan.y,
          });
        }
      }
      if (r.flags)
        r.flags.forEach((f) => {
          this.save.flags[f] = true;
        });
      writeSave(this.save);
      this.events.emit("stats-changed");
      k.sprite.setFrame(TILE_INDEX.MIRROR_CLEARED);
      if (k.glow) {
        k.glow.destroy();
        k.glow = undefined;
      }
      this.refreshKnotTracker();
    });
  }

  // ============================================================================
  // COMPANION CONTEXT
  // ============================================================================
  private companionLines(): { who: string; text: string }[] {
    // Highest priority: a recent soul event Soryn can react to.
    const recent = recentSoulEvents(this.save, 1)[0];
    if (recent) {
      const reaction = this.daimonReactionFor(recent);
      if (reaction) return reaction;
    }

    const cleared = this.totalCleared();
    const region = this.region;
    if (region === "pools") {
      if (cleared === 0)
        return [
          {
            who: "Soryn",
            text: "Two knots here. Stand still for the mimic. Speak true to the echo.",
          },
        ];
      return [
        { who: "Soryn", text: `${cleared} cleared. The pools settle where you have witnessed.` },
      ];
    }
    if (region === "field") {
      const echoes = Object.keys(this.save.seedEchoes).length;
      return [
        { who: "Soryn", text: `${echoes} echoes touched. The motes carry your last day.` },
        { who: "Soryn", text: "The lantern lies kindly. RELEASE is the only honest verb here." },
      ];
    }
    return [
      { who: "Soryn", text: "The crown is optional. WITNESS — or do not — and walk south." },
      { who: "Soryn", text: "I cannot enter the boss room. WITNESS is yours alone now." },
    ];
  }

  /** Soryn's one-liner reaction to a recent soul:tag event. Null = no comment. */
  private daimonReactionFor(event: string): { who: string; text: string }[] | null {
    const map: Record<string, string> = {
      "walking_saint:forced": "You forced the saint. That sits oddly with me.",
      "walking_saint:witnessed": "You stayed without giving. That was the harder thing.",
      "cartographer:witnessed": "The cartographer's last river. You stood still for it. Good.",
      "drowned_poet:named_thoughts": "The song is whole. You returned a word to the water.",
      "drowned_poet:confessed": "You said you didn't know. The water liked that.",
      "weeping_twin:released": "She laughed. Briefly. That counts as much as anything here.",
      "weeping_twin:stayed": "Twice-watched. You looked back. She felt it.",
      "mirror_philosopher:argued": "He revises his theory. Slowly. You unsettled the pool.",
      "mirror_philosopher:agreed": "You agreed with him. Don't follow him into the water.",
      "lantern_mathematician:guessed_neither": "Neither. Of course. He can put the lanterns down.",
      "stonechild:named": "His name is back. He'll wait less now.",
      "weighed_heart:held": "You held the feather. You were heavier than your hands.",
      "collector:gave": "Three echoes. He'll keep them safe-ish, as promised.",
      "collector:refused": "Good. The jar didn't need them.",
      "composer:heard": "He heard it. Once. That was enough for him.",
      "crowned_one:witnessed": "You saw the paper. He felt lighter for it.",
    };
    const line = map[event];
    if (!line) return null;
    return [
      { who: "Soryn", text: line },
      { who: "Soryn", text: "I am still here. Walk on when you are ready." },
    ];
  }

  private daimonBondLabel(): string {
    // Uniform 4-letter codes so the badge never visually clips.
    if (this.save.flags.daimon_bond_accept) return "✦BIND";
    if (this.save.flags.daimon_bond_question) return "✦QUES";
    if (this.save.flags.daimon_bond_refuse) return "✦REFU";
    if (this.save.flags.daimon_bond_listen) return "✦HEAR";
    return "✦BOND";
  }

  private refreshKnotTracker() {
    if (!this.knotTracker) return;
    this.knotTracker.setText(`KNOTS ${this.totalCleared()}/5`);
  }

  private refreshSoulTracker() {
    if (!this.soulTracker) return;
    const inRegion = this.souls;
    if (inRegion.length === 0) {
      this.soulTracker.setText("");
      return;
    }
    const done = inRegion.filter((s) => isSoulDone(this.save, s.def.id)).length;
    this.soulTracker.setText(`SOULS ${done}/${inRegion.length}`);
  }
}
