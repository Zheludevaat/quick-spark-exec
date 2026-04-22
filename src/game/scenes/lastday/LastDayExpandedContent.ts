/**
 * Act 0 — LastDay expansion content.
 *
 * Six optional domestic encounters that thicken the apartment without
 * adding to the main seed gate. Persistence is explicit: every handler
 * mutates `save` and then calls `scene.persist()` so state lands on disk
 * immediately rather than after dialogue completes.
 */
import type { ActInteraction } from "../../exploration/ActInteraction";
import type { SaveSlot } from "../../types";

export type LastDayHostScene = {
  save: SaveSlot;
  speak: (lines: { who: string; text: string }[], onDone?: () => void) => void;
  persist: () => void;
  bumpStat?: (k: "clarity" | "compassion" | "courage", n: number) => void;
};

export const LASTDAY_EXPANDED_INTERACTIONS: ActInteraction<LastDayHostScene>[] = [
  {
    id: "sink_cup",
    zoneId: "apartment",
    x: 142,
    y: 50,
    radius: 10,
    kind: "inspect",
    prompt: "A: INSPECT CUP",
    repeatPrompt: "A: REMEMBER CUP",
    onceFlag: "lastday_sink_seen",
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      save.flags.lastday_sink_seen = true;
      scene.persist();
      scene.speak([
        { who: "?", text: "A cup, rinsed but not washed." },
        { who: "?", text: "Care halted one step before completion. The way most days end." },
      ]);
    },
  },
  {
    id: "plant",
    zoneId: "apartment",
    x: 14,
    y: 36,
    radius: 10,
    kind: "inspect",
    prompt: "A: CHECK PLANT",
    repeatPrompt: "A: SAY GOODBYE",
    onceFlag: "lastday_plant_seen",
    onInteract: ({ scene, save }) => {
      const second = !!save.flags.lastday_plant_seen;
      save.flags.lastday_plant_seen = true;
      scene.persist();
      const lines = second
        ? [{ who: "?", text: "Still alive. It will outlast this morning, possibly by years." }]
        : [
            { who: "?", text: "It lived without asking whether you meant to keep it alive." },
            { who: "?", text: "A small gratitude you never put into words." },
          ];
      scene.speak(lines);
    },
  },
  {
    id: "draft_message",
    zoneId: "apartment",
    x: 50,
    y: 60,
    radius: 9,
    kind: "inspect",
    prompt: "A: OPEN DRAFT",
    onceFlag: "lastday_draft_seen",
    hiddenUntilFlags: ["seed_call"],
    onInteract: ({ scene, save }) => {
      save.flags.lastday_draft_seen = true;
      scene.persist();
      scene.speak([
        { who: "DRAFT", text: "I have been meaning to say —" },
        { who: "?", text: "Unsent. The sentence knew what it would cost to be finished." },
      ]);
    },
  },
  {
    id: "medicine",
    zoneId: "apartment",
    x: 122,
    y: 36,
    radius: 9,
    kind: "inspect",
    prompt: "A: CHECK BOTTLE",
    onceFlag: "lastday_medicine_seen",
    onInteract: ({ scene, save }) => {
      save.flags.lastday_medicine_seen = true;
      scene.persist();
      scene.speak([
        { who: "?", text: "A bottle. A dose missed yesterday. A dose missed the day before." },
        { who: "?", text: "The body had been trying to say it was a body." },
      ]);
    },
  },
  {
    id: "chair_shadow",
    zoneId: "apartment",
    x: 100,
    y: 70,
    radius: 10,
    kind: "memory",
    prompt: "A: SIT IN THE CHAIR",
    repeatPrompt: "A: STAND AGAIN",
    onceFlag: "lastday_chair_seen",
    hiddenUntilFlags: ["lastday_door_preview_seen"],
    aftermathStyle: "mark",
    onInteract: ({ scene, save }) => {
      const second = !!save.flags.lastday_chair_seen;
      save.flags.lastday_chair_seen = true;
      if (!second) {
        save.fragments += 1;
      }
      scene.persist();
      const lines = second
        ? [{ who: "?", text: "The shape of you is still there. Smaller than you remember." }]
        : [
            { who: "?", text: "An empty chair next to yours. You sit in the wrong one on purpose." },
            { who: "?", text: "The room understands the gesture without making a show of it." },
          ];
      scene.speak(lines);
    },
  },
  {
    id: "doorframe_pencil",
    zoneId: "apartment",
    x: 70,
    y: 78,
    radius: 9,
    kind: "inspect",
    prompt: "A: READ THE MARKS",
    onceFlag: "lastday_doorframe_seen",
    hiddenUntilFlags: ["lastday_door_preview_seen"],
    onInteract: ({ scene, save }) => {
      save.flags.lastday_doorframe_seen = true;
      scene.persist();
      const compassion = save.calling === "caregiver";
      const lines = compassion
        ? [
            { who: "?", text: "Pencil notches up the doorframe. Other people's heights, mostly." },
            { who: "?", text: "You measured them more carefully than you measured yourself." },
          ]
        : [
            { who: "?", text: "Pencil notches up the doorframe. None of them are you." },
            { who: "?", text: "You forgot to keep track of your own height a long time ago." },
          ];
      scene.speak(lines);
    },
  },
];
