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
    { who: "SOPHENE", text: "Mars. The Arena of the Strong." },
    { who: "SOPHENE", text: "Every wound here is worn like a medal by people who badly needed a hobby." },
    { who: "?", text: "Iron sand. Empty stands. The sort of silence that still smells faintly of cheering." },
  ],

  souls: [
    {
      id: "the_champion",
      name: "THE CHAMPION",
      prompt: { who: "CHAMPION", text: "I won every fight that mattered. This turned out not to be the same as being fed." },
      options: [
        { id: "champion_why_fighting", label: "Why did you keep fighting?", reply: "Because one loss seemed capable of explaining my whole existence. I was not imaginative.", weight: 3, conviction: "i_can_lose_and_remain" },
        { id: "champion_show_wound", label: "Show me a wound.", reply: "I kept them polished and unnamed. It felt disciplined at the time.", weight: 2 },
        { id: "champion_lay_down_sword", label: "Lay the sword down.", reply: "And become what, exactly? A man with hands and no alibi?", weight: 3, conviction: "i_am_not_my_fights" },
      ],
    },
    {
      id: "the_coward",
      name: "THE COWARD",
      prompt: { who: "COWARD", text: "I ran. Every time. My legs became philosophers. They had excellent arguments for elsewhere." },
      options: [
        { id: "coward_protecting", label: "What were you protecting?", reply: "...A self too small to survive collision. Small things also deserve care.", weight: 3, conviction: "running_was_a_kind_of_care" },
        { id: "coward_stand_now", label: "Stand once. Now.", reply: "My knees have a long memory and poor leadership skills.", weight: 2 },
        { id: "coward_flight_wisdom", label: "Some flights are wisdom.", reply: "...God, that is indecently kind. I nearly believe you.", weight: 3 },
      ],
    },
    {
      id: "the_refuser",
      name: "THE REFUSER",
      prompt: { who: "REFUSER", text: "I would not fight their war. They called me coward. They called me saint. Both were attempts to stop thinking." },
      options: [
        { id: "refuser_stand_for", label: "What did you stand for?", reply: "For the line beyond which obedience becomes self-erasure.", weight: 3, conviction: "refusal_is_a_stance" },
        { id: "refuser_afraid", label: "Were you afraid?", reply: "Every minute. Courage without fear is just bad reading comprehension.", weight: 3 },
        { id: "refuser_pick_sword", label: "Pick up a sword now.", reply: "No. Refusal is still a stance even when spectators find it unsatisfying.", weight: 2 },
      ],
    },
  ],

  operations: [
    {
      id: "the_blow",
      title: "Take a blow without striking back",
      prompt: { who: "?", text: "Something cruel arrives. Your hand is very eager to become a morality." },
      options: [
        { id: "blow_let_land", label: "I let it land. I stay.", reply: "Good. Not every unreturned blow is weakness. Some are measurement.", weight: 3, conviction: "i_can_lose_and_remain" },
        { id: "blow_strike_first", label: "I strike first.", reply: "Fast. Familiar. Usually advertised as certainty.", weight: 1 },
        { id: "blow_step_aside", label: "I step aside.", reply: "Wise, sometimes. Not every duel deserves your biography.", weight: 2 },
      ],
      rewardStat: "courage",
    },
    {
      id: "the_line",
      title: "Draw a line you will not cross",
      prompt: { who: "?", text: "The sand is soft. Principle is not improved by excellent weather." },
      options: [
        { id: "line_for_children", label: "Here. For my children.", reply: "Drawn. Good. Love becomes more useful once it grows edges.", weight: 3 },
        { id: "line_for_self", label: "Here. For myself.", reply: "Drawn cleaner. Self-respect looks less glamorous up close and matters more.", weight: 3, conviction: "refusal_is_a_stance" },
        { id: "line_for_small", label: "Lines are for the small.", reply: "A popular lie among people hoping appetite will pass for greatness.", weight: 0 },
      ],
      rewardStat: "courage",
    },
    {
      id: "the_loss",
      title: "Lose on purpose",
      prompt: { who: "?", text: "An opponent is weaker than you. The crowd can already taste the easy triumph." },
      options: [
        { id: "loss_yield_win", label: "I yield the win.", reply: "Hard. Honest. The ego begins filing a complaint immediately.", weight: 3, conviction: "i_am_not_my_fights" },
        { id: "loss_win_quickly", label: "I win quickly. Mercifully.", reply: "Mercy is real. So is the pleasure of control. Know which one you chose.", weight: 2 },
        { id: "loss_crush", label: "I crush them.", reply: "Loud. Efficient. Starving, somehow.", weight: 0 },
      ],
      rewardStat: "compassion",
    },
    {
      id: "the_witness",
      title: "Stand beside, not against",
      prompt: { who: "?", text: "Someone is being attacked. Force is available. So is presence." },
      options: [
        { id: "witness_stand_beside", label: "Stand beside.", reply: "Quiet. Heavy. More radical than the loud version, sometimes.", weight: 3 },
        { id: "witness_fight_for", label: "Fight on their behalf.", reply: "Necessary, sometimes. Just do not confuse noise with solidarity.", weight: 2 },
        { id: "witness_walk_past", label: "Walk past.", reply: "Then the violence gets to write the minutes.", weight: 0 },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: { who: "AREON", text: "What will you STAND for when reward, applause, and victory have all left early?" },
    options: [
      { id: "crack_honest_sentence", label: "The honest sentence.", reply: "Counted. Truth is often physically unimpressive and morally expensive.", weight: 3, conviction: "refusal_is_a_stance" },
      { id: "crack_undefended", label: "The person nobody is defending.", reply: "Counted, with weight. Good. The undefended are always paying for everyone else's abstractions.", weight: 3 },
      { id: "crack_own_quiet", label: "My own quiet, against my own noise.", reply: "Counted. The hardest opponent is often a private crowd.", weight: 3, conviction: "i_can_lose_and_remain" },
      { id: "crack_whatever_wins", label: "Whatever wins.", reply: "Then you stand for weather and call it character.", weight: 0 },
    ],
  },

  trialOpening: [
    { who: "AREON", text: "I am iron. I do not care whether you are impressive. I care where you place your weight." },
    { who: "AREON", text: "Three blows. Stand, fall, or step aside. Confuse them if you like. I will not." },
  ],

  trialRounds: [
    {
      prompt: { who: "AREON", text: "A loud crowd cheers a thing you know is wrong. What do you do?" },
      options: [
        { id: "trial_crowd_say_quietly", label: "Say so. Quietly.", reply: "Stood. Volume is not the same thing as spine.", weight: 3 },
        { id: "trial_crowd_walk_out", label: "Say nothing. Walk out.", reply: "A smaller standing. Still a standing.", weight: 2 },
        { id: "trial_crowd_cheer_along", label: "Cheer along to fit in.", reply: "The Arena hears the lie before your mouth finishes making it.", weight: 0 },
        { id: "trial_crowd_shout_down", label: "Shout them down.", reply: "Loud. Sometimes useful. Often vanity wearing justice's boots.", weight: 1 },
      ],
    },
    {
      prompt: { who: "AREON", text: "An old enemy offers you a fight you would win. What do you do?" },
      options: [
        { id: "trial_enemy_decline", label: "Decline. Walk past.", reply: "Stood, without striking. Many people never discover this counts.", weight: 3 },
        { id: "trial_enemy_accept", label: "Accept. End it cleanly.", reply: "Honest, but still inside the old story.", weight: 1 },
        { id: "trial_enemy_sit_beside", label: "Sit down beside them.", reply: "Stood, with grief. Better than vengeance and far less cinematic.", weight: 3 },
        { id: "trial_enemy_apology", label: "Make them apologise first.", reply: "Pride is hungry and never once mistakes itself for hunger.", weight: 0 },
      ],
    },
    {
      prompt: { who: "AREON", text: "Your own fear arrives, large as a man, and asks for the duel. What do you do?" },
      options: [
        { id: "trial_fear_name_stand", label: "Name it. Stand inside it.", reply: "Stood. Fear noticed. Not obeyed.", weight: 3 },
        { id: "trial_fear_apologise", label: "Apologise to it.", reply: "Tender. Strange. Not useless.", weight: 2 },
        { id: "trial_fear_run", label: "Run.", reply: "Honest. Sometimes wisdom. Not every retreat is surrender.", weight: 1 },
        { id: "trial_fear_pretend", label: "Pretend it isn't there.", reply: "Then it grows arms, furniture, inheritance, and eventually a theology.", weight: 0 },
      ],
    },
  ],

  trialPass: [
    { who: "AREON", text: "You stood without needing victory to certify you. That is rarer than strength." },
    { who: "AREON", text: "Take the verb. STAND is yours. Spend it where power expects nobody to interrupt." },
    { who: "SOPHENE", text: "Mars releases its garment. The iron sand cools enough to remember it was once only earth." },
  ],

  trialFail: [
    { who: "AREON", text: "You fought. You did not stand. The resemblance fools many people for decades." },
    { who: "SOPHENE", text: "Sit with the operations again. Return when force has become less flattering to you." },
  ],

  inscription: "I CAN STAND WITHOUT WINNING",

  settleText: [
    "You stop here. The Arena always has room for one more person trying to mistake combat for identity.",
    "Mars keeps you. The fight becomes company, and company becomes fate.",
  ],
};
