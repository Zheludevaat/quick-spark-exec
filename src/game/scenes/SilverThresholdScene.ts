import * as Phaser from "phaser";
import { GBC_W, GBC_H, TILE, COLOR, GBCText, TILE_INDEX, spawnMotes, gbcWipe, drawGBCBox } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan, animateRowan, runDialog, shedAccessory, setRowanSkin } from "./hud";
import { runInquiry, type InquiryOption } from "../inquiry";
import { getAudio, SONG_SILVER } from "../audio";

type ElemKind = "air" | "fire" | "water" | "earth";

const ELEM_TO_ACCESSORY: Record<ElemKind, "scarf" | "coat" | "boots" | "satchel"> = {
  air: "scarf",
  fire: "coat",
  water: "boots",
  earth: "satchel",
};

const ELEM_BURST_COLOR: Record<ElemKind, number> = {
  air: 0xdde6f5, fire: 0xf08868, water: 0x88c0f0, earth: 0xa8c890,
};

// PHASE A — Recognition. Guardian names what element they are *in* Rowan.
const RECOGNITION: Record<ElemKind, { who: string; text: string }[]> = {
  air: [
    { who: "Air", text: "I am Air. Not the wind outside — the breath you held when you should have spoken." },
    { who: "Air", text: "I am every word you swallowed. I am the wave you did not return." },
  ],
  fire: [
    { who: "Fire", text: "I am Fire. Not heat — the courage you spent on small angers and saved from large ones." },
    { who: "Fire", text: "I am the call you let ring. I am the bridges you watched burn from a distance." },
  ],
  water: [
    { who: "Water", text: "I am Water. Not what you drank — what you offered without knowing for whom." },
    { who: "Water", text: "I am every cup poured for someone who would not come." },
  ],
  earth: [
    { who: "Earth", text: "I am Earth. Not the ground — the weight you carried in pockets you forgot to empty." },
    { who: "Earth", text: "I am the keys to doors that are not yours. The receipts. The unsent letters." },
  ],
};

// PHASE B — Offering options. Each option references the seed it consumes (if set).
type OfferingOption = InquiryOption & { consumesSeed?: string };

const OFFERINGS: Record<ElemKind, { prompt: { who: string; text: string }; options: OfferingOption[] }> = {
  air: {
    prompt: { who: "Air", text: "Give me one thing you held back. I will carry it now." },
    options: [
      { choice: "confess", label: "THE CALL",   reply: "You give me Mara's call. I will breathe it for you.", consumesSeed: "seed_call" },
      { choice: "confess", label: "THE WAVE",   reply: "You give me the wave you did not return. The child is grown. I will hold it.", consumesSeed: "seed_window" },
      { choice: "observe", label: "THE SILENCE", reply: "You give me your silences. There were many. I will name each one." },
      { choice: "silent",  label: "NOTHING",    reply: "Then I take your refusal. That is its own offering." },
    ],
  },
  fire: {
    prompt: { who: "Fire", text: "Give me what you would not burn. I will turn it to light." },
    options: [
      { choice: "confess", label: "THE CALL",   reply: "Mara's name. Yes. The fire wanted it most.", consumesSeed: "seed_call" },
      { choice: "confess", label: "THE COAT",   reply: "Your coat by the door. Heavy with intentions. Burn it bright.", consumesSeed: "seed_coat" },
      { choice: "ask",     label: "MY ANGER",   reply: "Give it to me. I have a place for it that does not hurt." },
      { choice: "silent",  label: "MY FEAR",    reply: "Of being seen. Yes. I have known this. Give it." },
    ],
  },
  water: {
    prompt: { who: "Water", text: "Give me what you poured and were not drunk. I will return it to the river." },
    options: [
      { choice: "confess", label: "THE KETTLE", reply: "The second cup. For whom did you pour it? You knew. I will know with you.", consumesSeed: "seed_kettle" },
      { choice: "ask",     label: "THE TEARS",  reply: "The tears you saved for later. Later is here. Give them." },
      { choice: "observe", label: "THE WAITING", reply: "All those evenings of waiting. I will keep them gentle." },
      { choice: "silent",  label: "THE GRIEF",  reply: "Yes. Set it down. The water has held worse, kindly." },
    ],
  },
  earth: {
    prompt: { who: "Earth", text: "Give me what you carried that you could have set down. I will hold it as soil." },
    options: [
      { choice: "confess", label: "THE COAT",     reply: "The coat. Heavy with paper. Heavy with delay. The earth accepts it.", consumesSeed: "seed_coat" },
      { choice: "ask",     label: "THE WAITING",  reply: "The patience you mistook for endurance. Set it down here." },
      { choice: "observe", label: "THE BODY",     reply: "The aches you stopped naming. The mirror knew. Give them.", consumesSeed: "seed_mirror" },
      { choice: "silent",  label: "EVERYTHING",   reply: "Then everything. The earth will take it all. It always has." },
    ],
  },
};

