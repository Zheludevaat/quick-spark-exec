import Phaser from "phaser";
import { PAL, pixelText, VIEW_W, VIEW_H, drawDialogBox } from "../shared";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { attachHUD, InputState, makeRowan } from "./hud";

type Mirror = {
  x: number; y: number;
  kind: "reflection" | "echo" | "glitter" | "boss";
  cleared: boolean;
  obj: Phaser.GameObjects.Container;
};

export class MoonHallScene extends Phaser.Scene {
  private save!: SaveSlot;
  private rowan!: Phaser.GameObjects.Container;
  private input2!: InputState;
  private mirrors: Mirror[] = [];
  private dialogActive = false;
  private hint!: Phaser.GameObjects.Text;

  constructor() { super("MoonHall"); }
  init(data: { save: SaveSlot }) { this.save = data.save; }

  create() {
    this.cameras.main.setBackgroundColor(0x070b15);
    this.add.image(VIEW_W / 2, VIEW_H / 2, "moon_hall_base")
      .setDisplaySize(VIEW_W + 20, VIEW_H + 20)
      .setAlpha(0.6);
    this.add.image(VIEW_W / 2, VIEW_H / 2, "moon_overlays_sigils")
      .setDisplaySize(VIEW_W, VIEW_H).setAlpha(0.18).setBlendMode(Phaser.BlendModes.SCREEN);

    // Floor "reflective" band
    const g = this.add.graphics();
    g.fillStyle(0x101830, 0.6);
    g.fillRect(0, 60, VIEW_W, VIEW_H - 60);

    // Three minor mirrors + boss mirror
    const layout: Mirror[] = [
      { x: 70,  y: 110, kind: "reflection", cleared: !!this.save.flags.m_reflection, obj: null as any },
      { x: 160, y: 110, kind: "echo",       cleared: !!this.save.flags.m_echo, obj: null as any },
      { x: 250, y: 110, kind: "glitter",    cleared: !!this.save.flags.m_glitter, obj: null as any },
      { x: 160, y: 190, kind: "boss",       cleared: false, obj: null as any },
    ];
    for (const m of layout) {
      m.obj = this.makeMirror(m);
      this.mirrors.push(m);
    }

    // Player at top
    this.rowan = makeRowan(this, 30, 90);

    pixelText(this, 8, 18, "HALL OF MIRRORS", 9, "#8ec8e8");
    this.hint = pixelText(this, 8, VIEW_H - 14, "Walk to a mirror, press A.", 7, "#8ec8e8");

    attachHUD(this, () => this.save.stats);
    this.input2 = new InputState(this);
    this.events.on("vinput-action", () => this.tryInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.tryInteract());
    this.input.keyboard?.on("keydown-ENTER", () => this.tryInteract());

    if (!this.save.flags.moonhall_intro) {
      this.save.flags.moonhall_intro = true;
      writeSave(this.save);
      this.time.delayedCall(400, () => this.runDialog([
        { who: "Soryn", text: "Three small mirrors. Each holds a knot you carry." },
        { who: "Soryn", text: "Try OBSERVE on the first, ADDRESS on the second, REMEMBER on the third." },
        { who: "Soryn", text: "RELEASE works on anything — but teaches less." },
      ]));
    }
  }

