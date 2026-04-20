import * as Phaser from "phaser";
import { COLOR, GBCText, drawGBCBox, GBC_W, GBC_H } from "./gbcArt";
import { getAudio } from "./audio";
import { onActionDown } from "./controls";

/**
 * SorynCompanion — the daimon that follows Rowan after the Silver Threshold binding.
 * - A floating glyph-being (sprite key "soryn_v2") with a halo and trailing motes.
 * - Trails the player with a small delay using eased follow-target points.
 * - Press B (vinput-cancel / B / Q key) near the daimon to open a contextual
 *   "Daimon Speaks" panel.
 * - Emits ambient one-line whispers above Rowan every ~15s of idle play.
 */

export type CompanionContextLines = () => { who: string; text: string }[];

export class SorynCompanion {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private halo: Phaser.GameObjects.Arc;
  private follow: Phaser.GameObjects.Container;
  private speaking = false;
  private ambientTimer?: Phaser.Time.TimerEvent;
  private lastMoveAt = 0;
  private getContext: CompanionContextLines;
  private ambientLines: string[];
  private dialogState: { box: Phaser.GameObjects.GameObject; who: GBCText; text: GBCText; hint: GBCText } | null = null;
  private unbindCancel: (() => void) | null = null;
  private unbindAdvance: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    follow: Phaser.GameObjects.Container,
    getContext: CompanionContextLines,
    ambientLines: string[] = [],
  ) {
    this.scene = scene;
    this.follow = follow;
    this.getContext = getContext;
    this.ambientLines = ambientLines;

    // Halo behind the daimon — soft pulsing
    this.halo = scene.add.circle(follow.x - 14, follow.y - 4, 7, 0x88c0e8, 0.18).setDepth(3);
    scene.tweens.add({ targets: this.halo, scale: 1.4, alpha: 0.05, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.container = scene.add.container(follow.x - 14, follow.y - 4).setDepth(4);
    this.sprite = scene.add.sprite(0, 0, "soryn_v2", 0).setOrigin(0.5, 0.5);
    if (scene.anims.exists("daimon_idle")) this.sprite.play("daimon_idle");
    this.container.add(this.sprite);

    // Subtle bobbing
    scene.tweens.add({ targets: this.container, y: this.container.y - 2, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // B / cancel (rebindable) opens daimon speak
    this.unbindCancel = onActionDown(scene, "cancel", this.openSpeak);
    scene.events.on("vinput-cancel", this.openSpeak);

    // Ambient whisper every ~15s if idle
    this.ambientTimer = scene.time.addEvent({
      delay: 15000, loop: true, callback: () => this.tryAmbient(),
    });

    // Cleanup on shutdown
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Mark that Rowan moved this frame. Resets the ambient idle timer. */
  pingMovement() {
    this.lastMoveAt = this.scene.time.now;
  }

  /** Smoothly trail the followed Rowan container (~8 px behind). */
  update() {
    const dir = this.follow.getData("dir") as string | undefined;
    let ox = -14, oy = -4;
    switch (dir) {
      case "up":    ox = 0;   oy = 8;  break;
      case "down":  ox = 0;   oy = -14; break;
      case "left":  ox = 14;  oy = -4; break;
      case "right": ox = -14; oy = -4; break;
    }
    const tx = this.follow.x + ox;
    const ty = this.follow.y + oy;
    this.container.x = Phaser.Math.Linear(this.container.x, tx, 0.08);
    this.container.y = Phaser.Math.Linear(this.container.y, ty, 0.08);
    this.halo.setPosition(this.container.x, this.container.y);
  }

  private tryAmbient() {
    if (this.speaking) return;
    if (this.ambientLines.length === 0) return;
    if (this.scene.time.now - this.lastMoveAt < 4000) return; // only if recently idle
    const line = this.ambientLines[Math.floor(Math.random() * this.ambientLines.length)];
    const t = new GBCText(this.scene, this.follow.x - 24, this.follow.y - 22, line.toUpperCase(), {
      color: COLOR.textAccent, depth: 220, scrollFactor: 0,
    });
    this.scene.tweens.add({
      targets: t.obj, alpha: 0, y: this.follow.y - 38, duration: 2400,
      onComplete: () => t.destroy(),
    });
    // Pulse the rings briefly
    this.scene.tweens.add({ targets: this.halo, scale: 1.8, duration: 300, yoyo: true });
  }

  /** Show the daimon-speaks panel. Closes with B/Esc/click after a beat. */
  private openSpeak = () => {
    if (this.speaking) return;
    // Only respond if Rowan is reasonably near the daimon
    const dx = this.follow.x - this.container.x;
    const dy = this.follow.y - this.container.y;
    if (dx * dx + dy * dy > 28 * 28) return;
    const lines = this.getContext();
    if (!lines.length) return;
    this.speaking = true;
    getAudio().sfx("confirm");
    const boxX = 4, boxY = GBC_H - 56, boxW = GBC_W - 8, boxH = 52;
    const box = drawGBCBox(this.scene, boxX, boxY, boxW, boxH, 250);
    const who = new GBCText(this.scene, boxX + 6, boxY + 4, lines[0].who.toUpperCase(), { color: COLOR.textAccent, depth: 251, scrollFactor: 0 });
    const text = new GBCText(this.scene, boxX + 6, boxY + 14, lines[0].text.toUpperCase(), {
      color: COLOR.textLight, depth: 251, scrollFactor: 0, maxWidthPx: boxW - 16,
    });
    const hint = new GBCText(this.scene, boxX + boxW - 10, boxY + boxH - 8, "▼", {
      color: COLOR.textAccent, depth: 251, scrollFactor: 0,
    });
    this.scene.tweens.add({ targets: hint.obj, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });
    this.dialogState = { box, who, text, hint };
    let i = 0;

    const advance = () => {
      i++;
      if (i >= lines.length) { closeSpeak(); return; }
      who.setText(lines[i].who.toUpperCase());
      text.setText(lines[i].text.toUpperCase());
    };
    const closeSpeak = () => {
      if (!this.dialogState) return;
      this.dialogState.box.destroy();
      this.dialogState.who.destroy();
      this.dialogState.text.destroy();
      this.dialogState.hint.destroy();
      this.dialogState = null;
      this.speaking = false;
      this.unbindAdvance?.();
      this.unbindAdvance = null;
      this.scene.events.off("vinput-action", advance);
      this.scene.input.off("pointerdown", advance);
    };

    this.unbindAdvance = onActionDown(this.scene, "action", advance);
    this.scene.events.on("vinput-action", advance);
    this.scene.time.delayedCall(120, () => {
      if (this.speaking) this.scene.input.on("pointerdown", advance);
    });
  };

  /** Move the daimon to a specific point instantly (e.g. plateau hide). */
  setVisible(v: boolean) {
    this.container.setVisible(v);
    this.halo.setVisible(v);
  }

  destroy() {
    this.ambientTimer?.remove(false);
    this.unbindCancel?.();
    this.unbindAdvance?.();
    this.scene.events.off("vinput-cancel", this.openSpeak);
    this.container.destroy();
    this.halo.destroy();
  }
}
