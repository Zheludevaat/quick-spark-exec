/**
 * Mercury — Tower of Reasons.
 *
 * Governor: HERMAIA. Verb: NAME.
 * Theme: argument, proof, refutation, silence. Souls who have built lives
 * out of being right; the trial asks whether you can name what you do not
 * know.
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
    { who: "SORYN", text: "Here every thought is sharpened. Watch the cuts go both ways." },
    { who: "?", text: "Voices arguing in three corners. None of them stop to listen." },
  ],

  souls: [
    {
      id: "the_defender",
      name: "THE DEFENDER",
      prompt: {
        who: "DEFENDER",
        text: "I was right. I am still right. They will see, eventually.",
      },
      options: [
        {
          label: "Were you happy being right?",
          reply: "...No. But I was right.",
          weight: 3,
          conviction: "rightness_is_lonely",
        },
        { label: "Show me the argument.", reply: "Here. And here. And here.", weight: 1 },
        {
          label: "What did it cost?",
          reply: "Everyone. It cost everyone.",
          weight: 3,
          conviction: "rightness_is_lonely",
        },
      ],
    },
    {
      id: "the_pedant",
      name: "THE PEDANT",
      prompt: {
        who: "PEDANT",
        text: "Define your terms. Define them again. I have not yet heard a clean definition.",
      },
      options: [
        { label: "I cannot define it.", reply: "Then you have not understood.", weight: 3 },
        {
          label: "Definitions are a cage.",
          reply: "A cage is also a shape. Shapes are useful.",
          weight: 2,
        },
        { label: "Try defining yourself.", reply: "...I am a man who asks for definitions.", weight: 3 },
      ],
    },
    {
      id: "the_casuist",
      name: "THE CASUIST",
      prompt: {
        who: "CASUIST",
        text: "I can argue either side. Both are correct. Both are wrong. Pick one and I will defeat it.",
      },
      options: [
        { label: "Pick the one you believe.", reply: "I believe the argument. Not the side.", weight: 3 },
        { label: "Then say nothing.", reply: "Silence is also a position.", weight: 2 },
        { label: "I withdraw the question.", reply: "...That was the only honest move.", weight: 3 },
      ],
    },
  ],

  operations: [
    {
      id: "argument",
      title: "Build an argument",
      prompt: { who: "?", text: "A scaffold of premises stands waiting. Which one carries the weight?" },
      options: [
        { label: "The clearest premise.", reply: "Clean. It holds.", weight: 3 },
        { label: "The boldest premise.", reply: "It sways. It may hold.", weight: 2 },
        { label: "The premise that flatters me.", reply: "It collapses on inspection.", weight: 1 },
      ],
      rewardStat: "clarity",
    },
    {
      id: "proof",
      title: "Walk the proof",
      prompt: { who: "?", text: "Each step must follow. Where do you stop?" },
      options: [
        { label: "When the proof completes.", reply: "Mercury smiles thinly.", weight: 3 },
        { label: "When the proof bores me.", reply: "A small failure. Common.", weight: 1 },
        { label: "Before I assume too much.", reply: "Honest. Rare.", weight: 3 },
      ],
      rewardStat: "clarity",
    },
    {
      id: "refutation",
      title: "Refute yourself",
      prompt: { who: "?", text: "Pick one of your own beliefs and tear it down." },
      options: [
        { label: "I refuse.", reply: "Then it owns you.", weight: 1 },
        { label: "I will tear it down.", reply: "Brave. You wobble afterward.", weight: 3 },
        { label: "I name the parts I am unsure of.", reply: "Wiser still.", weight: 3, conviction: "i_can_unknow" },
      ],
      rewardStat: "courage",
    },
    {
      id: "silence",
      title: "Sit in silence",
      prompt: { who: "?", text: "The argument stops. Can you stop with it?" },
      options: [
        { label: "Yes.", reply: "The Tower exhales.", weight: 3, conviction: "silence_is_an_answer" },
        { label: "I keep arguing in my head.", reply: "Mercury hears it. So do you.", weight: 1 },
        { label: "I name what I do not know.", reply: "That is the door.", weight: 3, conviction: "i_can_unknow" },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: {
      who: "HERMAIA",
      text: "What can you NAME that you do not understand?",
    },
    options: [
      { label: "My own grief.", reply: "Named. Held lightly.", weight: 3, conviction: "i_can_unknow" },
      { label: "The thing my parents withheld.", reply: "Named. Heavier.", weight: 3 },
      { label: "Why I keep returning here.", reply: "Mercury nods once.", weight: 3 },
      { label: "Nothing. I understand it all.", reply: "Then nothing has been named.", weight: 0 },
    ],
  },

  trialOpening: [
    { who: "HERMAIA", text: "I am the messenger. I name what passes through." },
    { who: "HERMAIA", text: "Three things will come. Name them, or let them keep their names." },
  ],

  trialRounds: [
    {
      prompt: { who: "HERMAIA", text: "A doubt arrives wearing your father's face. What is it?" },
      options: [
        { label: "Inheritance.", reply: "Named.", weight: 3 },
        { label: "Fear of repeating him.", reply: "Named, with care.", weight: 3 },
        { label: "I do not know.", reply: "Honest. Counted.", weight: 2 },
        { label: "It is just a doubt.", reply: "Then it stays unnamed.", weight: 1 },
      ],
    },
    {
      prompt: { who: "HERMAIA", text: "A certainty arrives wearing your own face. What is it?" },
      options: [
        { label: "A defense.", reply: "Named.", weight: 3 },
        { label: "A wish.", reply: "Named.", weight: 3 },
        { label: "The truth.", reply: "Maybe. Counted as one.", weight: 1 },
        { label: "I refuse to look.", reply: "It walks past, unmet.", weight: 0 },
      ],
    },
    {
      prompt: { who: "HERMAIA", text: "A silence arrives wearing no face at all. What is it?" },
      options: [
        { label: "What I have not said.", reply: "Named.", weight: 3 },
        { label: "What was never said to me.", reply: "Named.", weight: 3 },
        { label: "Rest.", reply: "Named, gently.", weight: 3 },
        { label: "An empty room.", reply: "Then nothing is named.", weight: 1 },
      ],
    },
  ],

  trialPass: [
    { who: "HERMAIA", text: "You named what you could. You let the rest pass." },
    { who: "HERMAIA", text: "Take the verb. NAME is yours now. Use it sparingly." },
    { who: "SORYN", text: "Mercury releases its garment. The Tower stops arguing for a moment." },
  ],

  trialFail: [
    { who: "HERMAIA", text: "You spoke much. You named little." },
    { who: "SORYN", text: "Sit with the operations again. Try again when you can." },
  ],

  inscription: "I CAN NAME WHAT I DO NOT KNOW",

  settleText: [
    "You stop here. The arguing is companion enough.",
    "Mercury keeps you. You keep being right. The Tower never closes.",
  ],
};
