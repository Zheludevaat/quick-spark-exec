import type { SoulId } from "./souls";
import type { SoulArc, SoulEnding } from "./soulRunner";
import { soulsCompleted, hasChoice, anySoulHasChoice } from "./soulRunner";
import { unlockLore, showLoreToast } from "../lore";
import { activateQuest, completeQuest, questStatus } from "../../sideQuests";
import type { SaveSlot } from "../../types";
import type { Scene } from "phaser";

/**
 * 13 branching soul arcs.
 *
 * Authoring rules:
 *  - Every famous shade has at least 2 endings with different lore unlocks.
 *  - Every soul records a `tag` per choice into save.soulChoices[id], so future
 *    visits and other souls can react.
 *  - Every soul has a dryly funny line.
 *  - World-expansion lore unlocks chained off `soulsCompleted`.
 */

// ----------------------------------------------------------------------------
// Shared post-completion world-expansion unlocker.
// Wired as an `effect` on every ending so it always runs once per soul.
// ----------------------------------------------------------------------------
function maybeUnlockWorldLore(scene: Scene, save: SaveSlot) {
  const n = soulsCompleted(save);
  if (n >= 2 && unlockLore(save, "on_the_plateau")) showLoreToast(scene, "on_the_plateau");
  if (n >= 4 && unlockLore(save, "on_the_imaginal")) showLoreToast(scene, "on_the_imaginal");
  if (n >= 6 && unlockLore(save, "on_the_shades")) showLoreToast(scene, "on_the_shades");
  if (n >= 8 && unlockLore(save, "on_witnessing")) showLoreToast(scene, "on_witnessing");

  // Quest hint chain
  if (
    questStatus(save, "feed_the_collector") === "done" &&
    questStatus(save, "the_unfinished_song") === "todo"
  ) {
    activateQuest(scene, save, "the_unfinished_song");
  }
}

/** Wrap an ending's effect with the shared world-lore unlocker. */
function ending(e: SoulEnding): SoulEnding {
  const userEffect = e.effect;
  return {
    ...e,
    effect: (scene, save) => {
      userEffect?.(scene, save);
      maybeUnlockWorldLore(scene, save);
    },
  };
}

