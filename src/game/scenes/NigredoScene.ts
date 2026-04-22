/**
 * 2.1 — NIGREDO. The Blackening.
 *
 * Three named shades rise — the Mother-Who-Did-Her-Best, the Self-Who-Said-
 * Yes, and the Inquisitor — and challenge Rowan with the worst version of
 * a memory. Sitting with each shade earns a black stone. Fleeing loses
 * clarity. A "destroyed" outcome (cruelty / over-confession) wastes the
 * shard and registers the salvage_a_shard quest.
 *
 * The selection picker still asks for 3 shards (one is dissolved per
 * shade); shadesEncountered records the outcome so later scenes can read it.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot, ShardId } from "../types";
import { attachHUD, runDialog, makeRowan, animateRowan, InputState } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { selectShards, returnToThreshold } from "../athanor/operationScene";
import { awardNamedStone, markOperationDone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { shardName } from "../athanor/shards";
import { SHADES, pickShades } from "../athanor/shades";
import { activateQuest } from "../sideQuests";
import { onActionDown } from "../controls";

const OPENING = [
  { who: "SORYN", text: "The furnace is cold until you feed it." },
  { who: "SORYN", text: "Three shards. Three ghosts. Sit with each." },
];

const OPENING_RUSHED = [
  { who: "SORYN", text: "Few shards. The fire will work with what you bring." },
];

/** Faint accusatory wall whispers heard while idle, before the work begins
 *  and between shades. Atmospheric only — no save effect. */
const WALL_WHISPERS = [
  "you knew. you always knew.",
  "i waited for you.",
  "say it. just once.",
  "she did her best.",
  "the door was open.",
  "name us properly.",
];

