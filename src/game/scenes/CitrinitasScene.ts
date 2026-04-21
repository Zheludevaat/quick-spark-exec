/**
 * 2.3 — CITRINITAS. The Yellowing.
 *
 * Three books, each a short monologue + binary inquiry. Accept = conviction
 * + yellow stone; refuse = the book closes itself.
 *
 * Reactivity:
 *  - The Librarian sits at the desk. Asking her TWICE about "more books"
 *    activates `read_the_fourth_book` and reveals "ON HER LEAVING."
 *  - Reading all 3 visible books unlocks the hidden Teacher who hands
 *    Rowan a sentence she'll carry into Rubedo (saved as
 *    `flags.teachers_sentence`).
 *  - If the Lantern Mathematician's Act 1 arc completed, he returns here
 *    as a wandering scribe.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { returnToThreshold } from "../athanor/operationScene";
import { awardNamedStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";
import { BOOKS, TEACHERS_SENTENCE, type Book } from "../athanor/books";
import { activateQuest, completeQuest, questStatus } from "../sideQuests";

const OPENING = [
  { who: "SORYN", text: "Sunlight on yellow paper. Three books." },
  { who: "SORYN", text: "Read at least two. The truth is what you let stay." },
];

export class CitrinitasScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private read = 0;
  private librarianAsks = 0;

  constructor() {
    super("Citrinitas");
  }

  init(d: { save: SaveSlot }) {
    this.save = d.save;
    this.save.scene = "Citrinitas";
    writeSave(this.save);
  }

  create() {
    this.cameras.main.setBackgroundColor("#28200a");
    spawnMotes(this, { count: 14, color: 0xe8c860, alpha: 0.5 });
    attachHUD(this, () => this.save.stats);
    this.vesselHud = mountVesselHud(this, this.save);

    // --- ART UPGRADE: Parallax Scriptorium & Golden God-Rays ---
    const cx = GBC_W / 2;
    const cy = GBC_H / 2;

    // 1. Deep Background Parallax (Endless blurred shelves)
    const backShelves = this.add.graphics().setDepth(0);
    for (let i = 0; i < 5; i++) {
      const y = 20 + i * 16;
      backShelves.fillStyle(0x1a1008, 1).fillRect(0, y, GBC_W, 14);
      backShelves.fillStyle(0x2a1a0c, 1).fillRect(0, y + 14, GBC_W, 2);
      for (let j = 0; j < 16; j++) {
        if (Math.random() > 0.3) {
          const bh = Phaser.Math.Between(6, 12);
          backShelves
            .fillStyle(0x201408, 1)
            .fillRect(j * 10 + Phaser.Math.Between(0, 4), y + 14 - bh, 4, bh);
        }
      }
    }
    this.tweens.add({
      targets: backShelves,
      y: -8,
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // 2. Heavy Vignette & Dust Layer
    const shadowVignette = this.add.graphics().setDepth(1);
    shadowVignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0);
    shadowVignette.fillRect(0, 0, GBC_W, 40);

    // 3. Golden God-Rays
    const ray1 = this.add
      .polygon(cx - 20, cy, [-20, -80, 20, -80, 60, 60, -20, 60], 0xffe098, 0.1)
      .setDepth(2)
      .setBlendMode("ADD");
    const ray2 = this.add
      .polygon(cx + 40, cy, [-10, -80, 10, -80, 40, 60, -10, 60], 0xffc060, 0.08)
      .setDepth(2)
      .setBlendMode("ADD");
    this.tweens.add({
      targets: [ray1, ray2],
      alpha: 0.03,
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // 4. Foreground Architecture (Floor & Lectern)
    this.add.ellipse(cx, cy + 24, 110, 30, 0x1a1008).setDepth(3);
    this.add.ellipse(cx, cy + 24, 100, 26, 0x3a1c14).setStrokeStyle(2, 0x582c1c).setDepth(3);
    this.add.rectangle(cx, cy + 14, 28, 20, 0x2a1a0c).setDepth(4);
    this.add.rectangle(cx, cy + 4, 32, 8, 0x4a3018).setDepth(5);

    // 5. Floating Magic Books
    for (let i = 0; i < 3; i++) {
      const bX = cx + (i === 0 ? -30 : i === 1 ? 30 : 0);
      const bY = cy - 10 + (i === 2 ? -20 : 0);
      const book = this.add.rectangle(bX, bY, 12, 16, 0x684828).setDepth(6);
      this.add.rectangle(bX, bY, 10, 14, 0xffe098).setDepth(6);
      this.tweens.add({
        targets: book,
        y: bY - Phaser.Math.Between(4, 8),
        angle: Phaser.Math.Between(-10, 10),
        duration: Phaser.Math.Between(1500, 2500),
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
        delay: i * 400,
      });
    }

    new GBCText(this, cx - 20, cy + 12, "LECTERN", { color: COLOR.textGold, depth: 7 });
    // --- END ART UPGRADE ---

    runDialog(this, OPENING, () => this.maybeMathematician());
  }

  /** Lantern Mathematician cameo (if his Act 1 arc completed). */
  private maybeMathematician() {
    const completed = (this.save.souls?.["lantern_mathematician"] ?? 0) >= 1000;
    if (!completed) return this.librarian();
    runDialog(
      this,
      [
        { who: "SCRIBE", text: "Rowan. I'm copying lanterns now. Quieter work." },
        { who: "SCRIBE", text: "Books are easier than lanterns. The numbers stay still." },
      ],
      () => this.librarian(),
    );
  }

  /** Librarian gateway — asking twice opens the fourth book. */
  private librarian() {
    runInquiry(
      this,
      { who: "LIBRARIAN", text: "Three books. Begin where you like." },
      [
        { choice: "observe", label: "BEGIN READING", reply: "She nods. The shelves wait." },
        { choice: "ask", label: "ARE THESE ALL OF THEM?", reply: "These are the ones for you." },
      ],
      (p) => {
        if (p.choice === "ask") {
          this.librarianAsks += 1;
          if (this.librarianAsks >= 2) {
            // Already asked once and asking again → fourth book.
            this.openFourthBook();
            return;
          }
          // First ask — let player loop back.
          this.librarianAgain();
          return;
        }
        this.runBook(0);
      },
    );
  }

  private librarianAgain() {
    runInquiry(
      this,
      { who: "LIBRARIAN", text: "Did you have another question?" },
      [
        { choice: "observe", label: "NO. I'LL READ.", reply: "She steps aside." },
        { choice: "ask", label: "ARE THERE MORE?", reply: "...there is one more. Behind these." },
      ],
      (p) => {
        if (p.choice === "ask") {
          this.librarianAsks += 1;
          this.openFourthBook();
          return;
        }
        this.runBook(0);
      },
    );
  }

  private openFourthBook() {
    activateQuest(this, this.save, "read_the_fourth_book");
    runDialog(
      this,
      [
        { who: "LIBRARIAN", text: "She reaches behind the others. Hands you a torn page." },
        { who: "LIBRARIAN", text: "I was wrong to hide it. Not wrong to want to." },
      ],
      () => {
        // Insert the fourth book at the front, then continue normal reading.
        this.runBook(0, true);
      },
    );
  }

  private visibleBooks(includeFourth: boolean): Book[] {
    return BOOKS.filter((b) => {
      if (b.gate) return includeFourth || b.gate(this.save);
      return true;
    });
  }

  private runBook(i: number, fourthUnlocked = false) {
    const list = this.visibleBooks(fourthUnlocked);
    if (i >= list.length) return this.finish();
    const b = list[i];
    runDialog(this, b.monologue, () => {
      const opts = b.options(this.save);
      runInquiry(
        this,
        b.prompt,
        opts.map((o) => ({
          choice: o.kind === "accept" ? "confess" : "silent",
          label: o.label,
          reply: o.reply,
        })),
        (picked) => {
          const chosen = opts.find((o) => o.label === picked.label) ?? opts[0];
          if (chosen.kind === "accept") {
            this.save.convictions[b.conviction] = true;
            this.read++;
            awardNamedStone(this, this.save, "yellow", b.title.toLowerCase());
            this.vesselHud.refresh();
            if (b.id === "fourth") {
              completeQuest(this, this.save, "read_the_fourth_book");
              unlockLore(this.save, "on_the_fourth_book");
              showLoreToast(this, "on_the_fourth_book");
              this.save.stats.clarity += 1;
            }
          }
          writeSave(this.save);
          this.runBook(i + 1, fourthUnlocked);
        },
      );
    });
  }

  private finish() {
    if (this.read >= 2) {
      unlockLore(this.save, "on_citrinitas");
      showLoreToast(this, "on_citrinitas");
    }
    // Hidden teacher: all 3 visible books accepted.
    const visibleAccepted =
      (this.save.convictions.accepted_her_anger ? 1 : 0) +
      (this.save.convictions.accepted_her_dependence ? 1 : 0) +
      (this.save.convictions.accepted_her_ambition ? 1 : 0);
    if (visibleAccepted >= 3) {
      runDialog(
        this,
        [
          { who: "TEACHER", text: "All three? Brave. Carry this:" },
          { who: "TEACHER", text: TEACHERS_SENTENCE },
        ],
        () => {
          this.save.flags.teachers_sentence = true;
          unlockLore(this.save, "on_the_torn_teacher");
          showLoreToast(this, "on_the_torn_teacher");
          writeSave(this.save);
          returnToThreshold(this, this.save, "citrinitas");
        },
      );
      return;
    }
    runDialog(
      this,
      [{ who: "SORYN", text: "Enough. The yellow has settled." }],
      () => returnToThreshold(this, this.save, "citrinitas"),
    );
  }
}
