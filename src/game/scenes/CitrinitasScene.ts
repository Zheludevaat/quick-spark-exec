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

    // Reading desk silhouette
    this.add.rectangle(GBC_W / 2, GBC_H / 2 + 22, 80, 4, 0x4a3010).setDepth(0);
    this.add.rectangle(GBC_W / 2, GBC_H / 2 + 30, 80, 4, 0x2a1808).setDepth(0);
    // Lectern with a leaning book
    this.add.rectangle(GBC_W / 2, GBC_H / 2 + 6, 28, 16, 0x3a2008).setStrokeStyle(1, 0x6a4018).setDepth(1);
    this.add.rectangle(GBC_W / 2 - 6, GBC_H / 2, 12, 14, 0x8a6028, 0.9).setDepth(2);
    this.add.rectangle(GBC_W / 2 + 6, GBC_H / 2, 12, 14, 0x6a4018, 0.9).setDepth(2);
    // Swaying lantern overhead
    this.add.rectangle(GBC_W / 2 - 28, 4, 1, 12, 0x6a4020, 0.8).setDepth(2);
    const lantern = this.add.circle(GBC_W / 2 - 28, 18, 4, 0xe8c860, 0.85).setStrokeStyle(0.5, 0xc89020).setDepth(2);
    this.tweens.add({
      targets: lantern,
      x: GBC_W / 2 - 22,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // Floating pollen / dust motes lit by the lantern
    for (let i = 0; i < 6; i++) {
      const dust = this.add.circle(40 + i * 12, 30 + (i % 2) * 8, 1, 0xe8c860, 0.7).setDepth(3);
      this.tweens.add({
        targets: dust,
        y: dust.y - 14,
        alpha: { from: 0.7, to: 0 },
        duration: 2600 + i * 240,
        delay: i * 320,
        repeat: -1,
        ease: "Sine.out",
      });
    }
    new GBCText(this, GBC_W / 2 - 30, 16, "THE SCRIPTORIUM", {
      color: COLOR.textGold,
      depth: 5,
    });

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
