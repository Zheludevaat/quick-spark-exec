/**
 * Books — the texts read in Citrinitas.
 *
 * 3 visible books + 1 hidden (the_fourth_book, granted by the
 * read_the_fourth_book quest). Each book is a short monologue followed by
 * a binary inquiry: ACCEPT (sets a conviction, awards a yellow stone) or
 * REFUSE.
 *
 * Branching is light: extra ACCEPT options unlock when reactivity hooks fire
 * (e.g. mirror_philosopher:argued → Book of Anger gets an extra accept line).
 */
import type { SaveSlot } from "../types";
import { hasChoice } from "../scenes/imaginal/soulRunner";

export type BookOption = {
  label: string;
  reply: string;
  /** "accept" sets the conviction + awards yellow. "refuse" closes the book. */
  kind: "accept" | "refuse";
};

export type Book = {
  id: string;
  title: string;
  monologue: { who: string; text: string }[];
  prompt: { who: string; text: string };
  options: (save: SaveSlot) => BookOption[];
  /** Conviction key set on accept. */
  conviction: string;
  /** Hidden books: not shown unless `gate(save)` returns true. */
  gate?: (save: SaveSlot) => boolean;
};

export const BOOKS: Book[] = [
  // ===== ON HER ANGER =====
  {
    id: "anger",
    title: "ON HER ANGER",
    monologue: [
      { who: "BOOK", text: "It was not loud." },
      { who: "BOOK", text: "It was a steady refusal to disappear." },
      { who: "BOOK", text: "Yours, mostly." },
    ],
    prompt: { who: "BOOK", text: "Was she angry the whole time?" },
    options: (save) => {
      const argued = hasChoice(save, "mirror_philosopher", "argued");
      const base: BookOption[] = [
        {
          label: "YES. I WAS ANGRY THE WHOLE TIME.",
          reply: "The page warms. The truth stays.",
          kind: "accept",
        },
        {
          label: "NO. I WAS PATIENT.",
          reply: "The book closes itself. Politely.",
          kind: "refuse",
        },
      ];
      if (argued) {
        base.splice(1, 0, {
          label: "YES. I ARGUED THE PHILOSOPHER FOR FUN.",
          reply: "The book underlines this in red.",
          kind: "accept",
        });
      }
      return base;
    },
    conviction: "accepted_her_anger",
  },

  // ===== ON HER NEEDING =====
  {
    id: "dependence",
    title: "ON HER NEEDING",
    monologue: [
      { who: "BOOK", text: "She asked, often." },
      { who: "BOOK", text: "And called it not asking." },
    ],
    prompt: { who: "BOOK", text: "Did you need them?" },
    options: () => [
      {
        label: "YES. I PRETENDED OTHERWISE.",
        reply: "The page warms. The truth stays.",
        kind: "accept",
      },
      {
        label: "NO. I WAS SELF-SUFFICIENT.",
        reply: "The book closes. The shelf creaks.",
        kind: "refuse",
      },
    ],
    conviction: "accepted_her_dependence",
  },

  // ===== ON HER WANTING =====
  {
    id: "ambition",
    title: "ON HER WANTING",
    monologue: [
      { who: "BOOK", text: "She wanted more than she said aloud." },
      { who: "BOOK", text: "She resented who got it." },
    ],
    prompt: { who: "BOOK", text: "Did you want to be chosen?" },
    options: (save) => {
      const held = hasChoice(save, "weighed_heart", "held");
      const base: BookOption[] = [
        {
          label: "YES. I WANTED TO BE CHOSEN.",
          reply: "The page warms. The truth stays.",
          kind: "accept",
        },
        {
          label: "NO. I NEVER WANTED THAT.",
          reply: "The book closes. Quiet.",
          kind: "refuse",
        },
      ];
      if (held) {
        base.splice(1, 0, {
          label: "YES — AND THE FEATHER STILL SAID YES.",
          reply: "The book copies your line in the margin.",
          kind: "accept",
        });
      }
      return base;
    },
    conviction: "accepted_her_ambition",
  },

  // ===== HIDDEN: THE FOURTH BOOK =====
  {
    id: "fourth",
    title: "ON HER LEAVING",
    monologue: [
      { who: "BOOK", text: "She left, often. Quietly." },
      { who: "BOOK", text: "She rehearsed the door." },
      { who: "BOOK", text: "This page was torn from a longer book." },
    ],
    prompt: { who: "BOOK", text: "Did you leave first?" },
    options: () => [
      {
        label: "YES. ALMOST EVERY TIME.",
        reply: "The page warms. The truth stays.",
        kind: "accept",
      },
      {
        label: "NO. THEY LEFT FIRST.",
        reply: "The book sets itself back on the shelf.",
        kind: "refuse",
      },
    ],
    conviction: "accepted_her_leaving",
    gate: (save) => save.sideQuests["read_the_fourth_book"] === "active" || save.sideQuests["read_the_fourth_book"] === "done",
  },
];

/** The teacher's sentence — granted only by reading all 3 visible books. */
export const TEACHERS_SENTENCE = "WHAT YOU CALL FAILURE IS A METHOD.";
