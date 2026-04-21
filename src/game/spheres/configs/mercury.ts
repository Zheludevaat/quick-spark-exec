/**
 * Mercury — Tower of Reasons.
 *
 * Governor: HERMAIA. Verb: NAME.
 */
import type { SphereConfig } from "../types";

export const mercuryConfig: SphereConfig = {
  id: "mercury",
  label: "MERCURY",
  governor: "HERMAIA",
  verb: "name",
  bg: "#0a1220",
  accent: 0xa8c8e8,
  plateauScene: "MercuryPlateau",
  trialScene: "MercuryTrial",

  opening: [
    { who: "SORYN", text: "Mercury. The Tower of Reasons." },
    { who: "SORYN", text: "Every thought sharpened twice. Watch which way the cuts run." },
    { who: "?", text: "Three voices arguing in three corners. None of them stop to listen." },
  ],

  souls: [
    {
      id: "the_defender",
      name: "THE DEFENDER",
      prompt: { who: "DEFENDER", text: "I was right. I am still right. They will see, eventually." },
      options: [
        { id: "defender_happy_right", label: "Were you happy being right?", reply: "...No. Being right was the only company I kept.", weight: 3, conviction: "rightness_is_lonely" },
        { id: "defender_show_argument", label: "Show me the argument.", reply: "Here. And here. And here. Look how clean.", weight: 1 },
        { id: "defender_what_cost", label: "What did it cost?", reply: "Everyone. It cost everyone. And I would do it again.", weight: 3, conviction: "rightness_is_lonely" },
      ],
    },
    {
      id: "the_pedant",
      name: "THE PEDANT",
      prompt: { who: "PEDANT", text: "Define your terms. Define them again. I have not yet heard a clean definition." },
      options: [
        { id: "pedant_cannot_define", label: "I cannot define it.", reply: "Then you have not understood. Sit with the gap.", weight: 3 },
        { id: "pedant_definitions_cage", label: "Definitions are a cage.", reply: "A cage is also a shape. Shapes carry weight.", weight: 2 },
        { id: "pedant_define_yourself", label: "Try defining yourself.", reply: "...I am a man who asks for definitions. That is the whole of me.", weight: 3 },
      ],
    },
    {
      id: "the_casuist",
      name: "THE CASUIST",
      prompt: { who: "CASUIST", text: "I can argue either side. Both are correct. Both are wrong. Pick one and I will defeat it." },
      options: [
        { id: "casuist_pick_believe", label: "Pick the one you believe.", reply: "I believe the argument. The side is incidental.", weight: 3 },
        { id: "casuist_say_nothing", label: "Then say nothing.", reply: "Silence is also a position. A coward's, sometimes.", weight: 2 },
        { id: "casuist_withdraw", label: "I withdraw the question.", reply: "...That was the only honest move you had.", weight: 3 },
      ],
    },
  ],

  operations: [
    {
      id: "argument",
      title: "Build an argument",
      prompt: { who: "?", text: "A scaffold of premises stands waiting. Which one carries the weight?" },
      options: [
        { id: "argument_clearest", label: "The clearest premise.", reply: "Clean. It holds.", weight: 3 },
        { id: "argument_boldest", label: "The boldest premise.", reply: "It sways. It may hold.", weight: 2 },
        { id: "argument_flatters", label: "The premise that flatters me.", reply: "It collapses on inspection.", weight: 1 },
      ],
      rewardStat: "clarity",
    },
    {
      id: "proof",
      title: "Walk the proof",
      prompt: { who: "?", text: "Each step must follow. Where do you stop?" },
      options: [
        { id: "proof_completes", label: "When the proof completes.", reply: "Mercury smiles thinly.", weight: 3 },
        { id: "proof_bores", label: "When the proof bores me.", reply: "A small failure. Common.", weight: 1 },
        { id: "proof_assume_too_much", label: "Before I assume too much.", reply: "Honest. Rare.", weight: 3 },
      ],
      rewardStat: "clarity",
    },
    {
      id: "refutation",
      title: "Refute yourself",
      prompt: { who: "?", text: "Pick one of your own beliefs and tear it down." },
      options: [
        { id: "refutation_refuse", label: "I refuse.", reply: "Then it owns you.", weight: 1 },
        { id: "refutation_tear_down", label: "I will tear it down.", reply: "Brave. You wobble afterward.", weight: 3 },
        { id: "refutation_name_unsure", label: "I name the parts I am unsure of.", reply: "Wiser still.", weight: 3, conviction: "i_can_unknow" },
      ],
      rewardStat: "courage",
    },
    {
      id: "silence",
      title: "Sit in silence",
      prompt: { who: "?", text: "The argument stops. Can you stop with it?" },
      options: [
        { id: "silence_yes", label: "Yes.", reply: "The Tower exhales.", weight: 3, conviction: "silence_is_an_answer" },
        { id: "silence_keep_arguing", label: "I keep arguing in my head.", reply: "Mercury hears it. So do you.", weight: 1 },
        { id: "silence_name_unknown", label: "I name what I do not know.", reply: "That is the door.", weight: 3, conviction: "i_can_unknow" },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: { who: "HERMAIA", text: "What can you NAME that you do not understand?" },
    options: [
      { id: "crack_own_grief", label: "My own grief.", reply: "Named. Held lightly.", weight: 3, conviction: "i_can_unknow" },
      { id: "crack_parents_withheld", label: "The thing my parents withheld.", reply: "Named. Heavier.", weight: 3 },
      { id: "crack_keep_returning", label: "Why I keep returning here.", reply: "Mercury nods once.", weight: 3 },
      { id: "crack_understand_all", label: "Nothing. I understand it all.", reply: "Then nothing has been named.", weight: 0 },
    ],
  },

  trialOpening: [
    { who: "HERMAIA", text: "I am the messenger. I name what passes through." },
    { who: "HERMAIA", text: "Three things will arrive wearing faces. Name them — or let them keep their names." },
  ],

  trialRounds: [
    {
      prompt: { who: "HERMAIA", text: "A doubt arrives wearing your father's face. What is it?" },
      options: [
        { id: "trial_father_inheritance", label: "Inheritance.", reply: "Named.", weight: 3 },
        { id: "trial_father_fear_repeat", label: "Fear of repeating him.", reply: "Named, with care.", weight: 3 },
        { id: "trial_father_dont_know", label: "I do not know.", reply: "Honest. Counted.", weight: 2 },
        { id: "trial_father_just_doubt", label: "It is just a doubt.", reply: "Then it stays unnamed.", weight: 1 },
      ],
    },
    {
      prompt: { who: "HERMAIA", text: "A certainty arrives wearing your own face. What is it?" },
      options: [
        { id: "trial_self_defense", label: "A defense.", reply: "Named.", weight: 3 },
        { id: "trial_self_wish", label: "A wish.", reply: "Named.", weight: 3 },
        { id: "trial_self_truth", label: "The truth.", reply: "Maybe. Counted as one.", weight: 1 },
        { id: "trial_self_refuse", label: "I refuse to look.", reply: "It walks past, unmet.", weight: 0 },
      ],
    },
    {
      prompt: { who: "HERMAIA", text: "A silence arrives wearing no face at all. What is it?" },
      options: [
        { id: "trial_silence_unsaid", label: "What I have not said.", reply: "Named.", weight: 3 },
        { id: "trial_silence_never_to_me", label: "What was never said to me.", reply: "Named.", weight: 3 },
        { id: "trial_silence_rest", label: "Rest.", reply: "Named, gently.", weight: 3 },
        { id: "trial_silence_empty", label: "An empty room.", reply: "Then nothing is named.", weight: 1 },
      ],
    },
  ],

  trialPass: [
    { who: "HERMAIA", text: "You named what you could. You let the rest pass with their faces." },
    { who: "HERMAIA", text: "Take the verb. NAME is yours now. Spend it sparingly." },
    { who: "SORYN", text: "Mercury releases its garment. The Tower stops arguing — for one held breath." },
  ],

  trialFail: [
    { who: "HERMAIA", text: "You spoke much. You named little. The faces walked past." },
    { who: "SORYN", text: "Sit with the operations again. Return when the words are quieter." },
  ],

  inscription: "I CAN NAME WHAT I DO NOT KNOW",

  settleText: [
    "You stop here. The arguing is companion enough.",
    "Mercury keeps you. You keep being right. The Tower never closes.",
  ],
};
