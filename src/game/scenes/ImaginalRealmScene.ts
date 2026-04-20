import * as Phaser from "phaser";
import { GBC_W, GBC_H, TILE, COLOR, GBCText, TILE_INDEX, gbcWipe, spawnMotes } from "../gbcArt";
import { writeSave } from "../save";
import type { ImaginalRegion, SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog } from "./hud";
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
import { activateQuest, completeQuest, questStatus } from "../sideQuests";
import { soulsForRegion, type SoulDef } from "./imaginal/souls";
import { buildSoulSprite } from "./imaginal/soulSprites";
import { runSoul, isSoulDone } from "./imaginal/soulRunner";
import { getArc } from "./imaginal/soulArcs";

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
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      if (y === 0) row.push(T.MOON_WALL);
      else if (x === 0 || x === MAP_W - 1) row.push(T.MOON_WALL);
      else if (y === MAP_H - 1 && region === "corridor") row.push(T.MOON_WALL);
      // Pillars
      else if (region === "pools" && y === 3 && (x === 2 || x === 7)) row.push(T.MOON_PILLAR);
      else if (region === "field" && y === 4 && (x === 1 || x === 8)) row.push(T.MOON_PILLAR);
      else if (region === "corridor" && (x === 2 || x === 7) && (y === 3 || y === 6))
        row.push(T.MOON_PILLAR);
      else if ((x + y) % 2 === 0) row.push(T.MOON_FLOOR);
      else row.push(T.MOON_FLOOR_REFLECT);
    }
    m.push(row);
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
  private souls: {
    def: SoulDef;
    container: Phaser.GameObjects.Container;
    halo: Phaser.GameObjects.Arc;
    setMood: (m: "waiting" | "engaged" | "resolved") => void;
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
    this.refreshKnotTracker();

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
      s.container.destroy();
      s.halo.destroy();
      s.nameLabel?.destroy();
      s.hookLabel?.destroy();
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

    // Spawn souls for this region (skip those already finished — keep the world
    // feeling alive but uncluttered; finished souls return as faint statues).
    for (const def of soulsForRegion(this.save, region)) {
      const built = buildSoulSprite(this, def.archetype, def.x, def.y);
      const done = isSoulDone(this.save, def.id);
      built.setMood(done ? "resolved" : "waiting");
      this.regionRoot.add(built.container);
      this.regionRoot.add(built.halo);
      this.souls.push({
        def,
        container: built.container,
        halo: built.halo,
        setMood: built.setMood,
        nearTime: 0,
        barkShown: false,
      });
    }
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

    // Seed-echo touch
    for (const m of this.seedEchoes) {
      if (m.touched) continue;
      const sdx = this.rowan.x - m.x,
        sdy = this.rowan.y - m.y;
      if (sdx * sdx + sdy * sdy < 7 * 7) this.touchSeedEcho(m);
    }

    // Edge transitions
    if (this.region === "pools" && this.rowan.y > GBC_H - 20 && this.allowExit("pools"))
      this.transitionTo("field");
    else if (this.region === "field" && this.rowan.y > GBC_H - 20 && this.allowExit("field"))
      this.transitionTo("corridor");
    else if (this.region === "field" && this.rowan.y < 24) this.transitionTo("pools");
    else if (this.region === "corridor" && this.rowan.y < 24) this.transitionTo("field");

    // Soul proximity: pulse halo, show name/hook, accumulate ambient bark timer.
    const nearSoul = this.nearestSoul();
    for (const s of this.souls) {
      const isNear = s === nearSoul;
      const done = isSoulDone(this.save, s.def.id);
      s.halo.fillAlpha = isNear ? (done ? 0.15 : 0.3) : 0;
      if (isNear) {
        s.setMood(done ? "resolved" : "engaged");
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
        // After 2.4s near without interacting, drift a one-shot ambient thought.
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
        s.setMood(done ? "resolved" : "waiting");
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
        this.save.scene = "CuratedSelf";
        writeSave(this.save);
        const a = getAudio();
        a.sfx("boss");
        a.music.stop();
        if (this.companion) this.companion.setVisible(false);
        gbcWipe(this, () => this.scene.start("CuratedSelf", { save: this.save }));
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
        if (isSoulDone(this.save, soul.def.id)) soul.container.setAlpha(0.45);
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
      if (r.stats?.clarity) this.save.stats.clarity += r.stats.clarity;
      if (r.stats?.compassion) this.save.stats.compassion += r.stats.compassion;
      if (r.stats?.courage) this.save.stats.courage += r.stats.courage;
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
}
