/**
 * Mars — the Arena of the Strong.
 *
 * Governor: AREON. Verb: STAND.
 */
import type { SphereConfig } from "../types";

export const marsConfig: SphereConfig = {
  id: "mars",
  label: "MARS",
  governor: "AREON",
  verb: "stand",
  bg: "#1a0808",
  accent: 0xc04848,
  plateauScene: "MarsPlateau",
  trialScene: "MarsTrial",

  opening: [
    { who: "SORYN", text: "Mars. The Arena of the Strong." },
    { who: "SORYN", text: "Every wound here is a trophy. Try not to add to your collection." },
    { who: "?", text: "Iron sand. The stands are full of nobody." },
  ],

  souls: [
    {
      id: "the_champion",
      name: "THE CHAMPION",
      prompt: { who: "CHAMPION", text: "I won every fight that mattered. None of the wins fed me." },
      options: [
        { id: "champion_why_fighting", label: "Why did you keep fighting?", reply: "Because losing once would have been everything.", weight: 3, conviction: "i_can_lose_and_remain" },
        { id: "champion_show_wound", label: "Show me a wound.", reply: "I have not looked at them.", weight: 2 },
        { id: "champion_lay_down_sword", label: "Lay the sword down.", reply: "If I do, who am I?", weight: 3, conviction: "i_am_not_my_fights" },
      ],
    },
    {
      id: "the_coward",
      name: "THE COWARD",
      prompt: { who: "COWARD", text: "I ran. Every time. I am still running." },
      options: [
        { id: "coward_protecting", label: "What were you protecting?", reply: "...A self too small to lose.", weight: 3, conviction: "running_was_a_kind_of_care" },
        { id: "coward_stand_now", label: "Stand once. Now.", reply: "My knees do not remember how.", weight: 2 },
        { id: "coward_flight_wisdom", label: "Some flights are wisdom.", reply: "...You are the first to say so.", weight: 3 },
      ],
    },
    {
      id: "the_refuser",
      name: "THE REFUSER",
      prompt: { who: "REFUSER", text: "I would not fight their war. They called me coward. They called me holy. Both wrong." },
      options: [
        { id: "refuser_stand_for", label: "What did you stand for?", reply: "The line I would not cross.", weight: 3, conviction: "refusal_is_a_stance" },
        { id: "refuser_afraid", label: "Were you afraid?", reply: "Always. Standing anyway.", weight: 3 },
        { id: "refuser_pick_sword", label: "Pick up a sword now.", reply: "No. The stance is the same.", weight: 2 },
      ],
    },
  ],

  operations: [
    {
      id: "the_blow",
      title: "Take a blow without striking back",
      prompt: { who: "?", text: "Something cruel arrives. Your hand wants to move." },
      options: [
        { id: "blow_let_land", label: "I let it land. I stay.", reply: "Mars notes the stillness.", weight: 3, conviction: "i_can_lose_and_remain" },
        { id: "blow_strike_first", label: "I strike first.", reply: "Old reflex. Counted as one.", weight: 1 },
        { id: "blow_step_aside", label: "I step aside.", reply: "Wise, sometimes. Counted.", weight: 2 },
      ],
      rewardStat: "courage",
    },
    {
      id: "the_line",
      title: "Draw a line you will not cross",
      prompt: { who: "?", text: "The sand is soft. A line wants drawing." },
      options: [
        { id: "line_for_children", label: "Here. For my children.", reply: "Drawn. Held.", weight: 3 },
        { id: "line_for_self", label: "Here. For myself.", reply: "Drawn. Cleaner.", weight: 3, conviction: "refusal_is_a_stance" },
        { id: "line_for_small", label: "Lines are for the small.", reply: "The sand stays smooth. So do you, briefly.", weight: 0 },
      ],
      rewardStat: "courage",
    },
    {
      id: "the_loss",
      title: "Lose on purpose",
      prompt: { who: "?", text: "An opponent is weaker than you. The stands hold their breath." },
      options: [
        { id: "loss_yield_win", label: "I yield the win.", reply: "Hard. Honest. Counted.", weight: 3, conviction: "i_am_not_my_fights" },
        { id: "loss_win_quickly", label: "I win quickly. Mercifully.", reply: "Mercy is also a victory. Counted.", weight: 2 },
        { id: "loss_crush", label: "I crush them.", reply: "Loud. Hollow.", weight: 0 },
      ],
      rewardStat: "compassion",
    },
    {
      id: "the_witness",
      title: "Stand beside, not against",
      prompt: { who: "?", text: "Someone is being attacked. You can fight, or you can stand with them." },
      options: [
        { id: "witness_stand_beside", label: "Stand beside.", reply: "Quiet. Heavy. Counted.", weight: 3 },
        { id: "witness_fight_for", label: "Fight on their behalf.", reply: "Loud. Sometimes needed. Counted.", weight: 2 },
        { id: "witness_walk_past", label: "Walk past.", reply: "Then nothing was stood for.", weight: 0 },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: { who: "AREON", text: "What will you STAND for when no one rewards the standing?" },
    options: [
      { id: "crack_honest_sentence", label: "The honest sentence.", reply: "Counted.", weight: 3, conviction: "refusal_is_a_stance" },
      { id: "crack_undefended", label: "The person nobody is defending.", reply: "Counted, with weight.", weight: 3 },
      { id: "crack_own_quiet", label: "My own quiet, against my own noise.", reply: "Counted, the hardest one.", weight: 3, conviction: "i_can_lose_and_remain" },
      { id: "crack_whatever_wins", label: "Whatever wins.", reply: "Then nothing is stood for.", weight: 0 },
    ],
  },

  trialOpening: [
    { who: "AREON", text: "I am the iron. I do not test your strength. I test your stance." },
    { who: "AREON", text: "Three blows. Stand, fall, or step aside. I will know which is which." },
  ],

  trialRounds: [
    {
      prompt: { who: "AREON", text: "A loud crowd cheers a thing you know is wrong. What do you do?" },
      options: [
        { id: "trial_crowd_say_quietly", label: "Say so. Quietly.", reply: "Stood.", weight: 3 },
        { id: "trial_crowd_walk_out", label: "Say nothing. Walk out.", reply: "A small standing. Counted.", weight: 2 },
        { id: "trial_crowd_cheer_along", label: "Cheer along to fit in.", reply: "The Arena hears the lie.", weight: 0 },
        { id: "trial_crowd_shout_down", label: "Shout them down.", reply: "Loud. Counted as one.", weight: 1 },
      ],
    },
    {
      prompt: { who: "AREON", text: "An old enemy offers you a fight you would win. What do you do?" },
      options: [
        { id: "trial_enemy_decline", label: "Decline. Walk past.", reply: "Stood, without striking.", weight: 3 },
        { id: "trial_enemy_accept", label: "Accept. End it cleanly.", reply: "Honest. Counted.", weight: 1 },
        { id: "trial_enemy_sit_beside", label: "Sit down beside them.", reply: "Stood, with grief.", weight: 3 },
        { id: "trial_enemy_apology", label: "Make them apologise first.", reply: "Pride. Counted as zero.", weight: 0 },
      ],
    },
    {
      prompt: { who: "AREON", text: "Your own fear arrives, large as a man, and asks for the duel. What do you do?" },
      options: [
        { id: "trial_fear_name_stand", label: "Name it. Stand inside it.", reply: "Stood.", weight: 3 },
        { id: "trial_fear_apologise", label: "Apologise to it.", reply: "Tender. Counted.", weight: 2 },
        { id: "trial_fear_run", label: "Run.", reply: "Honest, sometimes wisdom. Counted as one.", weight: 1 },
        { id: "trial_fear_pretend", label: "Pretend it isn't there.", reply: "It grows. So do its shadows.", weight: 0 },
      ],
    },
  ],

  trialPass: [
    { who: "AREON", text: "You stood without needing to win. You fell without breaking." },
    { who: "AREON", text: "Take the verb. STAND is yours. Use it for what cannot defend itself." },
    { who: "SORYN", text: "Mars releases its garment. The iron sand cools." },
  ],

  trialFail: [
    { who: "AREON", text: "You fought. You did not stand. There is a difference." },
    { who: "SORYN", text: "Sit with the operations again. Try again when the cheering stops." },
  ],

  inscription: "I CAN STAND WITHOUT WINNING",

  settleText: [
    "You stop here. The Arena always has room for one more sword.",
    "Mars keeps you. The fight is the company. The fight is the company.",
  ],
};