export class NigredoScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private destroyedAny = false;

  // --- Interactive spatial-pacing state ---
  private rowan!: Phaser.GameObjects.Container;
  private rowanShadow!: Phaser.GameObjects.Ellipse;
  private inputState!: InputState;
  private isBusy = false;
  private isDone = false;
  private hintText!: GBCText;
  // --- Furnace progression state ---
  private furnaceHalo!: Phaser.GameObjects.Ellipse;
  private progressText!: GBCText;
  private currentSat = 0;
  private ambientWhisperEvent?: Phaser.Time.TimerEvent;
  private activeWhisper?: GBCText;

  constructor() {
    super("Nigredo");
  }

  init(d: { save: SaveSlot }) {
    this.save = d.save;
    this.save.scene = "Nigredo";
    writeSave(this.save);

    this.destroyedAny = false;
    this.currentSat = 0;
    this.isBusy = false;
    this.isDone = false;
    this.activeWhisper = undefined;
    this.ambientWhisperEvent?.remove(false);
    this.ambientWhisperEvent = undefined;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0608");
    spawnMotes(this, { count: 14, color: 0x402030, alpha: 0.5 });
    attachHUD(this, () => this.save.stats);
    this.vesselHud = mountVesselHud(this, this.save);

    // 1. Environment: Weeping Walls & Flooded Floor
    const waterY = GBC_H - 45;

    const walls = this.add.graphics();
    for(let i=0; i<15; i++) {
      walls.fillStyle(0x1a0f14, Phaser.Math.FloatBetween(0.2, 0.5));
      walls.fillRect(Phaser.Math.Between(0, GBC_W), 0, Phaser.Math.Between(1, 3), Phaser.Math.Between(20, waterY));
    }

    this.add.rectangle(0, waterY, GBC_W, GBC_H - waterY, 0x0a0608).setOrigin(0, 0).setDepth(1);
    this.add.rectangle(0, waterY, GBC_W, 1, 0x2a1a20).setOrigin(0, 0).setDepth(1);

    // 2. The Furnace Structure
    const cx = GBC_W / 2;
    const cy = GBC_H / 2 - 5;

    // Furnace halo: a soft glow under the furnace whose color/scale shifts
    // with the player's choices in applyFurnaceState().
    this.furnaceHalo = this.add
      .ellipse(cx, cy + 12, 56, 18, 0xff4400, 0.35)
      .setDepth(1)
      .setBlendMode("ADD");

    this.add.rectangle(cx, cy + 16, 60, 10, 0x1c1014).setStrokeStyle(1, 0x2a1a1a).setDepth(2);
    this.add.rectangle(cx, cy, 40, 32, 0x11080a).setStrokeStyle(1, 0x2a1a1a).setDepth(2);
    this.add.rectangle(cx, cy + 4, 24, 20, 0x000000).setDepth(3);

    // 3. Fire & Embers (Particle System)
    if (!this.textures.exists('pixel')) {
      const gr = this.make.graphics({x:0, y:0});
      gr.fillStyle(0xffffff, 1);
      gr.fillRect(0, 0, 2, 2);
      gr.generateTexture('pixel', 2, 2);
      gr.destroy();
    }

    this.add.particles(cx, cy + 10, 'pixel', {
      speed: { min: 5, max: 15 },
      angle: { min: 250, max: 290 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [ 0xffcc00, 0xff6600, 0xcc0000 ],
      blendMode: 'ADD',
      lifespan: { min: 400, max: 800 },
      frequency: 40,
      bounds: { x: cx - 10, y: cy - 10, w: 20, h: 20 }
    }).setDepth(4);

    this.add.particles(cx, cy + 5, 'pixel', {
      speed: { min: 10, max: 25 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 1, end: 0 },
      tint: 0xff4400,
      lifespan: { min: 800, max: 1500 },
      frequency: 150,
      gravityY: -10
    }).setDepth(4);

    // 4. Flooded Water Reflection
    const refY = waterY + 2;

    const mouthReflect = this.add.rectangle(cx, refY + 4, 24, 16, 0x000000, 0.4).setDepth(2);

    const flameReflect = this.add.particles(cx, refY, 'pixel', {
      speed: { min: 2, max: 8 },
      angle: { min: 70, max: 110 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.35, end: 0 },
      tint: [ 0xffcc00, 0xff6600 ],
      blendMode: 'ADD',
      lifespan: 600,
      frequency: 60
    }).setDepth(3);

    this.tweens.add({
      targets: [mouthReflect, flameReflect],
      x: cx + 2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    for(let i=0; i<3; i++) {
      const ripple = this.add.rectangle(cx, refY + 8 + (i*6), 16 + (i*4), 1, 0xff6600, 0.15).setDepth(3);
      this.tweens.add({
        targets: ripple,
        alpha: 0.05,
        scaleX: 1.2,
        duration: 1000 + (i*200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }

    new GBCText(this, cx - 14, cy + 15, "FURNACE", {
      color: COLOR.textWarn,
      depth: 5,
    });

    // Subtle SAT x/3 progress indicator at the top-right.
    this.progressText = new GBCText(this, GBC_W - 32, 4, "SAT 0/3", {
      color: COLOR.textDim,
      depth: 100,
    });

    // Initial unstable furnace state — fire is hungry until fed.
    this.applyFurnaceState();
    this.startAmbientWhispers();

    // --- INTERACTIVE UPGRADE: spatial pacing ---

    // 1. Spawn Player at the bottom of the room
    this.rowanShadow = this.add
      .ellipse(GBC_W / 2, GBC_H - 24, 10, 3, 0x000000, 0.4)
      .setDepth(9);
    this.rowan = makeRowan(this, GBC_W / 2, GBC_H - 26, "soul").setDepth(10);
    this.inputState = new InputState(this);

    // 2. Interaction hint banner
    this.add
      .rectangle(0, GBC_H - 11, GBC_W, 11, 0x0a0e1a, 0.85)
      .setOrigin(0, 0)
      .setDepth(199);
    this.hintText = new GBCText(this, 4, GBC_H - 9, "WALK", {
      color: COLOR.textDim,
      depth: 200,
    });

    // 3. Delay opening dialog so the player can absorb the room first.
    this.isBusy = true;
    this.time.delayedCall(800, () => {
      const opening = this.save.shardInventory.length < 3 ? OPENING_RUSHED : OPENING;
      runDialog(this, opening, () => {
        this.isBusy = false;
      });
    });

    // 4. Bind interaction
    onActionDown(this, "action", () => this.tryInteract());
    this.events.on("vinput-action", () => this.tryInteract());
  }

  private beginDissolving() {
    selectShards(this, this.save, "DISSOLVE WHICH 3?", 3, (picked) => {
      const shadeIds = pickShades(this.save, Math.max(1, picked.length));
      this.runShade(picked, shadeIds, 0, 0);
    });
  }

  private runShade(picked: ShardId[], shadeIds: string[], i: number, sat: number) {
    if (i >= picked.length || i >= shadeIds.length) return this.finish(sat);
    const id = picked[i];
    const shade = SHADES[shadeIds[i]];
    if (!shade) return this.finish(sat);

    // --- ART UPGRADE: Towering UI-Intrusive Shade Silhouette ---
    // Spawns above HUD depth (200) so it bleeds visually over the UI.
    const shadeVisual = this.add
      .polygon(GBC_W / 2, GBC_H + 20, [0, 0, 40, -100, 60, -120, 80, -100, 120, 0], 0x000000)
      .setOrigin(0.5, 1)
      .setDepth(250)
      .setAlpha(0);

    // Creeping rise
    this.tweens.add({
      targets: shadeVisual,
      y: GBC_H - 10,
      alpha: 0.95,
      duration: 2000,
      ease: "Sine.out",
    });
    // Ethereal distortion
    this.tweens.add({
      targets: shadeVisual,
      scaleX: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // --- END ART UPGRADE ---

    runDialog(this, shade.opening, () => {
      const opts = shade.options(this.save);
      runInquiry(
        this,
        shade.prompt,
        opts.map((o) => ({
          choice:
            o.outcome === "sat_with"
              ? "observe"
              : o.outcome === "destroyed"
                ? "confess"
                : "silent",
          label: o.label,
          reply: o.reply,
        })),
        (picked2) => {
          // Resolve outcome by matching label back to options.
          const chosen = opts.find((o) => o.label === picked2.label) ?? opts[0];
          this.save.shadesEncountered[id] = chosen.outcome;
          if (chosen.outcome === "sat_with") {
            this.currentSat += 1;
            this.applyFurnaceState("sat_with");
            awardNamedStone(this, this.save, "black", `sat with ${shade.name}`);
            const bene = shade.benediction?.(this.save);
            const tail = bene
              ? [{ who: shade.name, text: bene }]
              : [];
            this.vesselHud.refresh();
            if (tail.length > 0) {
              runDialog(this, tail, () => {
                shadeVisual.destroy();
                this.runShade(picked, shadeIds, i + 1, sat + 1);
              });
            } else {
              shadeVisual.destroy();
              this.runShade(picked, shadeIds, i + 1, sat + 1);
            }
            return;
          }
          if (chosen.outcome === "destroyed") {
            this.destroyedAny = true;
            // Wasted shard — note the loss for salvage.
            this.save.flags.act2_shard_destroyed = true;
            activateQuest(this, this.save, "salvage_a_shard");
            this.applyFurnaceState("destroyed");
          } else {
            this.save.stats.clarity = Math.max(0, this.save.stats.clarity - 1);
            this.applyFurnaceState("fled");
          }
          writeSave(this.save);
          this.vesselHud.refresh();
          shadeVisual.destroy();
          this.runShade(picked, shadeIds, i + 1, sat);
        },
      );
    });
  }

  private finish(sat: number) {
    if (!this.save.flags.op_nigredo_done) {
      markOperationDone(this.save, "op_nigredo_done");
    }
    if (sat >= 2) {
      unlockLore(this.save, "on_nigredo");
      showLoreToast(this, "on_nigredo");
    }
    if (this.save.shadesEncountered["inquisitor"] === "sat_with") {
      unlockLore(this.save, "on_the_inquisitor");
    }
    const closing: { who: string; text: string }[] = [];
    if (this.destroyedAny) {
      closing.push({ who: "SORYN", text: "Something burned through. The water may keep it." });
    } else {
      closing.push({ who: "SORYN", text: "Black sediment, settling. Good." });
    }
    runDialog(this, closing, () => {
      this.isDone = true;
      this.isBusy = false;
    });
  }

  update(_time: number, delta: number) {
    if (this.isBusy) return;

    // Movement (slower than usual to simulate wading through water)
    const speed = 0.025 * delta;
    const i = this.inputState.poll();
    let dx = 0;
    let dy = 0;
    if (i.left) dx -= speed;
    if (i.right) dx += speed;
    if (i.up) dy -= speed;
    if (i.down) dy += speed;

    this.rowan.x += dx;
    this.rowan.y += dy;

    // Clamp to the flooded floor area
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 20, GBC_W - 20);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, GBC_H / 2 + 10, GBC_H - 10);

    animateRowan(this.rowan, dx, dy);
    this.rowanShadow.setPosition(this.rowan.x, this.rowan.y + 6);

    if (this.isDone) {
      this.hintText.setText("THE FIRE IS DONE. WALK SOUTH.");
      this.hintText.setColor(COLOR.textDim);

      // Exit trigger: walking off the bottom edge
      if (this.rowan.y >= GBC_H - 12) {
        this.isBusy = true;
        returnToThreshold(this, this.save, "nigredo");
      }
    } else {
      const distToFurnace = Phaser.Math.Distance.Between(
        this.rowan.x,
        this.rowan.y,
        GBC_W / 2,
        GBC_H / 2 + 14,
      );
      if (distToFurnace < 24) {
        this.hintText.setText("[A] STOKE THE FURNACE");
        this.hintText.setColor(COLOR.textGold);
      } else {
        this.hintText.setText("WALK");
        this.hintText.setColor(COLOR.textDim);
      }
    }
  }

  private tryInteract() {
    if (this.isBusy || this.isDone) return;
    const distToFurnace = Phaser.Math.Distance.Between(
      this.rowan.x,
      this.rowan.y,
      GBC_W / 2,
      GBC_H / 2 + 14,
    );
    if (distToFurnace < 24) {
      this.isBusy = true;
      this.hintText.setText("");
      this.beginDissolving();
    }
  }

  /**
   * Update furnace halo + progress text + a brief outcome flash so each
   * shade resolution leaves an immediate, visible aftermath.
   *
   * Stops ambient whispers permanently once any shade has been faced —
   * the room hushes when the work begins in earnest.
   */
  private applyFurnaceState(lastOutcome?: "sat_with" | "fled" | "destroyed"): void {
    this.progressText.setText(`SAT ${this.currentSat}/3`);

    // The furnace steadies as the sat count rises.
    const steadyAlpha = 0.35 + this.currentSat * 0.12;
    const haloColor =
      lastOutcome === "destroyed" ? 0xc83030 : this.currentSat >= 1 ? 0xff6620 : 0xff4400;
    this.furnaceHalo.setFillStyle(haloColor, Math.min(0.85, steadyAlpha));

    if (lastOutcome === "sat_with") {
      // Brief coherent flare — the fire steadies.
      this.tweens.add({
        targets: this.furnaceHalo,
        scaleX: { from: 1, to: 1.25 },
        scaleY: { from: 1, to: 1.25 },
        duration: 350,
        yoyo: true,
        ease: "Sine.inOut",
      });
    } else if (lastOutcome === "destroyed") {
      // Harsh red flare, then settle uglier.
      this.tweens.add({
        targets: this.furnaceHalo,
        scaleX: { from: 1, to: 1.6 },
        scaleY: { from: 1, to: 1.6 },
        alpha: { from: 0.85, to: 0.5 },
        duration: 300,
        yoyo: true,
        ease: "Cubic.out",
      });
      // Stop whispers; this room has had enough voices.
      this.ambientWhisperEvent?.remove(false);
      this.ambientWhisperEvent = undefined;
    } else if (lastOutcome === "fled") {
      // Sputter dim.
      this.tweens.add({
        targets: this.furnaceHalo,
        alpha: { from: steadyAlpha, to: 0.15 },
        duration: 500,
        yoyo: true,
        ease: "Sine.out",
      });
    }

    // Once any shade has been faced, the wall whispers fall silent.
    if (lastOutcome && this.ambientWhisperEvent) {
      this.ambientWhisperEvent.remove(false);
      this.ambientWhisperEvent = undefined;
    }
  }

  /**
   * Low-cost ambient wall-whisper system. Pre-shade and between-shade only —
   * one bark on screen at a time, fades upward. Pure atmosphere; no save
   * effect. Stopped permanently after any shade is faced.
   */
  private startAmbientWhispers(): void {
    this.ambientWhisperEvent?.remove(false);
    this.ambientWhisperEvent = this.time.addEvent({
      delay: Phaser.Math.Between(4500, 7500),
      loop: true,
      callback: () => {
        if (this.isBusy || this.isDone || this.activeWhisper) return;
        const text = Phaser.Utils.Array.GetRandom(WALL_WHISPERS);
        // Anchor near a wall edge, away from the furnace.
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? Phaser.Math.Between(6, 30) : Phaser.Math.Between(GBC_W - 70, GBC_W - 36);
        const y = Phaser.Math.Between(40, 80);
        const w = new GBCText(this, x, y, text, {
          color: COLOR.textDim,
          depth: 8,
          maxWidthPx: 60,
        });
        this.activeWhisper = w;
        this.tweens.add({
          targets: w.obj,
          y: y - 10,
          alpha: { from: 0.7, to: 0 },
          duration: 2200,
          ease: "Sine.out",
          onComplete: () => {
            w.destroy();
            this.activeWhisper = undefined;
          },
        });
      },
    });
  }
}