  private makeMirror(m: Mirror) {
    const c = this.add.container(m.x, m.y);
    const frame = this.add.rectangle(0, 0, 26, 36, PAL.silverDark).setStrokeStyle(2, PAL.silverLight);
    const inner = this.add.rectangle(0, 0, 20, 30, m.cleared ? 0x1a2238 : PAL.moonBlue, m.cleared ? 1 : 0.7);
    let label: Phaser.GameObjects.Text | null = null;
    if (m.kind === "boss") {
      const ring = this.add.circle(0, -22, 6, PAL.warn, 0.7);
      this.tweens.add({ targets: ring, scale: 1.4, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      label = pixelText(this, -18, 22, "the curated self", 7, "#d86a6a");
      c.add([frame, inner, ring, label]);
    } else {
      label = pixelText(this, -10, 22, m.kind, 7, "#8ec8e8");
      c.add([frame, inner, label]);
    }
    if (m.cleared) {
      inner.setFillStyle(0x1a2238, 1);
      label?.setColor("#6a7a9c").setText(`${m.kind} ✓`);
    }
    return c;
  }

  update(_t: number, dt: number) {
    if (this.dialogActive) return;
    if (this.scene.isActive("Encounter")) return;
    const speed = 0.06 * dt;
    const i = this.input2.poll();
    if (i.left)  this.rowan.x -= speed;
    if (i.right) this.rowan.x += speed;
    if (i.up)    this.rowan.y -= speed;
    if (i.down)  this.rowan.y += speed;
    this.rowan.x = Phaser.Math.Clamp(this.rowan.x, 16, VIEW_W - 16);
    this.rowan.y = Phaser.Math.Clamp(this.rowan.y, 70, VIEW_H - 18);

    // proximity hint
    const near = this.nearestMirror();
    if (near && this.dist(near) < 22 * 22) {
      if (near.cleared) this.hint.setText("This mirror is quiet now.");
      else if (near.kind === "boss") {
        const ready = (this.save.stats.clarity + this.save.stats.compassion + this.save.stats.courage) >= 5
          && this.mirrors.filter(m => m.kind !== "boss").every(m => m.cleared);
        this.hint.setText(ready ? "Press A to face the Curated Self." : "Not yet. Clear the smaller mirrors first.");
      } else this.hint.setText("Press A to step into the mirror.");
    } else this.hint.setText("Walk to a mirror, press A.");
  }

  private dist(m: Mirror) {
    const dx = this.rowan.x - m.x, dy = this.rowan.y - m.y;
    return dx * dx + dy * dy;
  }
  private nearestMirror(): Mirror | null {
    let best: Mirror | null = null; let bd = Infinity;
    for (const m of this.mirrors) { const d = this.dist(m); if (d < bd) { bd = d; best = m; } }
    return best;
  }

  private tryInteract() {
    if (this.dialogActive) return;
    const m = this.nearestMirror();
    if (!m || this.dist(m) > 22 * 22) return;
    if (m.cleared) return;

    if (m.kind === "boss") {
      const ready = (this.save.stats.clarity + this.save.stats.compassion + this.save.stats.courage) >= 5
        && this.mirrors.filter(x => x.kind !== "boss").every(x => x.cleared);
      if (!ready) return;
      this.save.scene = "CuratedSelf";
      writeSave(this.save);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("CuratedSelf", { save: this.save }));
      return;
    }

    // Launch encounter
    this.scene.launch("Encounter", {
      save: this.save,
      kind: m.kind,
      onDone: (won: boolean) => {
        this.scene.resume();
        if (won) {
          m.cleared = true;
          this.save.flags[`m_${m.kind}`] = true;
          writeSave(this.save);
          // refresh mirror visual
          m.obj.destroy();
          m.obj = this.makeMirror(m);
          this.events.emit("stats-changed");
        }
      },
    });
    this.scene.pause();
  }

  private runDialog(lines: { who: string; text: string }[]) {
    this.dialogActive = true;
    const box = drawDialogBox(this, 12, 168, VIEW_W - 24, 60);
    const who = pixelText(this, 22, 174, "", 8, "#8ec8e8").setDepth(101);
    const text = pixelText(this, 22, 188, "", 9).setDepth(101);
    text.setWordWrapWidth(VIEW_W - 48);
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        box.destroy(); who.destroy(); text.destroy();
        this.dialogActive = false;
        this.input.keyboard?.off("keydown-SPACE", next);
        this.input.keyboard?.off("keydown-ENTER", next);
        this.events.off("vinput-action", next);
        this.input.off("pointerdown", next);
        return;
      }
      who.setText(lines[i].who);
      text.setText(lines[i].text);
      i++;
    };
    next();
    this.input.keyboard?.on("keydown-SPACE", next);
    this.input.keyboard?.on("keydown-ENTER", next);
    this.events.on("vinput-action", next);
    this.input.on("pointerdown", next);
  }
}
