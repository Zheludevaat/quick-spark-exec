import type { SoulId } from "./souls";
import type { SoulArc } from "./soulRunner";
import { awardSoul, soulsCompleted } from "./soulRunner";
import { unlockLore, showLoreToast } from "../lore";
import { activateQuest, completeQuest, questStatus } from "../../sideQuests";

/**
 * 13 soul arcs. Authored as data; the runner handles UI + persistence.
 *
 * Tone rule (per plan): every soul has at least one dryly funny line.
 * Famous shades are NEVER named — the lore log names them on unlock.
 */

const ARCS: Record<SoulId, SoulArc> = {
  // ============================================================================
  // POOLS
  // ============================================================================
  cartographer: {
    id: "cartographer",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "CARTOGRAPHER", text: "I am mapping a country that does not exist." },
          { who: "CARTOGRAPHER", text: "It has three rivers. None of them flow." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "CARTOGRAPHER", text: "Address him?" },
        options: [
          { choice: "ask", label: "WHY MAP IT?", reply: "Because no one else will. The work is the point." },
          { choice: "silent", label: "(SAY NOTHING)", reply: "Hm. You stayed. That counts." },
        ],
        advanceOn: ["ask", "silent"],
      },
      {
        kind: "dialog",
        lines: [
          { who: "CARTOGRAPHER", text: "Stay a moment. I'm at the last river." },
          { who: "CARTOGRAPHER", text: "I'd like a witness for the last bend." },
        ],
      },
      {
        kind: "witness",
        missingHint: { who: "CARTOGRAPHER", text: "You don't yet know how to stay. Come back." },
        lines: [
          { who: "CARTOGRAPHER", text: "There. Done. I drew it as a question mark." },
          { who: "CARTOGRAPHER", text: "I think the country was always you, walking." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_cartographer", stats: { clarity: 1 } });
      activateQuest(scene, save, "chart_the_pools");
      maybeUnlockWorldLore(scene, save);
    },
  },

  weeping_twin: {
    id: "weeping_twin",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "WEEPING TWIN", text: "She weeps. The reflection weeps with her, slightly delayed." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "WEEPING TWIN", text: "What do you do?" },
        options: [
          { choice: "observe", label: "OBSERVE", reply: "You watch. The reflection notices being watched, and pauses." },
          { choice: "ask", label: "ADDRESS", reply: "She does not look up. The reflection does." },
          { choice: "silent", label: "RELEASE", reply: "You begin to walk past. She laughs once, like a hiccup." },
        ],
        advanceOn: ["observe"],
      },
      {
        kind: "dialog",
        lines: [
          { who: "WEEPING TWIN", text: "Do you remember which one of us is the original?" },
          { who: "WEEPING TWIN", text: "Neither of us does. It's quite freeing." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "WEEPING TWIN", text: "Now?" },
        options: [
          { choice: "silent", label: "RELEASE", reply: "She nods. The reflection waves. You walk on." },
          { choice: "observe", label: "STAY", reply: "She blinks. So does the reflection. You feel watched twice." },
        ],
        advanceOn: ["silent"],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_weeping_twin", stats: { compassion: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },

  drowned_poet: {
    id: "drowned_poet",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ONE WHO SANG", text: '"Rosemary for remembrance, and pansies for..."' },
          { who: "ONE WHO SANG", text: "She trails off. The water finishes it for her, badly." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE WHO SANG", text: "What follows pansies?" },
        options: [
          { choice: "ask", label: "THOUGHTS", reply: "Yes. That's the word. Thank you. I have been here since before language." },
          { choice: "silent", label: "FORGETTING", reply: "Close. But no. Try again, walker." },
          { choice: "observe", label: "FLOWERS", reply: "Tautology, dear. You can do better." },
          { choice: "confess", label: "I DON'T KNOW", reply: "Honest. The water also doesn't. We are even." },
        ],
        advanceOn: ["ask"],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, {
        loreId: "soul_drowned_poet",
        stats: { clarity: 1 },
        shardFragments: 1,
      });
      completeQuest(scene, save, "the_unfinished_song");
      maybeUnlockWorldLore(scene, save);
    },
  },

  mirror_philosopher: {
    id: "mirror_philosopher",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ONE BY THE WATER", text: "The pool, you understand, is the truer world." },
          { who: "ONE BY THE WATER", text: "We are the reflections. They got it backwards." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE BY THE WATER", text: "Well?" },
        options: [
          { choice: "ask", label: "ARGUE", reply: "Ah, a sceptic. You have my attention. Briefly." },
          { choice: "observe", label: "AGREE", reply: "Finally. A walker with sense. Sit a while." },
          { choice: "silent", label: "WALK PAST", reply: "...he sniffs. \"They never stay long.\"" },
        ],
        advanceOn: ["ask", "observe", "silent"],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_mirror_philosopher", stats: { clarity: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },

  // ============================================================================
  // FIELD
  // ============================================================================
  collector: {
    id: "collector",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "COLLECTOR", text: "You've touched the motes. I can smell them on you." },
          { who: "COLLECTOR", text: "Three would do nicely. For the jar. For science." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "COLLECTOR", text: "Give him three echoes?" },
        options: [
          { choice: "confess", label: "GIVE THREE", reply: "Oh — oh, thank you. I'll keep them safe-ish." },
          { choice: "silent", label: "REFUSE", reply: "Fine. Fine. The jar is mostly empty anyway." },
        ],
        advanceOn: ["confess"],
      },
    ],
    onComplete: (scene, save) => {
      // Spend 3 echoes; if fewer touched, still award (they "owe" him)
      awardSoul(scene, save, {
        loreId: "soul_collector",
        shardFragments: 1,
      });
      activateQuest(scene, save, "feed_the_collector");
      completeQuest(scene, save, "feed_the_collector");
      maybeUnlockWorldLore(scene, save);
    },
  },

  sleeper: {
    id: "sleeper",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "SLEEPER", text: "He breathes, slowly. He will not wake." },
          { who: "SLEEPER", text: "He looks like someone you knew. Perhaps everyone." },
        ],
      },
      {
        kind: "witness",
        missingHint: { who: "SORYN", text: "He needs only to be seen. You don't yet know how to stay." },
        lines: [
          { who: "SLEEPER", text: "His face softens. He does not wake. He was never going to." },
          { who: "SLEEPER", text: "But he was witnessed. That, apparently, is enough." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_sleeper", stats: { compassion: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },

  walking_saint: {
    id: "walking_saint",
    steps: [
      {
        kind: "inquiry",
        prompt: { who: "ONE WHO REFUSES", text: "Offer her a mote?" },
        options: [
          { choice: "confess", label: "OFFER", reply: "Kind of you. I am not in want. Truly." },
          { choice: "silent", label: "WALK ON", reply: "She nods, as if you'd stayed." },
        ],
        advanceOn: ["confess"],
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE WHO REFUSES", text: "Try again?" },
        options: [
          { choice: "confess", label: "OFFER AGAIN", reply: "Still no. Affliction is the only honest possession." },
          { choice: "silent", label: "WALK ON", reply: "She smiles. \"Yes. Walk on. Don't stay for me.\"" },
        ],
        advanceOn: ["confess"],
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE WHO REFUSES", text: "Once more?" },
        options: [
          { choice: "confess", label: "OFFER ONCE MORE", reply: "You're stubborn. I like that. Still no." },
          { choice: "silent", label: "WALK ON", reply: "Good. The kind ones tire of asking." },
        ],
        advanceOn: ["confess"],
      },
      {
        kind: "witness",
        missingHint: { who: "ONE WHO REFUSES", text: "Stay. Don't give. Just stay. You'll learn how." },
        lines: [
          { who: "ONE WHO REFUSES", text: "There. You stayed without giving. That is the harder thing." },
          { who: "ONE WHO REFUSES", text: "The Plateau is full of hands. Yours, just now, were quiet." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, {
        loreId: "soul_walking_saint",
        stats: { compassion: 1 },
        flag: "echo_follower_unlocked",
      });
      activateQuest(scene, save, "witness_the_saint");
      completeQuest(scene, save, "witness_the_saint");
      maybeUnlockWorldLore(scene, save);
    },
  },

  composer: {
    id: "composer",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ONE WHO LISTENS", text: "Is there a tune here? I keep almost hearing one." },
          { who: "ONE WHO LISTENS", text: "Tap it for me. I'll trust your hands." },
        ],
      },
      {
        kind: "rhythm",
        title: "TAP THE TUNE",
        beats: [600, 1100, 1600, 2100],
        required: 3,
      },
      {
        kind: "dialog",
        lines: [
          { who: "ONE WHO LISTENS", text: "...there. I heard it. Once. That was enough." },
          { who: "ONE WHO LISTENS", text: "I can stop trying to compose the silence now." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_composer", stats: { clarity: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },

  // ============================================================================
  // CORRIDOR
  // ============================================================================
  crowned_one: {
    id: "crowned_one",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "CROWNED ONE", text: "You're new. You may bow. Briefly." },
          { who: "CROWNED ONE", text: "The crown is paper. Don't tell anyone." },
        ],
      },
      {
        kind: "witness",
        missingHint: { who: "CROWNED ONE", text: "You'll need the staying-verb. Ask your daimon." },
        lines: [
          { who: "CROWNED ONE", text: "Oh. You're really looking. That's — that's quite rude." },
          { who: "CROWNED ONE", text: "...thank you. The paper feels lighter when seen." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_crowned_one", stats: { courage: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },

  stonechild: {
    id: "stonechild",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "STONECHILD", text: "Pardon. I have forgotten my name." },
          { who: "STONECHILD", text: "Three lanterns nearby know it. Each holds a syllable." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "STONECHILD", text: "Will you find them?" },
        options: [
          { choice: "ask", label: "YES", reply: "Thank you. I'll wait. I'm good at waiting." },
          { choice: "silent", label: "ANOTHER TIME", reply: "Of course. A name keeps." },
        ],
        advanceOn: ["ask"],
      },
      {
        kind: "dialog",
        lines: [
          { who: "STONECHILD", text: "You returned. Did the lanterns speak?" },
          { who: "STONECHILD", text: "Say it. The whole thing. I will listen." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "STONECHILD", text: "His name is —" },
        options: [
          { choice: "ask", label: "EL · I · AS", reply: "...yes. Yes. That's me. Thank you, walker." },
          { choice: "confess", label: "I FORGET", reply: "Then we are even. We can wait together." },
        ],
        advanceOn: ["ask", "confess"],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_stonechild", stats: { compassion: 1 } });
      activateQuest(scene, save, "name_the_stonechild");
      completeQuest(scene, save, "name_the_stonechild");
      maybeUnlockWorldLore(scene, save);
    },
  },

  lantern_mathematician: {
    id: "lantern_mathematician",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ONE COUNTING", text: "Do all infinities end? Do none? Do both? Do neither?" },
          { who: "ONE COUNTING", text: "I have lit a lantern for each answer. One is correct." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE COUNTING", text: "Pick a lantern." },
        options: [
          { choice: "ask", label: "ALL", reply: "Tempting. Wrong. The lantern dims." },
          { choice: "observe", label: "NONE", reply: "Bold. Wrong. The lantern coughs." },
          { choice: "confess", label: "BOTH", reply: "Generous. Wrong. The lantern sighs." },
          { choice: "silent", label: "NEITHER", reply: "...how did you — oh. You stayed long enough to see." },
        ],
        advanceOn: ["silent"],
      },
      {
        kind: "witness",
        missingHint: { who: "ONE COUNTING", text: "The right answer needs the staying-verb. Come back." },
        lines: [
          { who: "ONE COUNTING", text: "Neither. Of course. The question was the lantern." },
          { who: "ONE COUNTING", text: "I can put down the wager now. My heart is small and even." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_lantern_mathematician", stats: { clarity: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },

  weighed_heart: {
    id: "weighed_heart",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ONE WHO CARRIED A FEATHER", text: "Hold this for me. I am trying to remember the weight." },
          { who: "ONE WHO CARRIED A FEATHER", text: "Stand still. Don't help. Just hold." },
        ],
      },
      {
        kind: "idle",
        ms: 8000,
        prompt: "STAND STILL. HOLD THE FEATHER.",
      },
      {
        kind: "dialog",
        lines: [
          { who: "ONE WHO CARRIED A FEATHER", text: "There. The same as it was. I had feared more." },
          { who: "ONE WHO CARRIED A FEATHER", text: "Take a piece of it. I won't need the whole anymore." },
        ],
      },
    ],
    onComplete: (scene, save) => {
      // Full memory shard = 4 fragments.
      awardSoul(scene, save, {
        loreId: "soul_weighed_heart",
        stats: { compassion: 1, courage: 1 },
        shardFragments: 4,
      });
      activateQuest(scene, save, "weigh_the_feather");
      completeQuest(scene, save, "weigh_the_feather");
      maybeUnlockWorldLore(scene, save);
    },
  },

  // ============================================================================
  // WANDERER
  // ============================================================================
  lampkeeper_echo: {
    id: "lampkeeper_echo",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ECHO", text: "...you've been here before. Or someone like you." },
          { who: "ECHO", text: "I keep arriving in the room you just left." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "ECHO", text: "Who are you?" },
        options: [
          { choice: "ask", label: "YOU FIRST", reply: "Fair. I am... a faint version of someone. Possibly you." },
          { choice: "confess", label: "I DON'T KNOW", reply: "Neither do I. We can not-know together." },
        ],
        advanceOn: ["ask", "confess"],
      },
    ],
    onComplete: (scene, save) => {
      awardSoul(scene, save, { loreId: "soul_echo", stats: { clarity: 1 } });
      maybeUnlockWorldLore(scene, save);
    },
  },
};

export function getArc(id: SoulId): SoulArc {
  return ARCS[id];
}

/** Unlock world-expansion lore based on overall progress. */
function maybeUnlockWorldLore(scene: import("phaser").Scene, save: import("../../types").SaveSlot) {
  const n = soulsCompleted(save) + 1; // +1 because this fires inside onComplete pre-save state
  if (n >= 2 && unlockLore(save, "on_the_plateau")) showLoreToast(scene, "on_the_plateau");
  if (n >= 4 && unlockLore(save, "on_the_imaginal")) showLoreToast(scene, "on_the_imaginal");
  if (n >= 6 && unlockLore(save, "on_the_shades")) showLoreToast(scene, "on_the_shades");
  // on_witnessing unlocks via WITNESS-use counter elsewhere; safe to also unlock at n>=8
  if (n >= 8 && unlockLore(save, "on_witnessing")) showLoreToast(scene, "on_witnessing");

  // Quest hint chain: when feeding the collector completes, surface the song hint
  if (questStatus(save, "feed_the_collector") === "done" && questStatus(save, "the_unfinished_song") === "todo") {
    activateQuest(scene, save, "the_unfinished_song");
  }
}