// PHASE C — Naming. Guardian names what Rowan now *is* in their domain.
const NAMING: Record<ElemKind, { who: string; text: string }[]> = {
  air: [
    { who: "Air",   text: "You are no longer the one who breathes. You are the one who listens." },
    { who: "Air",   text: "Carry this. CLARITY +1. The scarf is mine now." },
  ],
  fire: [
    { who: "Fire",  text: "You are no longer the one who burns. You are the one who chooses what is kept warm." },
    { who: "Fire",  text: "Carry this. COURAGE +1. The coat is mine now." },
  ],
  water: [
    { who: "Water", text: "You are no longer the one who pours. You are the one who is poured into." },
    { who: "Water", text: "Carry this. COMPASSION +1. The boots are mine now." },
  ],
  earth: [
    { who: "Earth", text: "You are no longer the one who carries. You are the one who is carried." },
    { who: "Earth", text: "Carry this. CLARITY +1. The satchel is mine now." },
  ],
];

const SORYN_OPENING = [
  { who: "?",     text: "Welcome, Rowan. Take a breath you no longer need." },
  { who: "Soryn", text: "I am Soryn. A friend of the Threshold." },
  { who: "Soryn", text: "Yes — you have died. There is nothing to fix. Only to receive." },
  { who: "Soryn", text: "Four old voices wait at four circles. Walk to each. Stand. Listen." },
  { who: "Soryn", text: "They are not gods. They are the parts of the world that were always inside you, made into voices so you can hear them." },
  { who: "Soryn", text: "They will take what you no longer need. They will tell you what you are. This is reception, not judgment." },
];

const SORYN_AFTER_RITES = [
  { who: "Soryn", text: "It is done. You have been received." },
  { who: "Soryn", text: "What you carried into death, you have set down." },
  { who: "Soryn", text: "What remains is what you are." },
];

const STONE_LINES = [
  { who: "Stone", text: "An old marker. Carved with one word: BEGIN." },
  { who: "Stone", text: "You feel a small warmth in the chest. +1 COURAGE." },
];

const MAP_W = 10, MAP_H = 9;

function buildMap(): number[][] {
  const T = TILE_INDEX;
  const m: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      if (y < 2) row.push(T.SILVER_VOID);
      else if (y === 2) row.push(T.SILVER_EDGE_N);
      else if (y >= 3 && y <= 6) row.push(y === 4 || y === 5 ? T.SILVER_PATH : T.SILVER_FLOOR);
      else row.push(T.SILVER_VOID);
    }
    m.push(row);
  }
  return m;
}

