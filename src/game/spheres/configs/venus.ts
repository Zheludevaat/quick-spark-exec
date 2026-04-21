/**
 * Venus — the Eternal Biennale.
 *
 * Governor: KYPRIA. Verb: ATTUNE.
 * Theme: longing, recognition, imitation, release. Souls who curated their
 * lives for the gaze of others, or who could not bear to be seen at all.
 * The trial asks whether you can attune to a beauty that does not need you
 * to perform it.
 */
import type { SphereConfig } from "../types";

export const venusConfig: SphereConfig = {
  id: "venus",
  label: "VENUS",
  governor: "KYPRIA",
  verb: "attune",
  bg: "#1a0a14",
  accent: 0xe89bb8,
  plateauScene: "VenusPlateau",
  trialScene: "VenusTrial",

  opening: [
    { who: "SORYN", text: "Venus. The Eternal Biennale." },
    { who: "SORYN", text: "Every wall is a mirror that loves you back. Don't believe it." },
    { who: "?", text: "Three figures pose under copper light. None of them blink." },
  ],

  souls: [
    {
      id: "the_curator",
      name: "THE CURATOR",
      prompt: {
        who: "CURATOR",
        text: "I arranged my life so the lighting would always flatter. Look — even now.",
      },
      options: [
        {
          label: "Who was the show for?",
          reply: "...A version of me that never came.",
          weight: 3,
          conviction: "i_was_the_audience",
        },
        { label: "It is beautiful.", reply: "Yes. And empty. Both true.", weight: 2 },
        {
          label: "Step out of the frame.",
          reply: "If I do, what is left?",
          weight: 3,
          conviction: "i_can_be_unseen",
        },
      ],
    },
    {
      id: "the_critic",
      name: "THE CRITIC",
      prompt: {
        who: "CRITIC",
        text: "Nothing here is good enough. Including me. Especially me.",
      },
      options: [
        {
          label: "What would 'enough' look like?",
          reply: "...I never let myself imagine it.",
          weight: 3,
        },
        { label: "Then stop looking.", reply: "I do not know how.", weight: 2 },
        {
          label: "Be the critic of your kindness instead.",
          reply: "Oh. That hurts more.",
          weight: 3,
          conviction: "softness_is_not_failure",
        },
      ],
    },
    {
      id: "the_beloved",
      name: "THE BELOVED",
      prompt: {
        who: "BELOVED",
        text: "I was loved beautifully. I do not know if I was ever known.",
      },
      options: [
        {
          label: "Did you let yourself be known?",
          reply: "...Less than I let myself be loved.",
          weight: 3,
          conviction: "i_can_be_unseen",
        },
        { label: "Loved is something.", reply: "Something. Not enough.", weight: 2 },
        {
          label: "Show me the unloved part.",
          reply: "...You would be the first to ask.",
          weight: 3,
        },
      ],
    },
  ],

  operations: [
    {
      id: "longing",
      title: "Sit with the longing",
      prompt: { who: "?", text: "A soft ache opens. You can name it or perform it." },
      options: [
        { label: "Name it. Quietly.", reply: "It thins to something you can hold.", weight: 3 },
        { label: "Perform it. Loudly.", reply: "It grows louder. It does not soften.", weight: 1 },
        {
          label: "Let it pass through.",
          reply: "It leaves a clean room behind.",
          weight: 3,
          conviction: "longing_is_not_lack",
        },
      ],
      rewardStat: "compassion",
    },
    {
      id: "recognition",
      title: "Recognise a face",
      prompt: { who: "?", text: "A stranger meets your eye. They look like someone you loved." },
      options: [
        { label: "Greet the stranger.", reply: "They greet you back. Cleanly.", weight: 3 },
        { label: "Greet the memory.", reply: "The stranger looks confused. So do you.", weight: 1 },
        {
          label: "Hold both at once.",
          reply: "Hard. Honest. Counted.",
          weight: 3,
          conviction: "two_things_can_be_true",
        },
      ],
      rewardStat: "clarity",
    },
    {
      id: "imitation",
      title: "Refuse a borrowed posture",
      prompt: { who: "?", text: "Your shoulders find a pose that is not yours. Whose was it?" },
      options: [
        {
          label: "My mother's. I let it go.",
          reply: "Released, with thanks.",
          weight: 3,
          conviction: "i_am_not_the_pose",
        },
        { label: "It feels like mine now.", reply: "It fits. It is still borrowed.", weight: 1 },
        { label: "Try a posture of my own.", reply: "Wobbly. Truer.", weight: 3 },
      ],
      rewardStat: "courage",
    },
    {
      id: "release",
      title: "Release the audience",
      prompt: { who: "?", text: "You realise no one is watching. What changes?" },
      options: [
        {
          label: "I keep performing anyway.",
          reply: "Old grooves. Common.",
          weight: 1,
        },
        {
          label: "I sit down.",
          reply: "The hall sighs. So do you.",
          weight: 3,
          conviction: "i_can_be_unseen",
        },
        {
          label: "I move how I like.",
          reply: "Awkward. Real. Counted.",
          weight: 3,
        },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: {
      who: "KYPRIA",
      text: "What beauty can you ATTUNE to that does not need your gaze?",
    },
    options: [
      {
        label: "A morning that no one saw.",
        reply: "Yes. That counts.",
        weight: 3,
        conviction: "longing_is_not_lack",
      },
      {
        label: "A grief I never made into art.",
        reply: "Yes. That too.",
        weight: 3,
      },
      {
        label: "A love that did not need me to be lovely.",
        reply: "Kypria softens.",
        weight: 3,
        conviction: "softness_is_not_failure",
      },
      {
        label: "Only what others called beautiful.",
        reply: "Then nothing is yours yet.",
        weight: 0,
      },
    ],
  },

  trialOpening: [
    { who: "KYPRIA", text: "I am the recognised. I am also the one who recognises." },
    { who: "KYPRIA", text: "Three offerings. Attune, or perform. I will know which." },
  ],

  trialRounds: [
    {
      prompt: { who: "KYPRIA", text: "A beauty arrives that asks nothing of you. What do you do?" },
      options: [
        { label: "Receive it in silence.", reply: "Attuned.", weight: 3 },
        { label: "Praise it well.", reply: "Praise is also distance. Counted.", weight: 1 },
        { label: "Match its quiet.", reply: "Attuned, gently.", weight: 3 },
        { label: "Photograph it.", reply: "Captured. Not attuned.", weight: 0 },
      ],
    },
    {
      prompt: { who: "KYPRIA", text: "A beloved arrives who does not recognise you. What do you do?" },
      options: [
        { label: "Greet them anyway.", reply: "Attuned.", weight: 3 },
        { label: "Demand to be remembered.", reply: "The room cools.", weight: 0 },
        { label: "Stay nearby. Quietly.", reply: "Attuned, with grief.", weight: 3 },
        { label: "Walk past.", reply: "Honest. Counted.", weight: 2 },
      ],
    },
    {
      prompt: { who: "KYPRIA", text: "An ugliness arrives that is your own. What do you do?" },
      options: [
        { label: "Look at it.", reply: "Attuned.", weight: 3 },
        { label: "Frame it as art.", reply: "Performance. Counted as one.", weight: 1 },
        { label: "Sit beside it.", reply: "Attuned, with kindness.", weight: 3 },
        { label: "Turn away.", reply: "It will follow you.", weight: 0 },
      ],
    },
  ],

  trialPass: [
    { who: "KYPRIA", text: "You attuned without performing. You received without consuming." },
    { who: "KYPRIA", text: "Take the verb. ATTUNE is yours. Use it before you speak." },
    { who: "SORYN", text: "Venus releases its garment. The Biennale dims, and the room is just a room." },
  ],

  trialFail: [
    { who: "KYPRIA", text: "You performed where attuning was asked. The hall heard you." },
    { who: "SORYN", text: "Sit with the operations again. Try again when the audience is gone." },
  ],

  inscription: "I CAN BE BEAUTIFUL UNSEEN",

  settleText: [
    "You stop here. The light is always flattering. You stay lit.",
    "Venus keeps you. The Biennale never closes. Neither do you.",
  ],
};
