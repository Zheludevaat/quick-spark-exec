/**
 * 2.3 — CITRINITAS. The Yellowing.
 *
 * Vertical slice: three "books" presented as inquiries. Each accepted truth
 * sets a Conviction flag. Reading all three (vs minimum 2) = bonus yellow stone
 * + chance at hidden Hypatia encounter.
 */
import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, spawnMotes } from "../gbcArt";
import type { SaveSlot } from "../types";
import { attachHUD, runDialog } from "./hud";
import { writeSave } from "../save";
import { runInquiry } from "../inquiry";
import { returnToThreshold } from "../athanor/operationScene";
import { awardStone } from "../athanor/operations";
import { mountVesselHud, type VesselHud } from "../athanor/vessel";
import { unlockLore, showLoreToast } from "./lore";

type Book = {
  id: string;
  title: string;
  prompt: string;
  conviction: string;
  accept: string;
  refuse: string;
};

const BOOKS: Book[] = [
  {
    id: "anger",
    title: "ON HER ANGER",
    prompt: "It was not loud. It was a steady refusal to disappear. Yours?",
    conviction: "accepted_her_anger",
    accept: "Yes. I was angry the whole time.",
    refuse: "No. I was patient.",
  },
  {
    id: "dependence",
    title: "ON HER NEEDING",
    prompt: "She asked, often, and called it not asking. Yours?",
    conviction: "accepted_her_dependence",
    accept: "Yes. I needed them and pretended otherwise.",
    refuse: "No. I was self-sufficient.",
  },
  {
    id: "ambition",
    title: "ON HER WANTING",
    prompt: "She wanted more than she said aloud, and resented who got it. Yours?",
    conviction: "accepted_her_ambition",
    accept: "Yes. I wanted to be chosen.",
    refuse: "No. I never wanted that.",
  },
];

const OPENING = [
  { who: "SORYN", text: "Sunlight on yellow paper. Three books." },
  { who: "SORYN", text: "Read at least two. The truth is what you let stay." },
];

export class CitrinitasScene extends Phaser.Scene {
  private save!: SaveSlot;
  private vesselHud!: VesselHud;
  private read = 0;

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
    new GBCText(this, GBC_W / 2 - 30, 14, "THE SCRIPTORIUM", {
      color: COLOR.textGold,
      depth: 5,
    });

    runDialog(this, OPENING, () => this.runBook(0));
  }

  private runBook(i: number) {
    if (i >= BOOKS.length) return this.finish();
    const b = BOOKS[i];
    runInquiry(
      this,
      { who: b.title, text: b.prompt },
      [
        { choice: "confess", label: "ACCEPT", reply: "The page warms. The truth stays." },
        { choice: "silent", label: "REFUSE", reply: "The book closes itself. Politely." },
        { choice: "observe", label: "SKIP", reply: "You walk to the next shelf." },
      ],
      (p) => {
        if (p.choice === "confess") {
          this.save.convictions[b.conviction] = true;
          this.read++;
          awardStone(this.save, "yellow", 1);
          this.vesselHud.refresh();
        }
        writeSave(this.save);
        this.runBook(i + 1);
      },
    );
  }

  private finish() {
    if (this.read >= 2) {
      unlockLore(this.save, "on_citrinitas");
      showLoreToast(this, "on_citrinitas");
    }
    if (this.read >= 3) {
      // Hidden teacher encounter
      runDialog(
        this,
        [
          { who: "TEACHER", text: "All three? Brave. Carry this:" },
          { who: "TEACHER", text: "WHAT YOU CALL FAILURE IS A METHOD." },
        ],
        () => {
          unlockLore(this.save, "on_the_torn_teacher");
          showLoreToast(this, "on_the_torn_teacher");
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