export class SilverThresholdScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private input2!: InputState;
  private dialogActive = false;
  private circles: { kind: ElemKind; sprite: Phaser.GameObjects.Sprite; x: number; y: number; visited: boolean }[] = [];
  private gate!: Phaser.GameObjects.Container;
  private soryn!: Phaser.GameObjects.Sprite;
  private daimonV2?: Phaser.GameObjects.Sprite;
  private hint!: GBCText;
  private stone!: Phaser.GameObjects.Rectangle;

  constructor() { super("SilverThreshold"); }
  init(data: { save: SaveSlot }) {
    this.save = data.save;
    this.circles = [];
    this.dialogActive = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.void);
    this.cameras.main.fadeIn(400);
    getAudio().music.play("silver", SONG_SILVER);

    const map = buildMap();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.add.image(x * TILE, y * TILE, "gbc_tiles", map[y][x]).setOrigin(0, 0);
      }
    }

    spawnMotes(this, { count: 22, color: 0xdde6f5, alpha: 0.55, driftY: -0.012, driftX: 0.003, depth: 30 });
    spawnMotes(this, { count: 8, color: 0xa8c8e8, alpha: 0.35, driftY: -0.006, driftX: -0.004, depth: 30 });

    const placements: { kind: ElemKind; x: number; y: number }[] = [
      { kind: "air",   x: 28,  y: 76 },
      { kind: "fire",  x: 60,  y: 76 },
      { kind: "water", x: 92,  y: 76 },
      { kind: "earth", x: 124, y: 76 },
    ];
    for (const p of placements) {
      const visited = !!this.save.flags[`elem_${p.kind}`];
      const s = this.add.sprite(p.x, p.y, "elements", p.kind === "air" ? 0 : p.kind === "fire" ? 2 : p.kind === "water" ? 4 : 6);
      s.play(`elem_${p.kind}`);
      if (visited) s.setAlpha(0.35);
      this.circles.push({ kind: p.kind, sprite: s, x: p.x, y: p.y, visited });
    }

    // Soryn (legacy v1 humanoid for the opening conversation, before the daimon reveal)
    this.soryn = this.add.sprite(146, 70, "soryn", 0);
    this.soryn.play("soryn_flicker");
    new GBCText(this, 138, 56, "SORYN", { color: COLOR.textAccent });

    // Gate at south
    this.gate = this.add.container(GBC_W / 2, GBC_H - 18);
    const gateImg = this.add.image(0, 0, "gbc_tiles", TILE_INDEX.GATE).setOrigin(0.5);
    gateImg.setAlpha(this.save.flags.elements_done ? 1 : 0.4);
    this.gate.add([gateImg]);
    this.gate.setData("img", gateImg);

    // Hidden lore stone
    const stoneFound = !!this.save.flags.stone_found;
    this.stone = this.add.rectangle(14, 58, 6, 4, stoneFound ? 0x3a4868 : 0x7889a8, 1);
    this.add.rectangle(14, 60, 6, 1, 0x1a2030, 1);
    if (!stoneFound) {
      this.tweens.add({ targets: this.stone, alpha: 0.5, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Player + soft shadow. Skin: living unless all elements done already (resume case).
    this.rowanShadow = this.add.ellipse(16, 76, 10, 3, 0x000000, 0.35).setDepth(2);
    const initialSkin = this.save.flags.daimon_bound ? "soul" : "living";
    this.rowan = makeRowan(this, 16, 70, initialSkin);
    // If resuming, also remove already-shed accessories
    if (initialSkin === "living") {
      (["air", "fire", "water", "earth"] as ElemKind[]).forEach(k => {
        if (this.save.flags[`elem_${k}`]) {
          // remove without animating
          const accs = this.rowan.getData("accessories") as Record<string, Phaser.GameObjects.Sprite> | undefined;
          if (accs && accs[ELEM_TO_ACCESSORY[k]]) { accs[ELEM_TO_ACCESSORY[k]].destroy(); delete accs[ELEM_TO_ACCESSORY[k]]; }
        }
      });
    }

    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);
    this.events.on("vinput-action", () => this.tryInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryInteract());

    this.add.rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(199);
    this.hint = new GBCText(this, 4, GBC_H - 9, "TOUCH THE 4 CIRCLES", { color: COLOR.textDim, depth: 200, scrollFactor: 0 });

    if (!this.save.flags.intro_done) {
      this.dialogActive = true;
      this.time.delayedCall(500, () => {
        runDialog(this, SORYN_OPENING, () => {
          this.save.flags.intro_done = true;
          writeSave(this.save);
          this.dialogActive = false;
        });
      });
    }
  }

  update(_t: number, dt: number) {
    if (this.dialogActive) return;
    const speed = 0.04 * dt;
    const i = this.input2.poll();
    let dx = 0, dy = 0;
    if (i.left)  dx -= speed;
    if (i.right) dx += speed;
    if (i.up)    dy -= speed;
    if (i.down)  dy += speed;
    this.rowan.x += dx;
    this.rowan.y += dy;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 8, GBC_W - 8);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 50, GBC_H - 14);
    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    const visited = this.circles.filter(c => c.visited).length;
    const sdx = this.rowan.x - this.soryn.x, sdy = this.rowan.y - this.soryn.y;
    const gdx = this.rowan.x - this.gate.x, gdy = this.rowan.y - this.gate.y;
    const stx = this.rowan.x - this.stone.x, sty = this.rowan.y - this.stone.y;
    if (sdx * sdx + sdy * sdy < 14 * 14) this.hint.setText("A: TALK TO SORYN");
    else if (gdx * gdx + gdy * gdy < 16 * 16) this.hint.setText(this.save.flags.daimon_bound ? "A: ENTER THE GATE" : `GATE SEALED  ${visited}/4 CIRCLES`);
    else if (stx * stx + sty * sty < 12 * 12 && !this.save.flags.stone_found) this.hint.setText("A: INSPECT STONE");
    else this.hint.setText(this.save.flags.daimon_bound ? "WALK TO THE GATE (SOUTH)" : `TOUCH THE CIRCLES  ${visited}/4`);

    // Auto-trigger guardian encounter on touch
    for (const c of this.circles) {
      if (c.visited) continue;
      const ddx = this.rowan.x - c.x, ddy = this.rowan.y - c.y;
      if (ddx * ddx + ddy * ddy < 10 * 10) {
        this.dialogActive = true;
        this.runGuardianEncounter(c);
        return;
      }
    }
  }

  // ============================================================================
  // 3-PHASE GUARDIAN ENCOUNTER
  // ============================================================================
  private runGuardianEncounter(c: { kind: ElemKind; sprite: Phaser.GameObjects.Sprite; x: number; y: number; visited: boolean }) {
    const kind = c.kind;
    getAudio().sfx("resolve");
    const burstColor = ELEM_BURST_COLOR[kind];
    const ring = this.add.circle(c.x, c.y, 4, burstColor, 0.6).setDepth(40);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 600, ease: "Sine.out", onComplete: () => ring.destroy() });

    // PHASE A — RECOGNITION
    runDialog(this, RECOGNITION[kind], () => {
      // PHASE B — OFFERING (Inquiry Wheel)
      const offering = OFFERINGS[kind];
      runInquiry(this, offering.prompt, offering.options, (picked) => {
        const opt = picked as OfferingOption;
        // Consume seed if applicable
        if (opt.consumesSeed && this.save.seeds[opt.consumesSeed]) {
          this.save.flags[`ack_${opt.consumesSeed}`] = true;
        }
        // Stat bias from inquiry choice
        if (picked.choice === "confess") this.bumpStatForElement(kind, 2);
        else if (picked.choice === "observe") this.save.stats.clarity += 1;
        else if (picked.choice === "ask")     this.save.stats.compassion += 1;
        else if (picked.choice === "silent")  this.save.stats.courage += 1;

        // PHASE C MINI-MECHANIC — short interactive moment per element
        this.runMiniMechanic(kind, c, () => {
          // Then the NAMING dialog + skin shed + stat bump + shard fragment
          runDialog(this, NAMING[kind], () => {
            this.bumpStatForElement(kind, 1);
            // Shed the corresponding accessory
            shedAccessory(this, this.rowan, ELEM_TO_ACCESSORY[kind]);
            // Mark visited
            c.visited = true;
            this.save.flags[`elem_${kind}`] = true;
            c.sprite.setAlpha(0.35);
            // Memory shard fragment (4 = 1 shard)
            this.save.shardFragments = (this.save.shardFragments ?? 0) + 1;
            if (this.save.shardFragments >= 4) {
              this.save.shardFragments -= 4;
              if (!this.save.shards.includes("threshold_1")) this.save.shards.push("threshold_1");
              this.flashShardCollected();
            }
            this.events.emit("stats-changed");
            writeSave(this.save);
            this.cameras.main.flash(120, 240, 240, 255);
            this.dialogActive = false;
            this.checkAllElements();
          });
        });
      });
    });
  }

  private bumpStatForElement(kind: ElemKind, n: number) {
    if (kind === "air")   this.save.stats.clarity += n;
    if (kind === "fire")  this.save.stats.courage += n;
    if (kind === "water") this.save.stats.compassion += n;
    if (kind === "earth") this.save.stats.clarity += n;
  }

  private flashShardCollected() {
    const t = new GBCText(this, this.rowan.x - 28, this.rowan.y - 18, "MEMORY SHARD +1", { color: COLOR.textGold, depth: 220 });
    this.tweens.add({ targets: t.obj, alpha: 0, y: this.rowan.y - 32, duration: 1600, onComplete: () => t.destroy() });
  }

  // ============================================================================
  // PHASE C — Per-element mini-mechanics. All resolve to onDone() with no fail.
  // ============================================================================
  private runMiniMechanic(kind: ElemKind, c: { x: number; y: number }, onDone: () => void) {
    if (kind === "air")   return this.miniAir(c, onDone);
    if (kind === "fire")  return this.miniFire(c, onDone);
    if (kind === "water") return this.miniWater(c, onDone);
    if (kind === "earth") return this.miniEarth(c, onDone);
    onDone();
  }

  /** AIR — 3 breath pulses; press A on each pulse (visual cue only, no fail). */
  private miniAir(c: { x: number; y: number }, onDone: () => void) {
    const box = drawGBCBox(this, 4, GBC_H - 32, GBC_W - 8, 28, 250);
    const label = new GBCText(this, 8, GBC_H - 28, "BREATHE WITH ME (A x3)", { color: COLOR.textAccent, depth: 251 });
    const pulse = this.add.circle(c.x, c.y, 6, 0xdde6f5, 0.4).setDepth(40);
    let count = 0;
    let pulsing = false;
    const step = () => {
      pulsing = true;
      this.tweens.add({
        targets: pulse, scale: 2.5, alpha: 0.1, duration: 1100, ease: "Sine.inOut", yoyo: true,
        onComplete: () => { pulsing = false; },
      });
    };
    step();
    const handler = () => {
      if (!pulsing) return;
      count++;
      getAudio().sfx("confirm");
      label.setText(`BREATHE WITH ME (${count}/3)`);
      if (count >= 3) {
        cleanup();
        return;
      }
      this.time.delayedCall(300, step);
    };
    const cleanup = () => {
      this.input.keyboard?.off("keydown-SPACE", handler);
      this.input.keyboard?.off("keydown-ENTER", handler);
      this.events.off("vinput-action", handler);
      box.destroy(); label.destroy(); pulse.destroy();
      onDone();
    };
    this.input.keyboard?.on("keydown-SPACE", handler);
    this.input.keyboard?.on("keydown-ENTER", handler);
    this.events.on("vinput-action", handler);
  }

  /** FIRE — hold A while a heat bar rises; release at peak. (Auto-resolve after 2.5s.) */
  private miniFire(c: { x: number; y: number }, onDone: () => void) {
    const box = drawGBCBox(this, 4, GBC_H - 32, GBC_W - 8, 28, 250);
    const label = new GBCText(this, 8, GBC_H - 28, "HOLD A. RELEASE WHEN BRIGHT.", { color: COLOR.textAccent, depth: 251 });
    const barBg = this.add.rectangle(20, GBC_H - 14, GBC_W - 40, 4, 0x2a1810, 1).setOrigin(0, 0.5).setDepth(251);
    const bar   = this.add.rectangle(20, GBC_H - 14, 1, 4, 0xf08868, 1).setOrigin(0, 0.5).setDepth(252);
    const flame = this.add.circle(c.x, c.y, 4, 0xf08868, 0.6).setDepth(40);
    let progress = 0;
    let held = false;
    const tick = this.time.addEvent({
      delay: 30, loop: true, callback: () => {
        if (held) progress = Math.min(1, progress + 0.018);
        bar.width = (GBC_W - 40) * progress;
        flame.setScale(0.5 + progress * 1.8);
        flame.fillColor = progress > 0.85 ? 0xffe098 : 0xf08868;
        if (progress >= 1 && held) finish();
      },
    });
    const press = () => { held = true; };
    const release = () => { if (held && progress >= 0.4) finish(); held = false; };
    const finish = () => {
      tick.remove(false);
      this.input.keyboard?.off("keydown-SPACE", press);
      this.input.keyboard?.off("keyup-SPACE", release);
      this.input.keyboard?.off("keydown-ENTER", press);
      this.input.keyboard?.off("keyup-ENTER", release);
      this.events.off("vinput-action", press);
      box.destroy(); label.destroy(); barBg.destroy(); bar.destroy(); flame.destroy();
      getAudio().sfx("resolve");
      onDone();
    };
    this.input.keyboard?.on("keydown-SPACE", press);
    this.input.keyboard?.on("keyup-SPACE", release);
    this.input.keyboard?.on("keydown-ENTER", press);
    this.input.keyboard?.on("keyup-ENTER", release);
    // For touch: vinput-action triggers a brief auto-hold
    this.events.on("vinput-action", () => { held = true; this.time.delayedCall(1800, () => { held = false; if (progress >= 0.4) finish(); }); });
    // Safety auto-finish after 6s
    this.time.delayedCall(6000, () => { if (tick && !tick.hasDispatched) { progress = 1; held = true; finish(); } });
  }

  /** WATER — Rowan's reflection appears below the circle. Pick which to keep. */
  private miniWater(c: { x: number; y: number }, onDone: () => void) {
    // Two reflections to choose from.
    const refTrue = this.add.sprite(c.x - 10, c.y + 18, "rowan", 0).setOrigin(0.5, 0.7).setAlpha(0.55).setScale(1, -1);
    refTrue.setTint(0x88c0f0);
    const refMask = this.add.sprite(c.x + 10, c.y + 18, "rowan", 0).setOrigin(0.5, 0.7).setAlpha(0.55).setScale(1, -1);
    refMask.setTint(0xd8a868);
    const labelL = new GBCText(this, c.x - 18, c.y + 28, "TRUE",  { color: COLOR.textLight, depth: 251 });
    const labelR = new GBCText(this, c.x + 4,  c.y + 28, "BRIGHT", { color: COLOR.textLight, depth: 251 });
    const box = drawGBCBox(this, 4, GBC_H - 26, GBC_W - 8, 22, 250);
    const prompt = new GBCText(this, 8, GBC_H - 22, "WHICH REFLECTION DO YOU KEEP?", { color: COLOR.textAccent, depth: 251 });
    let cursor = 0;
    const refresh = () => {
      labelL.setColor(cursor === 0 ? COLOR.textGold : COLOR.textLight);
      labelR.setColor(cursor === 1 ? COLOR.textGold : COLOR.textLight);
    };
    refresh();
    const move = (d: number) => { cursor = (cursor + d + 2) % 2; getAudio().sfx("cursor"); refresh(); };
    const pick = () => {
      cleanup();
      // Either choice resolves; "TRUE" gives a small clarity bonus, "BRIGHT" gives compassion.
      if (cursor === 0) this.save.stats.clarity += 1;
      else this.save.stats.compassion += 1;
      this.events.emit("stats-changed");
      onDone();
    };
    const cleanup = () => {
      this.input.keyboard?.off("keydown-LEFT", left);
      this.input.keyboard?.off("keydown-RIGHT", right);
      this.input.keyboard?.off("keydown-SPACE", pick);
      this.input.keyboard?.off("keydown-ENTER", pick);
      this.events.off("vinput-action", pick);
      this.events.off("vinput-down", vmove);
      refTrue.destroy(); refMask.destroy(); labelL.destroy(); labelR.destroy(); box.destroy(); prompt.destroy();
    };
    const left = () => move(-1);
    const right = () => move(1);
    const vmove = (dir: string) => { if (dir === "left") move(-1); if (dir === "right") move(1); };
    this.input.keyboard?.on("keydown-LEFT", left);
    this.input.keyboard?.on("keydown-RIGHT", right);
    this.input.keyboard?.on("keydown-SPACE", pick);
    this.input.keyboard?.on("keydown-ENTER", pick);
    this.events.on("vinput-action", pick);
    this.events.on("vinput-down", vmove);
  }

  /** EARTH — auto-walk Rowan in a slow spiral around the circle. Player just watches. */
  private miniEarth(c: { x: number; y: number }, onDone: () => void) {
    const box = drawGBCBox(this, 4, GBC_H - 26, GBC_W - 8, 22, 250);
    const prompt = new GBCText(this, 8, GBC_H - 22, "WALK THE CIRCLE.", { color: COLOR.textAccent, depth: 251 });
    const startX = this.rowan.x, startY = this.rowan.y;
    let angle = 0;
    const radius = 14;
    const tick = this.time.addEvent({
      delay: 30, loop: true, callback: () => {
        angle += 0.05;
        this.rowan.x = c.x + Math.cos(angle) * radius;
        this.rowan.y = c.y + Math.sin(angle) * radius;
        animateRowan(this.rowan, Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2));
        if (angle >= Math.PI * 2.2) {
          tick.remove(false);
          this.rowan.x = startX; this.rowan.y = startY;
          box.destroy(); prompt.destroy();
          onDone();
        }
      },
    });
  }

  // ============================================================================
  // After all 4 guardians: transformation pause + extended Soryn binding
  // ============================================================================
  private checkAllElements() {
    const all = this.circles.every(c => c.visited);
    if (all && !this.save.flags.elements_done) {
      this.save.flags.elements_done = true;
      writeSave(this.save);
      this.dialogActive = true;
      this.time.delayedCall(700, () => this.runTransformation());
    }
  }

  private runTransformation() {
    // Dim screen, orbit ghosts of the 4 shed items around Rowan, then white flash.
    const dim = this.add.rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0).setOrigin(0, 0).setDepth(180);
    this.tweens.add({ targets: dim, alpha: 0.6, duration: 600 });
    const cx = this.rowan.x, cy = this.rowan.y - 4;
    const ghosts: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
      const g = this.add.sprite(cx, cy, "rowan_acc", i).setOrigin(0.5, 0.5).setDepth(190).setAlpha(0.7);
      ghosts.push(g);
    }
    let t = 0;
    const orbit = this.time.addEvent({
      delay: 30, loop: true, callback: () => {
        t += 0.05;
        ghosts.forEach((g, i) => {
          const a = t + (i / 4) * Math.PI * 2;
          g.x = cx + Math.cos(a) * 16;
          g.y = cy + Math.sin(a) * 10;
          g.alpha = 0.4 + Math.sin(a + t) * 0.3;
        });
      },
    });
    this.time.delayedCall(2400, () => {
      orbit.remove(false);
      ghosts.forEach(g => this.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 400, onComplete: () => g.destroy() }));
      this.cameras.main.flash(800, 255, 255, 255);
      this.time.delayedCall(400, () => {
        // Apply soul skin
        setRowanSkin(this.rowan, "soul");
        this.tweens.add({ targets: dim, alpha: 0, duration: 800, onComplete: () => dim.destroy() });
        // Show after-rites Soryn dialog, then begin daimon binding
        runDialog(this, SORYN_AFTER_RITES, () => this.runDaimonBinding());
      });
    });
  }

  private runDaimonBinding() {
    // Soryn approaches. Then transforms into the v2 glyph-being.
    const beats1 = [
      { who: "Soryn", text: "You have been received. Now you must be accompanied." },
      { who: "Soryn", text: "I am a daimon. Not a guide. Not a god." },
      { who: "Soryn", text: "I am a piece of the world that chose you the moment you were named." },
      { who: "Soryn", text: "I have walked beside you your whole life." },
      { who: "Soryn", text: "You called me intuition. You called me dread." },
      { who: "Soryn", text: "You called me the feeling of being watched in an empty room." },
      { who: "Soryn", text: "I was always me. Now look at me as I am." },
    ];
    runDialog(this, beats1, () => {
      // Transform Soryn humanoid → glyph-being
      this.tweens.add({
        targets: this.soryn, alpha: 0, duration: 700, onComplete: () => {
          this.soryn.destroy();
          this.daimonV2 = this.add.sprite(146, 70, "soryn_v2", 0).setOrigin(0.5, 0.5);
          if (this.anims.exists("daimon_idle")) this.daimonV2.play("daimon_idle");
          this.daimonV2.setAlpha(0);
          this.tweens.add({ targets: this.daimonV2, alpha: 1, duration: 800, onComplete: () => this.daimonChoice() });
        },
      });
    });
  }

  private daimonChoice() {
    runInquiry(
      this,
      { who: "Soryn", text: "Will you accept me as your daimon?" },
      [
        { choice: "confess", label: "ACCEPT",   reply: "Then we are bound. I will be a half-step behind you." },
        { choice: "ask",     label: "QUESTION", reply: "You may always question me. The bond holds." },
        { choice: "observe", label: "REFUSE",   reply: "Refusal binds tighter than yes. I will know it. I will stay." },
        { choice: "silent",  label: "LISTEN",   reply: "You listen. That is the deepest yes there is." },
      ],
      (picked) => {
        this.save.flags[`daimon_bond_${picked.label.toLowerCase()}`] = true;
        writeSave(this.save);
        // Binding animation: rings expand around Rowan
        const ring1 = this.add.circle(this.rowan.x, this.rowan.y - 4, 4, 0x88c0e8, 0.6).setDepth(40);
        const ring2 = this.add.circle(this.rowan.x, this.rowan.y - 4, 4, 0xdde6f5, 0.4).setDepth(40);
        this.tweens.add({ targets: ring1, scale: 8, alpha: 0, duration: 1100, ease: "Sine.out", onComplete: () => ring1.destroy() });
        this.tweens.add({ targets: ring2, scale: 6, alpha: 0, duration: 900, delay: 200, ease: "Sine.out", onComplete: () => ring2.destroy() });
        this.cameras.main.flash(400, 200, 220, 255);
        getAudio().sfx("open");
        this.time.delayedCall(1200, () => {
          runDialog(this, [
            { who: "Soryn", text: "Bound. Until you no longer need me — and I will know before you do." },
            { who: "Soryn", text: "I cannot enter the inner places. At plateaus and sphere tests, you walk alone." },
            { who: "Soryn", text: "Everywhere else, I am a half-step behind you." },
            { who: "Soryn", text: "Beyond the gate lies the Imaginal Realm. Walk south when you are ready." },
          ], () => {
            this.save.flags.daimon_bound = true;
            (this.gate.getData("img") as Phaser.GameObjects.Image).setAlpha(1);
            this.tweens.add({ targets: this.gate, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
            writeSave(this.save);
            this.dialogActive = false;
          });
        });
      },
    );
  }

  private tryInteract() {
    if (this.dialogActive) return;
    const stx = this.rowan.x - this.stone.x, sty = this.rowan.y - this.stone.y;
    if (stx * stx + sty * sty < 12 * 12 && !this.save.flags.stone_found) {
      this.dialogActive = true;
      this.save.flags.stone_found = true;
      this.save.stats.courage++;
      this.events.emit("stats-changed");
      writeSave(this.save);
      this.stone.setFillStyle(0x3a4868);
      getAudio().sfx("resolve");
      runDialog(this, STONE_LINES, () => { this.dialogActive = false; });
      return;
    }
    // Soryn / daimon talk
    const sorynObj = this.daimonV2 ?? this.soryn;
    const sdx = this.rowan.x - sorynObj.x, sdy = this.rowan.y - sorynObj.y;
    if (sdx * sdx + sdy * sdy < 14 * 14) {
      this.dialogActive = true;
      getAudio().sfx("confirm");
      const lines = this.save.flags.daimon_bound
        ? [
          { who: "Soryn", text: "The gate listens. Step into it when you can." },
          { who: "Soryn", text: "Whatever you bring, you will not bring alone." },
        ]
        : [
          { who: "Soryn", text: "The threshold likes wanderers. Take your time." },
          { who: "Soryn", text: "When you are ready, walk to each circle." },
        ];
      runDialog(this, lines, () => { this.dialogActive = false; });
      return;
    }
    // Gate enter
    const gx = this.rowan.x - this.gate.x, gy = this.rowan.y - this.gate.y;
    if (gx * gx + gy * gy < 16 * 16 && this.save.flags.daimon_bound) {
      this.save.scene = "ImaginalRealm";
      writeSave(this.save);
      const a = getAudio(); a.sfx("wipe"); a.music.stop();
      gbcWipe(this, () => this.scene.start("ImaginalRealm", { save: this.save }));
    }
  }
}
