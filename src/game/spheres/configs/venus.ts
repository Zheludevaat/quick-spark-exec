/**
 * Venus — the Eternal Biennale.
 *
 * Governor: KYPRIA. Verb: ATTUNE.
 * Theme: longing, recognition, imitation, release.
 *
 * NOTE: For Venus, the bespoke VenusPlateauScene/VenusTrialScene now drive
 * the in-world chapter. This config still seeds the writing (NPC dialogue
 * options, trial round texts, opening/closing lines, inscription, settle).
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
  trialPassThreshold: 7,

  opening: [
    { who: "SORYN", text: "Venus. The Eternal Biennale." },
    { who: "SORYN", text: "Every wall is a mirror with excellent taste and terrible judgment." },
    { who: "?", text: "Three figures pose under copper light, each hoping to be mistaken for revelation and at least two of them overcommitting." },
  ],

  souls: [
    {
      id: "the_curator",
      name: "THE CURATOR",
      prompt: { who: "CURATOR", text: "I arranged my life for flattering light. Tragedy entered anyway, horribly underlit." },
      options: [
        { id: "curator_show_for", label: "Who was the show for?", reply: "...A version of me I kept expecting to arrive and thank me properly.", weight: 3, conviction: "i_was_the_audience" },
        { id: "curator_beautiful_empty", label: "It is beautiful.", reply: "Yes. Beauty is perfectly capable of being empty. It does not even break a sweat.", weight: 2 },
        { id: "curator_step_out", label: "Step out of the frame.", reply: "And be merely alive? You ask a savage thing with a kind voice.", weight: 3, conviction: "i_can_be_unseen" },
      ],
    },
    {
      id: "the_critic",
      name: "THE CRITIC",
      prompt: { who: "CRITIC", text: "Nothing here is good enough. This includes the art, the room, the weather, and with some emphasis myself." },
      options: [
        { id: "critic_what_enough", label: "What would 'enough' look like?", reply: "...I never let myself picture it. Standards are easier when they remain abstract and tyrannical.", weight: 3 },
        { id: "critic_stop_looking", label: "Then stop looking.", reply: "And lose my profession? No, I mean my personality.", weight: 2 },
        { id: "critic_critic_kindness", label: "Be the critic of your kindness instead.", reply: "Cruel suggestion. Brilliant. I hate it immediately.", weight: 3, conviction: "softness_is_not_failure" },
      ],
    },
    {
      id: "the_beloved",
      name: "THE BELOVED",
      prompt: { who: "BELOVED", text: "I was loved exquisitely. I remain unconvinced I was ever known at conversational distance." },
      options: [
        { id: "beloved_let_known", label: "Did you let yourself be known?", reply: "...Less than I let myself be admired. Admiration is easier on the nerves.", weight: 3, conviction: "i_can_be_unseen" },
        { id: "beloved_loved_something", label: "Loved is something.", reply: "Yes. A beautiful something. Also an insufficient one.", weight: 2 },
        { id: "beloved_show_unloved", label: "Show me the unloved part.", reply: "...That request alone makes you more dangerous than praise.", weight: 3 },
      ],
    },
  ],

  operations: [
    {
      id: "longing",
      title: "Sit with the longing",
      prompt: { who: "?", text: "A soft ache opens. You may feel it, perform it, or decorate it until nobody can tell the difference." },
      options: [
        { id: "longing_name_quietly", label: "Name it. Quietly.", reply: "Good. Longing shrinks when it is not forced to audition.", weight: 3 },
        { id: "longing_perform_loudly", label: "Perform it. Loudly.", reply: "Magnificent. Unhelpful. The ache applauds and grows larger.", weight: 1 },
        { id: "longing_let_pass_through", label: "Let it pass through.", reply: "Better. Desire is not always a referendum on your incompleteness.", weight: 3, conviction: "longing_is_not_lack" },
      ],
      rewardStat: "compassion",
    },
    {
      id: "recognition",
      title: "Recognise a face",
      prompt: { who: "?", text: "A stranger meets your eye and resembles someone you once mistook for destiny." },
      options: [
        { id: "recognition_greet_stranger", label: "Greet the stranger.", reply: "Clean. The present likes being addressed in its own name.", weight: 3 },
        { id: "recognition_greet_memory", label: "Greet the memory.", reply: "The stranger is baffled. The memory, of course, is thrilled.", weight: 1 },
        { id: "recognition_hold_both", label: "Hold both at once.", reply: "Difficult. Honest. The heart dislikes filing systems, but they help.", weight: 3, conviction: "two_things_can_be_true" },
      ],
      rewardStat: "clarity",
    },
    {
      id: "imitation",
      title: "Refuse a borrowed posture",
      prompt: { who: "?", text: "Your body finds a pose that was once useful to someone else. It fits too well." },
      options: [
        { id: "imitation_mothers_let_go", label: "My mother's. I let it go.", reply: "Released with more gratitude than drama. Excellent.", weight: 3, conviction: "i_am_not_the_pose" },
        { id: "imitation_feels_mine", label: "It feels like mine now.", reply: "Of course. Borrowed costumes are most dangerous once they become comfortable.", weight: 1 },
        { id: "imitation_try_own", label: "Try a posture of my own.", reply: "Ungainly. True. Most living things begin there.", weight: 3 },
      ],
      rewardStat: "courage",
    },
    {
      id: "release",
      title: "Release the audience",
      prompt: { who: "?", text: "You realise nobody is watching. This should be freedom. It often feels more like vertigo." },
      options: [
        { id: "release_keep_performing", label: "I keep performing anyway.", reply: "Naturally. Habit is applause remembered by the muscles.", weight: 1 },
        { id: "release_sit_down", label: "I sit down.", reply: "Good. Rest is one of the few acts impossible to fake for long.", weight: 3, conviction: "i_can_be_unseen" },
        { id: "release_move_how_i_like", label: "I move how I like.", reply: "Awkward. Private. Beautiful for precisely those reasons.", weight: 3 },
      ],
      rewardStat: "compassion",
    },
  ],

  crackingQuestion: {
    prompt: { who: "KYPRIA", text: "What beauty can you ATTUNE to without trying to own the moment it touches you?" },
    options: [
      { id: "crack_morning_unseen", label: "A morning that no one saw.", reply: "Yes. Beauty survives perfectly well without witnesses, which is rude and wonderful.", weight: 3, conviction: "longing_is_not_lack" },
      { id: "crack_grief_not_art", label: "A grief I never made into art.", reply: "Yes. Not every wound must become an exhibit to count as real.", weight: 3 },
      { id: "crack_love_not_need_lovely", label: "A love that did not need me to be lovely.", reply: "Ah. There it is. The room stops preening for a moment.", weight: 3, conviction: "softness_is_not_failure" },
      { id: "crack_only_others_called_beautiful", label: "Only what others called beautiful.", reply: "Then your gaze is still renting itself out.", weight: 0 },
    ],
  },

  trialOpening: [
    { who: "KYPRIA", text: "I am the recognised, and also the one who recognises without swallowing what I see." },
    { who: "KYPRIA", text: "Three offerings. Attune, or perform. The difference is small in posture and enormous in consequence." },
  ],

  trialRounds: [
    {
      prompt: { who: "KYPRIA", text: "A beauty arrives that asks nothing of you. What do you do?" },
      options: [
        { id: "trial_beauty_receive_silence", label: "Receive it in silence.", reply: "Attuned. You let it exist without making it report to you.", weight: 3 },
        { id: "trial_beauty_praise_it", label: "Praise it well.", reply: "Pleasant. Also a little defensive. Counted.", weight: 1 },
        { id: "trial_beauty_match_its_quiet", label: "Match its quiet.", reply: "Attuned, gently. Vanity hates quiet. That is one reason to trust it.", weight: 3 },
        { id: "trial_beauty_photograph_it", label: "Photograph it.", reply: "Captured, yes. Attuned, no. A cage can be elegant.", weight: 0 },
      ],
    },
    {
      prompt: { who: "KYPRIA", text: "A beloved arrives who does not recognise you. What do you do?" },
      options: [
        { id: "trial_beloved_greet_anyway", label: "Greet them anyway.", reply: "Attuned. Love without witness still counts, infuriatingly.", weight: 3 },
        { id: "trial_beloved_demand_memory", label: "Demand to be remembered.", reply: "The room cools. Need makes a poor curator.", weight: 0 },
        { id: "trial_beloved_stay_nearby", label: "Stay nearby. Quietly.", reply: "Attuned, with grief. Some truths are tender and humiliating together.", weight: 3 },
        { id: "trial_beloved_walk_past", label: "Walk past.", reply: "Honest. Counted. Dignity is not always warmth.", weight: 2 },
      ],
    },
    {
      prompt: { who: "KYPRIA", text: "An ugliness arrives that is your own. What do you do?" },
      options: [
        { id: "trial_ugliness_look_at_it", label: "Look at it.", reply: "Attuned. The face remains yours even when it disappoints you.", weight: 3 },
        { id: "trial_ugliness_frame_as_art", label: "Frame it as art.", reply: "Stylish. Evasive. The oldest trick in this building.", weight: 1 },
        { id: "trial_ugliness_sit_beside_it", label: "Sit beside it.", reply: "Attuned, with kindness. Rare. Almost alarming.", weight: 3 },
        { id: "trial_ugliness_turn_away", label: "Turn away.", reply: "It follows, because of course it does. It learned that from you.", weight: 0 },
      ],
    },
  ],

  trialPass: [
    { who: "KYPRIA", text: "You attuned without devouring. You received without turning reception into theatre." },
    { who: "KYPRIA", text: "Take the verb. ATTUNE is yours. Use it before admiration has time to put on a costume." },
    { who: "SORYN", text: "Venus releases its garment. The Biennale dims, and for one rare moment the room risks becoming a room." },
  ],

  trialFail: [
    { who: "KYPRIA", text: "You performed where attuning was asked. It happens. Vanity is quicker than reverence. It usually is." },
    { who: "SORYN", text: "Sit with the operations again. Return when the audience has become less interesting than the thing itself." },
  ],

  inscription: "I CAN BE BEAUTIFUL UNSEEN",

  settleText: [
    "You stop here. The light remains flattering and therefore suspicious.",
    "Venus keeps you. The exhibition never closes, and neither does the part of you still waiting to be correctly seen.",
  ],
};
