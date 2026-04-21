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
    { who: "SORYN", text: "Every thought here arrives with a knife and a thesis. Try not to hug either." },
    { who: "?", text: "Three voices in three corners, each winning magnificently against an audience that does not exist." },
  ],

  souls: [
    {
      id: "the_defender",
      name: "THE DEFENDER",
      prompt: { who: "DEFENDER", text: "I was right. Repeatedly. It was less nourishing than advertised." },
      options: [
        { id: "defender_happy_right", label: "Were you happy being right?", reply: "Happy? No. Triumphant for six seconds, perhaps. Then lonely again.", weight: 3, conviction: "rightness_is_lonely" },
        { id: "defender_show_argument", label: "Show me the argument.", reply: "Gladly. It has excellent bones and a smell nobody mentions.", weight: 1 },
        { id: "defender_what_cost", label: "What did it cost?", reply: "Everyone worth defeating. Which turned out, awkwardly, to be everyone worth having.", weight: 3, conviction: "rightness_is_lonely" },
      ],
    },
    {
      id: "the_pedant",
      name: "THE PEDANT",
      prompt: { who: "PEDANT", text: "Define your terms. Then define the definition. Your first attempt was sentimental." },
      options: [
        { id: "pedant_cannot_define", label: "I cannot define it.", reply: "Excellent. At last, a perimeter. Most people call the fog itself knowledge.", weight: 3 },
        { id: "pedant_definitions_cage", label: "Definitions are a cage.", reply: "So are skeletons. You seem grateful for yours.", weight: 2 },
        { id: "pedant_define_yourself", label: "Try defining yourself.", reply: "...Anxious apparatus for distinguishing one thing from another. It is not glamorous.", weight: 3 },
      ],
    },
    {
      id: "the_casuist",
      name: "THE CASUIST",
      prompt: { who: "CASUIST", text: "I can argue either side. It saves time. Developing a soul takes longer." },
      options: [
        { id: "casuist_pick_believe", label: "Pick the one you believe.", reply: "Believe? I believe in leverage. Belief is what spectators call leverage when it flatters them.", weight: 3 },
        { id: "casuist_say_nothing", label: "Then say nothing.", reply: "Silence is only noble when it is not hiding from cross-examination.", weight: 2 },
        { id: "casuist_withdraw", label: "I withdraw the question.", reply: "...Filthy move. Honest, but filthy. I respect it.", weight: 3 },
      ],
    },
  ],

  operations: [
    {
      id: "argument",
      title: "Build an argument",
      prompt: { who: "?", text: "A scaffold of premises waits politely. Only one of them can bear the roof." },
      options: [
        { id: "argument_clearest", label: "The clearest premise.", reply: "Clean enough to survive daylight. Rare in this tower.", weight: 3 },
        { id: "argument_boldest", label: "The boldest premise.", reply: "Magnificent posture. Dubious knees.", weight: 2 },
        { id: "argument_flatters", label: "The premise that flatters me.", reply: "A beloved classic: structurally unsound, emotionally popular.", weight: 1 },
      ],
      rewardStat: "clarity",
    },
    {
      id: "proof",
      title: "Walk the proof",
      prompt: { who: "?", text: "Each step must follow. The stairs dislike improvisation." },
      options: [
        { id: "proof_completes", label: "When the proof completes.", reply: "Good. Completion is not truth, but it is at least a shape.", weight: 3 },
        { id: "proof_bores", label: "When the proof bores me.", reply: "Boredom is sometimes a sign of depth, and more often a sign of vanity.", weight: 1 },
        { id: "proof_assume_too_much", label: "Before I assume too much.", reply: "Suspicion directed inward. Expensive, but useful.", weight: 3 },
      ],
      rewardStat: "clarity",
    },
    {
      id: "refutation",
      title: "Refute yourself",
      prompt: { who: "?", text: "Take one of your cherished beliefs apart. Use the sharp tools." },
      options: [
        { id: "refutation_refuse", label: "I refuse.", reply: "Then it is no longer a belief. It is a landlord.", weight: 1 },
        { id: "refutation_tear_down", label: "I will tear it down.", reply: "Messy. Excellent. The collapse teaches what the architecture concealed.", weight: 3 },
        { id: "refutation_name_unsure", label: "I name the parts I am unsure of.", reply: "Even better. Ruin with labels is halfway to wisdom.", weight: 3, conviction: "i_can_unknow" },
      ],
      rewardStat: "courage",
    },
    {
      id: "silence",
      title: "Sit in silence",
      prompt: { who: "?", text: "The argument stops speaking aloud. It continues, of course, in smaller rooms." },
      options: [
        { id: "silence_yes", label: "Yes.", reply: "There. For one breath, your mind behaves like weather instead of parliament.", weight: 3, conviction: "silence_is_an_answer" },
        { id: "silence_keep_arguing", label: "I keep arguing in my head.", reply: "Naturally. The loudest courtroom is usually private.", weight: 1 },
        { id: "silence_name_unknown", label: "I name what I do not know.", reply: "That is not failure. That is a doorway with proper signage.", weight: 3, conviction: "i_can_unknow" },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: { who: "HERMAIA", text: "What can you NAME without pretending to own it?" },
    options: [
      { id: "crack_own_grief", label: "My own grief.", reply: "Better. Grief hates being solved and tolerates being named.", weight: 3, conviction: "i_can_unknow" },
      { id: "crack_parents_withheld", label: "The thing my parents withheld.", reply: "Heavier. Still nameable. Not therefore finished.", weight: 3 },
      { id: "crack_keep_returning", label: "Why I keep returning here.", reply: "Ah. Recurrence. The sincerest form of unfinished business.", weight: 3 },
      { id: "crack_understand_all", label: "Nothing. I understand it all.", reply: "Then you have mistaken a closed fist for an open mind.", weight: 0 },
    ],
  },

  trialOpening: [
    { who: "HERMAIA", text: "I am the messenger. I name what passes through without insisting it belongs to me." },
    { who: "HERMAIA", text: "Three things arrive wearing borrowed faces. Name them well, or flatter them badly. I will notice." },
  ],

  trialRounds: [
    {
      prompt: { who: "HERMAIA", text: "A doubt arrives wearing your father's face. What is it?" },
      options: [
        { id: "trial_father_inheritance", label: "Inheritance.", reply: "Named. A useful beginning, though inheritance always brings accomplices.", weight: 3 },
        { id: "trial_father_fear_repeat", label: "Fear of repeating him.", reply: "Named, with more courage than certainty. Good.", weight: 3 },
        { id: "trial_father_dont_know", label: "I do not know.", reply: "Honest. Ignorance properly declared is cleaner than counterfeit knowledge.", weight: 2 },
        { id: "trial_father_just_doubt", label: "It is just a doubt.", reply: "Then it keeps its mask and keeps its rent-free room in you.", weight: 1 },
      ],
    },
    {
      prompt: { who: "HERMAIA", text: "A certainty arrives wearing your own face. What is it?" },
      options: [
        { id: "trial_self_defense", label: "A defense.", reply: "Named. Most certainties are bodyguards hired by frightened children.", weight: 3 },
        { id: "trial_self_wish", label: "A wish.", reply: "Named. Wishes dressed as axioms are common here.", weight: 3 },
        { id: "trial_self_truth", label: "The truth.", reply: "Maybe. Truth seldom introduces itself quite so confidently.", weight: 1 },
        { id: "trial_self_refuse", label: "I refuse to look.", reply: "Then it continues using your face without permission.", weight: 0 },
      ],
    },
    {
      prompt: { who: "HERMAIA", text: "A silence arrives wearing no face at all. What is it?" },
      options: [
        { id: "trial_silence_unsaid", label: "What I have not said.", reply: "Named. Unsurprising, but necessary.", weight: 3 },
        { id: "trial_silence_never_to_me", label: "What was never said to me.", reply: "Named. Absence can bruise as neatly as speech.", weight: 3 },
        { id: "trial_silence_rest", label: "Rest.", reply: "Named gently. A rare courtesy in this tower.", weight: 3 },
        { id: "trial_silence_empty", label: "An empty room.", reply: "Then you have called the room empty because you feared what might answer.", weight: 1 },
      ],
    },
  ],

  trialPass: [
    { who: "HERMAIA", text: "You named what yielded to naming, and you stopped where naming would have become theft." },
    { who: "HERMAIA", text: "Take the verb. NAME is yours now. Spend it like medicine, not decoration." },
    { who: "SORYN", text: "Mercury releases its garment. For one held breath, the Tower mistakes honesty for peace." },
  ],

  trialFail: [
    { who: "HERMAIA", text: "You supplied many words and very little naming. It happens. Language is cheap and glittery." },
    { who: "SORYN", text: "Sit with the operations again. Return when the cleverness has eaten less of the truth." },
  ],

  inscription: "I CAN NAME WHAT I DO NOT KNOW",

  settleText: [
    "You stop here. The arguments keep you company and never once ask whether they are welcome.",
    "Mercury keeps you. You remain brilliantly unconvinced by everyone except yourself.",
  ],
};