// ============================================================================
const ARCS: Record<SoulId, SoulArc> = {
  // ============================================================================
  // POOLS
  // ============================================================================
  cartographer: {
    id: "cartographer",
    defaultEnding: "incomplete",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          // Cross-soul: if you held the Feather, the cartographer notices the
          // weight in your hands and his country gets a fourth river.
          if (hasChoice(save, "weighed_heart", "held")) {
            return [
              { who: "CARTOGRAPHER", text: "You walk like someone who held a feather." },
              { who: "CARTOGRAPHER", text: "I'll add a fourth river. It will run through your hands." },
            ];
          }
          return [
            { who: "CARTOGRAPHER", text: "I am mapping a country that does not exist." },
            { who: "CARTOGRAPHER", text: "It has three rivers. None of them flow." },
          ];
        },
      },
      {
        kind: "inquiry",
        prompt: { who: "CARTOGRAPHER", text: "Speak?" },
        options: [
          {
            choice: "ask",
            label: "WHY MAP IT?",
            reply: "Because no one else will. The work is the point.",
            tag: "asked_why",
          },
          {
            choice: "ask",
            label: "MAY I SEE IT?",
            reply: "Mm. Look. Don't touch. The ink runs in three dimensions.",
            tag: "asked_see",
            branch: { to: "review" },
          },
          {
            choice: "silent",
            label: "(SAY NOTHING)",
            reply: "Hm. You stayed. That counts.",
            tag: "stayed_silent",
          },
        ],
      },
      {
        kind: "dialog",
        lines: [
          { who: "CARTOGRAPHER", text: "Stay a moment. I'm at the last river." },
          { who: "CARTOGRAPHER", text: "I'd like a witness for the last bend." },
        ],
        next: { to: "witness_step" },
      },
      // Branch: reviewing the map (richer ending)
      {
        label: "review",
        kind: "react",
        build: (save: SaveSlot) => [
          {
            who: "CARTOGRAPHER",
            text:
              save.flags.imaginal_intro && save.verbs.witness
                ? "Look — that mountain there is shaped like your daimon. Coincidence."
                : "Look — that mountain there is unmapped on purpose. Politeness.",
          },
          { who: "CARTOGRAPHER", text: "The country is three steps wide. You can finish it." },
        ],
        next: { to: "witness_step" },
      },
      {
        label: "witness_step",
        kind: "witness",
        missingHint: { who: "CARTOGRAPHER", text: "You don't yet know how to stay. Come back." },
        lines: [
          { who: "CARTOGRAPHER", text: "There. Done. I drew it as a question mark." },
          { who: "CARTOGRAPHER", text: "I think the country was always you, walking." },
        ],
        next: { to: "end", ending: "witnessed" },
      },
    ],
    endings: {
      witnessed: ending({
        loreId: "soul_cartographer",
        stats: { clarity: 1 },
        effect: (scene, save) => {
          activateQuest(scene, save, "chart_the_pools");
        },
      }),
      incomplete: ending({
        loreId: "soul_cartographer_incomplete",
        stats: { clarity: 0 },
      }),
    },
  },

  // ----------------------------------------------------------------------
  weeping_twin: {
    id: "weeping_twin",
    defaultEnding: "released",
    steps: [
      {
        kind: "dialog",
        lines: [
          {
            who: "WEEPING TWIN",
            text: "She weeps. The reflection weeps with her, slightly delayed.",
          },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "WEEPING TWIN", text: "What do you do?" },
        options: [
          {
            choice: "observe",
            label: "OBSERVE",
            reply: "You watch. The reflection notices being watched, and pauses.",
            tag: "observed",
          },
          {
            choice: "ask",
            label: "ADDRESS",
            reply: "She does not look up. The reflection does.",
            tag: "addressed",
            branch: { to: "addressed_branch" },
          },
          {
            choice: "silent",
            label: "RELEASE",
            reply: "You begin to walk past. She laughs once, like a hiccup.",
            tag: "released_early",
            branch: { to: "end", ending: "released_early" },
          },
        ],
      },
      // observed path
      {
        kind: "dialog",
        lines: [
          { who: "WEEPING TWIN", text: "Do you remember which one of us is the original?" },
          { who: "WEEPING TWIN", text: "Neither of us does. It's quite freeing." },
        ],
        next: { to: "to_release" },
      },
      // addressed branch — she opens up
      {
        label: "addressed_branch",
        kind: "dialog",
        lines: [
          { who: "WEEPING TWIN", text: "You spoke. The reflection spoke back, in your voice." },
          { who: "WEEPING TWIN", text: "I think you've just made a small, polite ghost." },
        ],
        next: { to: "to_release" },
      },
      {
        label: "to_release",
        kind: "inquiry",
        prompt: { who: "WEEPING TWIN", text: "Now?" },
        options: [
          {
            choice: "silent",
            label: "RELEASE",
            reply: "She nods. The reflection waves. You walk on.",
            tag: "released",
            branch: { to: "end", ending: "released" },
          },
          {
            choice: "observe",
            label: "STAY",
            reply: "She blinks. So does the reflection. You feel watched twice.",
            tag: "stayed",
            branch: { to: "end", ending: "stayed" },
          },
        ],
      },
    ],
    endings: {
      released: ending({ loreId: "soul_weeping_twin", stats: { compassion: 1 } }),
      released_early: ending({ loreId: "soul_weeping_twin_early" }),
      stayed: ending({ loreId: "soul_weeping_twin_stayed", stats: { compassion: 1, clarity: 1 } }),
    },
  },

  // ----------------------------------------------------------------------
  drowned_poet: {
    id: "drowned_poet",
    defaultEnding: "guessed",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          if (hasChoice(save, "mirror_philosopher", "argued")) {
            return [
              { who: "ONE WHO SANG", text: "You argued the man at the pool. He'll thank you, eventually." },
              { who: "ONE WHO SANG", text: '"Rosemary for remembrance, and pansies for..."' },
            ];
          }
          return [
            { who: "ONE WHO SANG", text: '"Rosemary for remembrance, and pansies for..."' },
            { who: "ONE WHO SANG", text: "She trails off. The water finishes it for her, badly." },
          ];
        },
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE WHO SANG", text: "What follows pansies?" },
        options: [
          {
            choice: "ask",
            label: "THOUGHTS",
            reply: "Yes. That's the word. Thank you. I have been here since before language.",
            tag: "named_thoughts",
            branch: { to: "end", ending: "named" },
          },
          {
            choice: "silent",
            label: "FORGETTING",
            reply: "Close. But no. The opposite, in fact. We are getting warmer.",
            tag: "guessed_forgetting",
            branch: { to: "end", ending: "guessed" },
          },
          {
            choice: "observe",
            label: "FLOWERS",
            reply: "Tautology, dear. You can do better.",
            tag: "guessed_flowers",
            branch: { to: "end", ending: "guessed" },
          },
          {
            choice: "confess",
            label: "I DON'T KNOW",
            reply: "Honest. The water also doesn't. We are even.",
            tag: "confessed",
            branch: { to: "end", ending: "honest" },
          },
        ],
      },
    ],
    endings: {
      named: ending({
        loreId: "soul_drowned_poet",
        stats: { clarity: 1 },
        shardFragments: 1,
        effect: (scene, save) => completeQuest(scene, save, "the_unfinished_song"),
      }),
      guessed: ending({
        loreId: "soul_drowned_poet_guessed",
        effect: (scene, save) => activateQuest(scene, save, "the_unfinished_song"),
      }),
      honest: ending({
        loreId: "soul_drowned_poet_honest",
        stats: { compassion: 1 },
      }),
    },
  },

  // ----------------------------------------------------------------------
  mirror_philosopher: {
    id: "mirror_philosopher",
    defaultEnding: "walked",
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
          {
            choice: "ask",
            label: "ARGUE",
            reply: "Ah, a sceptic. You have my attention. Briefly.",
            tag: "argued",
            branch: { to: "argue_branch" },
          },
          {
            choice: "observe",
            label: "AGREE",
            reply: "Finally. A walker with sense. Sit a while.",
            tag: "agreed",
            branch: { to: "agree_branch" },
          },
          {
            choice: "silent",
            label: "WALK PAST",
            reply: '...he sniffs. "They never stay long."',
            tag: "walked",
            branch: { to: "end", ending: "walked" },
          },
        ],
      },
      {
        label: "argue_branch",
        kind: "dialog",
        lines: [
          { who: "ONE BY THE WATER", text: "If we are reflections, who is reflecting?" },
          { who: "ONE BY THE WATER", text: "...a fair point. Damn. I'll need to revise." },
        ],
        next: { to: "end", ending: "argued" },
      },
      {
        label: "agree_branch",
        kind: "dialog",
        lines: [
          { who: "ONE BY THE WATER", text: "Then come with me. The pool is shallow but kind." },
          { who: "ONE BY THE WATER", text: "...you didn't. Shame. Truth is for the brave." },
        ],
        next: { to: "end", ending: "agreed" },
      },
    ],
    endings: {
      argued: ending({
        loreId: "soul_mirror_philosopher_argued",
        stats: { clarity: 2 },
      }),
      agreed: ending({
        loreId: "soul_mirror_philosopher_agreed",
        stats: { compassion: 1 },
      }),
      walked: ending({
        loreId: "soul_mirror_philosopher",
      }),
    },
  },

  // ============================================================================
  // FIELD
  // ============================================================================
  collector: {
    id: "collector",
    defaultEnding: "refused",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "COLLECTOR", text: "You've touched the motes. I can smell them on you." },
          { who: "COLLECTOR", text: "Three would do nicely. For the jar. For science." },
        ],
      },
      {
        kind: "gate",
        check: (s: SaveSlot) => Object.keys(s.seedEchoes).length >= 3,
        pass: { to: "give_offer" },
        fail: { to: "no_echoes" },
      },
      {
        label: "no_echoes",
        kind: "dialog",
        lines: [
          { who: "COLLECTOR", text: "...but you've barely touched any. Go. Touch some. Come back." },
        ],
        next: { to: "end", ending: "deferred" },
      },
      {
        label: "give_offer",
        kind: "inquiry",
        prompt: { who: "COLLECTOR", text: "Give him three echoes?" },
        options: [
          {
            choice: "confess",
            label: "GIVE THREE",
            reply: "Oh — oh, thank you. I'll keep them safe-ish.",
            tag: "gave",
            branch: { to: "end", ending: "gave" },
          },
          {
            choice: "silent",
            label: "REFUSE",
            reply: "Fine. Fine. The jar is mostly empty anyway.",
            tag: "refused",
            branch: { to: "end", ending: "refused" },
          },
        ],
      },
    ],
    endings: {
      gave: ending({
        loreId: "soul_collector",
        shardFragments: 1,
        effect: (scene, save) => {
          activateQuest(scene, save, "feed_the_collector");
          completeQuest(scene, save, "feed_the_collector");
        },
      }),
      refused: ending({ loreId: "soul_collector_refused", stats: { clarity: 1 } }),
      deferred: ending({ loreId: "soul_collector_deferred" }),
    },
  },

  // ----------------------------------------------------------------------
  sleeper: {
    id: "sleeper",
    defaultEnding: "witnessed",
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
        missingHint: {
          who: "SOPHENE",
          text: "He needs only to be seen. You don't yet know how to stay.",
        },
        lines: [
          { who: "SLEEPER", text: "His face softens. He does not wake. He was never going to." },
          { who: "SLEEPER", text: "But he was witnessed. That, apparently, is enough." },
        ],
        next: { to: "end", ending: "witnessed" },
      },
    ],
    endings: {
      witnessed: ending({ loreId: "soul_sleeper", stats: { compassion: 1 } }),
    },
  },

  // ----------------------------------------------------------------------
  walking_saint: {
    id: "walking_saint",
    defaultEnding: "left",
    steps: [
      {
        kind: "inquiry",
        prompt: { who: "ONE WHO REFUSES", text: "Offer her a mote?" },
        options: [
          {
            choice: "confess",
            label: "OFFER",
            reply: "Kind of you. I am not in want. Truly.",
            tag: "offered_1",
            branch: { to: "offer_2" },
          },
          {
            choice: "silent",
            label: "WALK ON",
            reply: 'She nods, as if you\'d stayed.',
            tag: "walked_1",
            branch: { to: "end", ending: "left" },
          },
        ],
      },
      {
        label: "offer_2",
        kind: "inquiry",
        prompt: { who: "ONE WHO REFUSES", text: "Try again?" },
        options: [
          {
            choice: "confess",
            label: "OFFER AGAIN",
            reply: "Still no. Affliction is the only honest possession.",
            tag: "offered_2",
            branch: { to: "offer_3" },
          },
          {
            choice: "silent",
            label: "WALK ON",
            reply: 'She smiles. "Yes. Walk on. Don\'t stay for me."',
            tag: "walked_2",
            branch: { to: "end", ending: "left" },
          },
        ],
      },
      {
        label: "offer_3",
        kind: "inquiry",
        prompt: { who: "ONE WHO REFUSES", text: "Once more?" },
        options: [
          {
            choice: "confess",
            label: "OFFER ONCE MORE",
            reply: "You're stubborn. I like that. Still no. But sit, then.",
            tag: "offered_3",
            branch: { to: "witness_branch" },
          },
          {
            choice: "ask",
            label: "FORCE IT",
            reply: "...she takes it. Her hand shakes. She walks off without thanks.",
            tag: "forced",
            branch: { to: "end", ending: "forced" },
          },
          {
            choice: "silent",
            label: "WALK ON",
            reply: "Good. The kind ones tire of asking.",
            tag: "walked_3",
            branch: { to: "end", ending: "left" },
          },
        ],
      },
      {
        label: "witness_branch",
        kind: "witness",
        missingHint: {
          who: "ONE WHO REFUSES",
          text: "Stay. Don't give. Just stay. You'll learn how.",
        },
        lines: [
          {
            who: "ONE WHO REFUSES",
            text: "There. You stayed without giving. That is the harder thing.",
          },
          { who: "ONE WHO REFUSES", text: "The Plateau is full of hands. Yours, just now, were quiet." },
        ],
        next: { to: "end", ending: "witnessed" },
      },
    ],
    endings: {
      witnessed: ending({
        loreId: "soul_walking_saint",
        stats: { compassion: 1 },
        flag: "echo_follower_unlocked",
        effect: (scene, save) => {
          activateQuest(scene, save, "witness_the_saint");
          completeQuest(scene, save, "witness_the_saint");
        },
      }),
      forced: ending({
        loreId: "soul_walking_saint_forced",
        stats: { compassion: -1, courage: 1 },
      }),
      left: ending({ loreId: "soul_walking_saint_left" }),
    },
  },

  // ----------------------------------------------------------------------
  composer: {
    id: "composer",
    defaultEnding: "tried",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          if (anySoulHasChoice(save, "forced")) {
            return [
              { who: "ONE WHO LISTENS", text: "I heard a hand close where one was offered. Loud." },
              { who: "ONE WHO LISTENS", text: "Make a softer sound for me. Just four taps." },
            ];
          }
          return [
            { who: "ONE WHO LISTENS", text: "Is there a tune here? I keep almost hearing one." },
            { who: "ONE WHO LISTENS", text: "Tap it for me. I'll trust your hands." },
          ];
        },
      },
      {
        kind: "rhythm",
        title: "TAP THE TUNE",
        beats: [600, 1100, 1600, 2100],
        required: 3,
        pass: { to: "heard" },
        fail: { to: "missed" },
      },
      {
        label: "heard",
        kind: "dialog",
        lines: [
          { who: "ONE WHO LISTENS", text: "...there. I heard it. Once. That was enough." },
          { who: "ONE WHO LISTENS", text: "I can stop trying to compose the silence now." },
        ],
        next: { to: "end", ending: "heard" },
      },
      {
        label: "missed",
        kind: "dialog",
        lines: [
          { who: "ONE WHO LISTENS", text: "Close. Closer than yesterday. I'll wait." },
          { who: "ONE WHO LISTENS", text: "Come back when your hands are quieter." },
        ],
        next: { to: "end", ending: "tried" },
      },
    ],
    endings: {
      heard: ending({ loreId: "soul_composer", stats: { clarity: 1 } }),
      tried: ending({ loreId: "soul_composer_tried" }),
    },
  },

  // ============================================================================
  // CORRIDOR
  // ============================================================================
  crowned_one: {
    id: "crowned_one",
    defaultEnding: "witnessed",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          if (anySoulHasChoice(save, "forced")) {
            return [
              { who: "CROWNED ONE", text: "You. The forcing one. I've heard." },
              { who: "CROWNED ONE", text: "Don't bow. The crown is paper and prefers honesty." },
            ];
          }
          return [
            { who: "CROWNED ONE", text: "You're new. You may bow. Briefly." },
            { who: "CROWNED ONE", text: "The crown is paper. Don't tell anyone." },
          ];
        },
      },
      {
        kind: "witness",
        missingHint: { who: "CROWNED ONE", text: "You'll need the staying-verb. Ask your daimon." },
        lines: [
          { who: "CROWNED ONE", text: "Oh. You're really looking. That's — that's quite rude." },
          { who: "CROWNED ONE", text: "...thank you. The paper feels lighter when seen." },
        ],
        next: { to: "end", ending: "witnessed" },
      },
    ],
    endings: {
      witnessed: ending({ loreId: "soul_crowned_one", stats: { courage: 1 } }),
    },
  },

  // ----------------------------------------------------------------------
  stonechild: {
    id: "stonechild",
    defaultEnding: "named",
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
          {
            choice: "ask",
            label: "YES",
            reply: "Thank you. I'll wait. I'm good at waiting.",
            tag: "promised",
          },
          {
            choice: "silent",
            label: "ANOTHER TIME",
            reply: "Of course. A name keeps.",
            tag: "deferred",
            branch: { to: "end", ending: "deferred" },
          },
        ],
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
          {
            choice: "ask",
            label: "EL · I · AS",
            reply: "...yes. Yes. That's me. Thank you, walker.",
            tag: "named",
            // Only resolves to NAMED if all 3 syllable lanterns have been lit.
            // Otherwise: a polite half-recognition that defers the arc.
            branch: { to: "name_check" },
          },
          {
            choice: "confess",
            label: "I FORGET",
            reply: "Then we are even. We can wait together.",
            tag: "forgot",
            branch: { to: "end", ending: "waited" },
          },
        ],
      },
      {
        label: "name_check",
        kind: "gate",
        check: (s: SaveSlot) => !!s.flags.stonechild_name_known,
        pass: { to: "end", ending: "named" },
        fail: { to: "name_unknown" },
      },
      {
        label: "name_unknown",
        kind: "dialog",
        lines: [
          { who: "STONECHILD", text: "...close. The shape is right. But the lanterns are dark." },
          { who: "STONECHILD", text: "Find them. Stand near each. They will speak." },
        ],
        next: { to: "end", ending: "deferred" },
      },
    ],
    endings: {
      named: ending({
        loreId: "soul_stonechild",
        stats: { compassion: 1 },
        effect: (scene, save) => {
          activateQuest(scene, save, "name_the_stonechild");
          completeQuest(scene, save, "name_the_stonechild");
        },
      }),
      waited: ending({ loreId: "soul_stonechild_waited", stats: { compassion: 1 } }),
      deferred: ending({ loreId: "soul_stonechild_deferred" }),
    },
  },

  // ----------------------------------------------------------------------
  lantern_mathematician: {
    id: "lantern_mathematician",
    defaultEnding: "wrong",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          // Cross-soul nods: react if you forced the Saint or named the Stonechild.
          if (hasChoice(save, "walking_saint", "forced")) {
            return [
              { who: "ONE COUNTING", text: "I heard about the saint. You forced her hand." },
              { who: "ONE COUNTING", text: "Don't force this. The lanterns notice force." },
            ];
          }
          if (hasChoice(save, "stonechild", "named")) {
            return [
              { who: "ONE COUNTING", text: "You returned the stonechild's name. Word travels." },
              { who: "ONE COUNTING", text: "Then you might bear a fourth lantern. Listen." },
            ];
          }
          return [
            { who: "ONE COUNTING", text: "Do all infinities end? Do none? Do both? Do neither?" },
            { who: "ONE COUNTING", text: "I have lit a lantern for each answer. One is correct." },
          ];
        },
      },
      {
        kind: "inquiry",
        prompt: { who: "ONE COUNTING", text: "Pick a lantern." },
        options: [
          {
            choice: "ask",
            label: "ALL",
            reply: "Tempting. Wrong. The lantern dims.",
            tag: "guessed_all",
            branch: { to: "end", ending: "wrong" },
          },
          {
            choice: "observe",
            label: "NONE",
            reply: "Bold. Wrong. The lantern coughs.",
            tag: "guessed_none",
            branch: { to: "end", ending: "wrong" },
          },
          {
            choice: "confess",
            label: "BOTH",
            reply: "Generous. Wrong. The lantern sighs.",
            tag: "guessed_both",
            branch: { to: "end", ending: "wrong" },
          },
          {
            choice: "silent",
            label: "NEITHER",
            reply: "...how did you — oh. You stayed long enough to see.",
            tag: "guessed_neither",
            branch: { to: "witness_neither" },
          },
        ],
      },
      {
        label: "witness_neither",
        kind: "witness",
        missingHint: {
          who: "ONE COUNTING",
          text: "The right answer needs the staying-verb. Come back.",
        },
        lines: [
          { who: "ONE COUNTING", text: "Neither. Of course. The question was the lantern." },
          { who: "ONE COUNTING", text: "I can put down the wager now. My heart is small and even." },
        ],
        next: { to: "set_mark" },
      },
      {
        label: "set_mark",
        kind: "set",
        tag: "witnessed_neither",
        next: { to: "end", ending: "right" },
      },
    ],
    endings: {
      right: ending({
        loreId: "soul_lantern_mathematician",
        stats: { clarity: 2 },
      }),
      wrong: ending({
        loreId: "soul_lantern_mathematician_wrong",
        stats: { clarity: 1 },
      }),
    },
  },

  // ----------------------------------------------------------------------
  weighed_heart: {
    id: "weighed_heart",
    defaultEnding: "tried",
    steps: [
      {
        kind: "dialog",
        lines: [
          {
            who: "ONE WHO CARRIED A FEATHER",
            text: "Hold this for me. I am trying to remember the weight.",
          },
          { who: "ONE WHO CARRIED A FEATHER", text: "Stand still. Don't help. Just hold." },
        ],
      },
      {
        kind: "idle",
        ms: 8000,
        prompt: "STAND STILL. HOLD THE FEATHER.",
        pass: { to: "held" },
        fail: { to: "fidgeted" },
      },
      {
        label: "held",
        kind: "dialog",
        lines: [
          {
            who: "ONE WHO CARRIED A FEATHER",
            text: "There. The same as it was. I had feared more.",
          },
          {
            who: "ONE WHO CARRIED A FEATHER",
            text: "Take a piece of it. I won't need the whole anymore.",
          },
        ],
        next: { to: "end", ending: "held" },
      },
      {
        label: "fidgeted",
        kind: "dialog",
        lines: [
          { who: "ONE WHO CARRIED A FEATHER", text: "You moved. The weight tipped. It's all right." },
          { who: "ONE WHO CARRIED A FEATHER", text: "Come back when your feet are heavier than your hands." },
        ],
        next: { to: "end", ending: "tried" },
      },
    ],
    endings: {
      held: ending({
        loreId: "soul_weighed_heart",
        stats: { compassion: 1, courage: 1 },
        shardFragments: 4,
        effect: (scene, save) => {
          activateQuest(scene, save, "weigh_the_feather");
          completeQuest(scene, save, "weigh_the_feather");
        },
      }),
      tried: ending({
        loreId: "soul_weighed_heart_tried",
        effect: (scene, save) => activateQuest(scene, save, "weigh_the_feather"),
      }),
    },
  },

  // ============================================================================
  // WANDERER
  // ============================================================================
  lampkeeper_echo: {
    id: "lampkeeper_echo",
    defaultEnding: "met",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "ECHO", text: "...you've been here before. Or someone like you." },
          { who: "ECHO", text: "I keep arriving in the room you just left." },
        ],
      },
      {
        kind: "react",
        build: (save: SaveSlot) => {
          const completed = soulsCompleted(save);
          // Cross-soul memory: name the most recent specific event we noticed.
          if (hasChoice(save, "walking_saint", "forced")) {
            return [
              { who: "ECHO", text: "The saint walked off without thanks. I felt it from here." },
              { who: "ECHO", text: "I think you took something she wasn't offering." },
            ];
          }
          if (hasChoice(save, "cartographer", "witnessed")) {
            return [
              { who: "ECHO", text: "The cartographer's last river runs through me now." },
              { who: "ECHO", text: "It points back at you. I think the country was always you." },
            ];
          }
          if (hasChoice(save, "lantern_mathematician", "witnessed_neither")) {
            return [
              { who: "ECHO", text: "Neither. Of course. He was so relieved." },
              { who: "ECHO", text: "He puts the lanterns down for whole minutes now." },
            ];
          }
          if (anySoulHasChoice(save, "released") || anySoulHasChoice(save, "stayed")) {
            return [
              { who: "ECHO", text: "The twin laughs sometimes. Did you hear it on your way?" },
            ];
          }
          if (completed >= 4) {
            return [
              { who: "ECHO", text: "You've been busy. Four souls quieter for you, and counting." },
              { who: "ECHO", text: "I think I'm the one you've been outpacing." },
            ];
          }
          if (completed >= 1) {
            return [
              { who: "ECHO", text: "I felt one of them go quiet a moment ago. Was that you?" },
              { who: "ECHO", text: "Kind work. Or rude. Hard to tell, here." },
            ];
          }
          return [
            { who: "ECHO", text: "You haven't quieted anyone yet. That's all right. Don't rush." },
          ];
        },
      },
      {
        kind: "inquiry",
        prompt: { who: "ECHO", text: "Who are you?" },
        options: [
          {
            choice: "ask",
            label: "YOU FIRST",
            reply: "Fair. I am... a faint version of someone. Possibly you.",
            tag: "deferred",
          },
          {
            choice: "confess",
            label: "I DON'T KNOW",
            reply: "Neither do I. We can not-know together.",
            tag: "confessed",
          },
        ],
        defaultBranch: { to: "end", ending: "met" },
      },
    ],
    endings: {
      met: ending({ loreId: "soul_echo", stats: { clarity: 1 } }),
    },
  },

  // ============================================================================
  // ACT II EXPANSION SOULS
  // ============================================================================

  /**
   * Drifting Bride — pools. Promised herself elsewhere; cannot reach the
   * vow she keeps drifting toward. The work is to release the promise,
   * not finish it.
   */
  drifting_bride: {
    id: "drifting_bride",
    defaultEnding: "drifted",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          if (hasChoice(save, "weeping_twin", "released")) {
            return [
              { who: "BRIDE", text: "Your hands look like someone who let a sister laugh." },
              { who: "BRIDE", text: "I have not been able to laugh at my own promise yet." },
            ];
          }
          return [
            { who: "BRIDE", text: "I am late to a vow." },
            { who: "BRIDE", text: "Each step I take, the altar drifts further out." },
          ];
        },
      },
      {
        kind: "inquiry",
        prompt: { who: "BRIDE", text: "Will you carry the vow for me?" },
        options: [
          {
            choice: "ask",
            label: "I WILL HOLD IT",
            reply: "Then it weighs on you. Mine. I drift further.",
            tag: "carried",
            branch: { to: "end", ending: "burdened" },
          },
          {
            choice: "observe",
            label: "PUT IT DOWN",
            reply: "Down. Yes. The water takes paper kindly.",
            tag: "released",
            branch: { to: "end", ending: "released" },
          },
          {
            choice: "observe",
            label: "I SEE THE VOW",
            reply: "Seen. That is almost enough. I will sit a while.",
            tag: "witnessed",
            branch: { to: "end", ending: "seen" },
          },
        ],
      },
    ],
    endings: {
      drifted: ending({ loreId: "soul_drifting_bride" }),
      burdened: ending({ loreId: "soul_drifting_bride", stats: { compassion: 1 } }),
      released: ending({ loreId: "soul_drifting_bride", stats: { clarity: 2 }, shardFragments: 1 }),
      seen: ending({ loreId: "soul_drifting_bride", stats: { clarity: 1, compassion: 1 } }),
    },
  },

  /**
   * Veiled Mourner — pools. Will not lift the veil. The work is to grieve
   * what is concealed without forcing the uncovering.
   */
  veiled_mourner: {
    id: "veiled_mourner",
    defaultEnding: "untouched",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "MOURNER", text: "Do not ask me to lift it." },
          { who: "MOURNER", text: "What is under the veil is not for naming." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "MOURNER", text: "Will you stay?" },
        options: [
          {
            choice: "ask",
            label: "MAY I LIFT IT?",
            reply: "No. But the asking is its own grief. Thank you.",
            tag: "asked",
            branch: { to: "end", ending: "refused" },
          },
          {
            choice: "observe",
            label: "I WILL SIT",
            reply: "Sit. The veil thins when no one tugs.",
            tag: "sat_with",
            branch: { to: "witness_step" },
          },
          {
            choice: "silent",
            label: "I'LL LEAVE YOU",
            reply: "Kind. Go on, then.",
            tag: "left",
            branch: { to: "end", ending: "left" },
          },
        ],
      },
      {
        label: "witness_step",
        kind: "witness",
        lines: [
          { who: "MOURNER", text: "You stayed without asking. That is rare." },
          { who: "MOURNER", text: "I will not lift it. But I will rest now." },
        ],
        missingHint: { who: "MOURNER", text: "Stand without staring. WITNESS, if you can." },
        next: { to: "end", ending: "rested" },
      },
    ],
    endings: {
      untouched: ending({ loreId: "soul_veiled_mourner" }),
      refused: ending({ loreId: "soul_veiled_mourner", stats: { compassion: 1 } }),
      left: ending({ loreId: "soul_veiled_mourner" }),
      rested: ending({
        loreId: "soul_veiled_mourner",
        stats: { compassion: 2 },
        shardFragments: 1,
      }),
    },
  },

  /**
   * Hoarder of Dawns — field. Stockpiles unlived mornings. Cousin to the
   * Collector but worse-natured: keeps what was never offered.
   */
  hoarder_of_dawns: {
    id: "hoarder_of_dawns",
    defaultEnding: "kept",
    steps: [
      {
        kind: "react",
        build: (save: SaveSlot) => {
          if (hasChoice(save, "collector", "refused")) {
            return [
              { who: "HOARDER", text: "Word travels. You refused the Collector's jar." },
              { who: "HOARDER", text: "Then you will refuse mine too. I expect it." },
            ];
          }
          return [
            { who: "HOARDER", text: "Each jar is a morning I never woke into." },
            { who: "HOARDER", text: "I keep them in case the day runs short." },
          ];
        },
      },
      {
        kind: "inquiry",
        prompt: { who: "HOARDER", text: "Will you take a jar?" },
        options: [
          {
            choice: "ask",
            label: "I'LL TAKE ONE",
            reply: "There. A morning you did not earn. Use it badly.",
            tag: "took",
            branch: { to: "end", ending: "took" },
          },
          {
            choice: "observe",
            label: "I HAVE TODAY",
            reply: "Today. Yes. I had forgotten the word.",
            tag: "refused",
            branch: { to: "end", ending: "refused" },
          },
          {
            choice: "confess",
            label: "OPEN ALL OF THEM",
            reply: "All? At once? The light — the light —",
            tag: "released",
            branch: { to: "end", ending: "released" },
          },
        ],
      },
    ],
    endings: {
      kept: ending({ loreId: "soul_hoarder_of_dawns" }),
      took: ending({ loreId: "soul_hoarder_of_dawns" }),
      refused: ending({ loreId: "soul_hoarder_of_dawns", stats: { clarity: 1, courage: 1 } }),
      released: ending({
        loreId: "soul_hoarder_of_dawns",
        stats: { courage: 2 },
        shardFragments: 1,
      }),
    },
  },

  /**
   * Paper Sovereign — corridor. Crowned in announcements. The work is the
   * same gesture as the Crowned One, sharper: the entire kingdom is paper.
   */
  paper_sovereign: {
    id: "paper_sovereign",
    defaultEnding: "ruled",
    steps: [
      {
        kind: "dialog",
        lines: [
          { who: "SOVEREIGN", text: "I rule by proclamation. The proclamations rule me." },
        ],
      },
      {
        kind: "inquiry",
        prompt: { who: "SOVEREIGN", text: "Will you read the next decree?" },
        options: [
          {
            choice: "ask",
            label: "I'LL READ IT",
            reply: "Good. Then it is real. Until tomorrow's.",
            tag: "read",
            branch: { to: "end", ending: "ratified" },
          },
          {
            choice: "observe",
            label: "I SEE THE PAPER",
            reply: "The paper. Yes. The paper.",
            tag: "witnessed",
            branch: { to: "witness_step" },
          },
          {
            choice: "confess",
            label: "TEAR ONE",
            reply: "You — you — yes. One less. The crown is lighter.",
            tag: "tore",
            branch: { to: "end", ending: "torn" },
          },
        ],
      },
      {
        label: "witness_step",
        kind: "witness",
        lines: [
          { who: "SOVEREIGN", text: "You did not bow. You did not write. You looked." },
          { who: "SOVEREIGN", text: "I will set down the seal. For now." },
        ],
        missingHint: { who: "SOVEREIGN", text: "WITNESS, or sign. Not both." },
        next: { to: "end", ending: "abdicated" },
      },
    ],
    endings: {
      ruled: ending({ loreId: "soul_paper_sovereign" }),
      ratified: ending({ loreId: "soul_paper_sovereign" }),
      torn: ending({ loreId: "soul_paper_sovereign", stats: { courage: 2 }, shardFragments: 1 }),
      abdicated: ending({
        loreId: "soul_paper_sovereign",
        stats: { clarity: 1, courage: 1 },
      }),
    },
  },
};

export function getArc(id: SoulId): SoulArc {
  return ARCS[id];
}
