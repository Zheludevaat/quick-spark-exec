export type LoreEntry = {
  id: string;
  title: string;
  /** Source line, like "POSTCARD ON THE DESK" or "MARGIN NOTE". */
  source: string;
  /** Body lines (already uppercase-friendly). */
  body: string[];
};

/**
 * The lore log. Keep entries terse — GBC dialog box can render only ~3 short lines.
 * Tone: melancholic-mythic with absurd edges. Plotinus by way of a thrift-store paperback.
 */
export const LORE_ENTRIES: Record<string, LoreEntry> = {
  // ===== Act 0 — Last Day =====
  postcard_seaside: {
    id: "postcard_seaside",
    title: "A POSTCARD",
    source: "POSTCARD ON THE DESK",
    body: [
      "WISH YOU WERE HERE.",
      "ACTUALLY I DON'T. THE GULLS ARE LOUD AND",
      "I'VE STARTED TALKING TO THEM. — D.",
    ],
  },
  margin_plotinus: {
    id: "margin_plotinus",
    title: "MARGIN NOTE",
    source: "INSIDE A SECOND-HAND BOOK",
    body: [
      '"WITHDRAW INTO YOURSELF AND LOOK."',
      "SOMEONE CIRCLED THIS IN PENCIL AND WROTE:",
      '"OK BUT WHEN."',
    ],
  },
  // ===== Act 0 — Crossing =====
  refusal_kitchen: {
    id: "refusal_kitchen",
    title: "DOOR I — KITCHEN",
    source: "REFUSAL DOOR",
    body: [
      "THE KETTLE STILL WHISTLING. TWO CUPS.",
      "ONE OF THEM IS YOURS. YOU CAN'T REMEMBER",
      "WHICH. IT FEELS IMPORTANT TO REMEMBER.",
    ],
  },
  refusal_phone: {
    id: "refusal_phone",
    title: "DOOR II — PHONE",
    source: "REFUSAL DOOR",
    body: [
      "MARA IS LEAVING A VOICEMAIL.",
      "SHE SAYS YOUR NAME LIKE A QUESTION.",
      "YOU LISTEN UNTIL THE BEEP. THEN AGAIN.",
    ],
  },
  refusal_window: {
    id: "refusal_window",
    title: "DOOR III — WINDOW",
    source: "REFUSAL DOOR",
    body: [
      "THE CHILD ACROSS THE STREET HAS GROWN.",
      "STILL WAVING. AT NO ONE NOW.",
      "OR AT EVERYONE. IT'S HARD TO TELL FROM HERE.",
    ],
  },
  wanderer_brief: {
    id: "wanderer_brief",
    title: "THE OTHER WALKER",
    source: "MET IN THE CROSSING",
    body: [
      "A SHAPE WALKING THE OTHER WAY.",
      '"YOU\'RE THE SECOND ONE TODAY," IT SAID.',
      "IT DID NOT CLARIFY THE FIRST.",
    ],
  },
  // ===== Act 1 — Silver Threshold =====
  silver_air: {
    id: "silver_air",
    title: "WHAT AIR ASKED",
    source: "GUARDIAN OF AIR",
    body: [
      "EVERY BREATH YOU HELD.",
      "EVERY WAVE YOU DID NOT RETURN.",
      "AIR REMEMBERS. AIR FORGIVES SLOWLY.",
    ],
  },
  silver_fire: {
    id: "silver_fire",
    title: "WHAT FIRE ASKED",
    source: "GUARDIAN OF FIRE",
    body: [
      "THE COURAGE YOU SPENT ON SMALL ANGERS.",
      "THE BRIDGES BURNED FROM A POLITE DISTANCE.",
      "FIRE DOES NOT MIND. FIRE NEVER MINDED.",
    ],
  },
  silver_water: {
    id: "silver_water",
    title: "WHAT WATER ASKED",
    source: "GUARDIAN OF WATER",
    body: [
      "WHICH REFLECTION DID YOU KEEP?",
      "THE TRUE ONE OR THE BRIGHT ONE?",
      "WATER WILL HOLD EITHER. WATER IS PATIENT.",
    ],
  },
  silver_earth: {
    id: "silver_earth",
    title: "WHAT EARTH ASKED",
    source: "GUARDIAN OF EARTH",
    body: [
      "YOU WALKED THE CIRCLE.",
      "YOU DID NOT ASK WHY THE CIRCLE.",
      "EARTH PREFERS YOU THAT WAY.",
    ],
  },
  daimon_binding: {
    id: "daimon_binding",
    title: "ON DAIMONS",
    source: "SOPHENE, AT THE THRESHOLD",
    body: [
      "A DAIMON IS NOT A GUIDE.",
      "A DAIMON IS THE PART OF YOU",
      "THAT KNEW BEFORE THE REST CAUGHT UP.",
    ],
  },
  // ===== Act 2 — Imaginal Realm =====
  imaginal_pools: {
    id: "imaginal_pools",
    title: "THE REFLECTING POOLS",
    source: "FIRST KNOT",
    body: [
      "THE POOLS DO NOT SHOW YOUR FACE.",
      "THEY SHOW THE FACE YOU WORE",
      "THE LAST TIME YOU WERE HONEST.",
    ],
  },
  imaginal_field: {
    id: "imaginal_field",
    title: "THE GLITTER FIELD",
    source: "SECOND KNOT",
    body: [
      "FRAGMENTS OF AFTERNOONS.",
      "EACH ONE WAS A WHOLE LIFE",
      "FOR SOMEONE STANDING SOMEWHERE.",
    ],
  },
  imaginal_corridor: {
    id: "imaginal_corridor",
    title: "THE LANTERN CORRIDOR",
    source: "THIRD KNOT",
    body: [
      "THE LIGHTS DOWN HERE LIE KINDLY.",
      "THE TRICK IS NOT TO BELIEVE THEM.",
      "THE TRICK IS NOT TO THANK THEM EITHER.",
    ],
  },
  crown_witnessed: {
    id: "crown_witnessed",
    title: "THE PAPER CROWN",
    source: "OPTIONAL KNOT — WITNESSED",
    body: [
      "THE SELF YOU WISHED YOU WERE.",
      "PAPER, AS IT TURNED OUT.",
      "YOU WITNESSED IT. IT THANKED YOU.",
    ],
  },
  // ===== Act 3 — Curated Self & Epilogue =====
  curated_self: {
    id: "curated_self",
    title: "THE CURATED SELF",
    source: "THIRD SPHERE",
    body: [
      "THE PERSON YOU PERFORMED TO STAY ALIVE.",
      "THE PERSON OTHERS NEEDED YOU TO BE.",
      "NOT A LIE. NOT THE WHOLE TRUTH EITHER.",
    ],
  },
  shards_assembled: {
    id: "shards_assembled",
    title: "ON THE SHARDS",
    source: "ASSEMBLED FROM FRAGMENTS",
    body: [
      "FOUR FRAGMENTS BECOME ONE SHARD.",
      "ENOUGH SHARDS BECOME A MIRROR.",
      "ENOUGH MIRRORS BECOME A WINDOW.",
    ],
  },
  epilogue_walk: {
    id: "epilogue_walk",
    title: "THE WALK AGAIN",
    source: "EPILOGUE",
    body: [
      "YOU CAN WALK IT AGAIN.",
      "IT WILL NOT BE THE SAME WALK.",
      "IT WAS NEVER THE SAME WALK.",
    ],
  },

  // ===== Act 1 — Plateau Souls (revealed by completing arcs) =====
  soul_cartographer: {
    id: "soul_cartographer",
    title: "THE CARTOGRAPHER",
    source: "POOLS — SOUL ARC",
    body: [
      "HE MAPPED A COUNTRY THAT WAS NOT THERE.",
      "HE FINISHED IT WHEN A WALKER STAYED.",
      "THE LAST RIVER WAS A QUESTION MARK.",
    ],
  },
  soul_weeping_twin: {
    id: "soul_weeping_twin",
    title: "THE WEEPING TWIN",
    source: "POOLS — SOUL ARC",
    body: [
      "SHE WEPT AT HER REFLECTION.",
      "THE REFLECTION WEPT BACK, SLIGHTLY LATE.",
      "NEITHER REMEMBERED WHICH WAS FIRST.",
    ],
  },
  soul_drowned_poet: {
    id: "soul_drowned_poet",
    title: "OPHELIA",
    source: "POOLS — SOUL ARC (NAMED)",
    body: [
      '"PANSIES, THAT\'S FOR THOUGHTS."',
      "SHE FORGOT THE WORD. THE WATER FORGOT.",
      "A WALKER REMEMBERED. SHE COULD STOP.",
    ],
  },
  soul_mirror_philosopher: {
    id: "soul_mirror_philosopher",
    title: "NARCISSUS, READING PLOTINUS",
    source: "POOLS — SOUL ARC (NAMED)",
    body: [
      "HE INSISTED THE POOL WAS THE TRUER WORLD.",
      "HE WAS HALF RIGHT, WHICH IS THE WORST",
      "AMOUNT OF RIGHT TO BE.",
    ],
  },
  soul_collector: {
    id: "soul_collector",
    title: "THE COLLECTOR",
    source: "FIELD — SOUL ARC",
    body: [
      "JAR OF MOTES. EYES TOO BRIGHT.",
      "HE TRADES YOU A FRAGMENT FOR THREE.",
      "THE JAR IS NEVER QUITE FULL.",
    ],
  },
  soul_sleeper: {
    id: "soul_sleeper",
    title: "ON SLEEP",
    source: "FIELD — SOUL ARC",
    body: [
      "HE WILL NOT WAKE.",
      "HE WAS NEVER GOING TO.",
      "BEING SEEN, IT TURNED OUT, WAS ENOUGH.",
    ],
  },
  soul_walking_saint: {
    id: "soul_walking_saint",
    title: "SIMONE",
    source: "FIELD — SOUL ARC (NAMED)",
    body: [
      "SHE REFUSED EVERY GIFT, KINDLY.",
      '"AFFLICTION IS THE ONLY HONEST',
      'POSSESSION." SHE THANKED YOU FOR STAYING.',
    ],
  },
  soul_composer: {
    id: "soul_composer",
    title: "LUDWIG, LATE",
    source: "FIELD — SOUL ARC (NAMED)",
    body: [
      "HE COULD NOT HEAR THE FIELD'S MUSIC.",
      "A WALKER TAPPED IT FOR HIM.",
      "HE HEARD IT ONCE. THAT WAS ENOUGH.",
    ],
  },
  soul_crowned_one: {
    id: "soul_crowned_one",
    title: "THE CROWNED ONE",
    source: "CORRIDOR — SOUL ARC",
    body: [
      "ALREADY COMPOSED. FAINTLY SMUG.",
      "THE CROWN WAS PAPER ALL ALONG.",
      "PAPER FELT LIGHTER ONCE WITNESSED.",
    ],
  },
  soul_stonechild: {
    id: "soul_stonechild",
    title: "ON NAMING",
    source: "CORRIDOR — SOUL ARC",
    body: [
      "HE FORGOT HIS NAME.",
      "THREE LANTERNS HELD ITS SYLLABLES.",
      "ELIAS. HE THANKED YOU. HE WAITED WELL.",
    ],
  },
  soul_lantern_mathematician: {
    id: "soul_lantern_mathematician",
    title: "PASCAL, COUNTING",
    source: "CORRIDOR — SOUL ARC (NAMED)",
    body: [
      "HE COUNTED INFINITIES BY LAMPLIGHT.",
      "ALL. NONE. BOTH. NEITHER.",
      "THE QUESTION WAS THE LANTERN.",
    ],
  },
  soul_weighed_heart: {
    id: "soul_weighed_heart",
    title: "MA'AT'S FEATHER",
    source: "CORRIDOR — SOUL ARC (NAMED)",
    body: [
      "SHE ASKED YOU TO HOLD A FEATHER.",
      "YOU STOOD STILL. THE WEIGHT DID NOT CHANGE.",
      "SHE FEARED IT WOULD. IT NEVER DID.",
    ],
  },
  soul_echo: {
    id: "soul_echo",
    title: "THE WANDERER",
    source: "ANY REGION — SOUL ARC",
    body: [
      "A FAINT VERSION OF SOMEONE.",
      "POSSIBLY YOU. POSSIBLY EARLIER.",
      "WE NOT-KNEW TOGETHER. IT HELPED.",
    ],
  },

  // ===== Act 1 — World Expansion (unlocked by quest chains) =====
  on_the_plateau: {
    id: "on_the_plateau",
    title: "ON THE PLATEAU",
    source: "GATHERED FROM TWO SOULS",
    body: [
      "THE PLATEAU IS NOT A PLACE.",
      "IT IS WHAT WAITING LOOKS LIKE",
      "WHEN THE WAITER FORGETS WHY.",
    ],
  },
  on_the_imaginal: {
    id: "on_the_imaginal",
    title: "ON THE IMAGINAL",
    source: "MARGIN OF A LATE BOOK",
    body: [
      "BETWEEN SENSE AND IDEA.",
      "NOT IMAGINARY. NOT LITERAL.",
      "A REALER THIRD COUNTRY. — H.C.",
    ],
  },
  on_the_shades: {
    id: "on_the_shades",
    title: "ON THE SHADES",
    source: "SOPHENE, OFFHAND",
    body: [
      "FAME IS A LANTERN.",
      "THE PLATEAU NOTICES LANTERNS.",
      "THE LANTERN-HOLDER, RARELY, NOTICES BACK.",
    ],
  },
  on_witnessing: {
    id: "on_witnessing",
    title: "ON WITNESSING",
    source: "EARNED BY THE VERB",
    body: [
      "TO STAND AND SEE WITHOUT FLINCHING.",
      "TO ADD NOTHING. TO TAKE NOTHING.",
      "THE HARDEST KINDNESS. ALSO THE LIGHTEST.",
    ],
  },

  // ===== Act 1 — Variant soul endings =====
  soul_cartographer_incomplete: {
    id: "soul_cartographer_incomplete",
    title: "THE UNFINISHED MAP",
    source: "POOLS — VARIANT",
    body: ["YOU LEFT BEFORE THE LAST BEND.", "HE KEPT DRAWING. POLITELY.", "THE COUNTRY WAITS."],
  },
  soul_weeping_twin_early: {
    id: "soul_weeping_twin_early",
    title: "WALKED PAST",
    source: "POOLS — VARIANT",
    body: ["YOU DID NOT STAY.", "SHE LAUGHED ANYWAY. HICCUP-LAUGHED.", "SOMETIMES THAT IS ENOUGH."],
  },
  soul_weeping_twin_stayed: {
    id: "soul_weeping_twin_stayed",
    title: "TWICE-SEEN",
    source: "POOLS — VARIANT",
    body: ["YOU STAYED. THE REFLECTION STAYED.", "TWO WITNESSES TO ONE GRIEF.", "IT BECAME LIGHTER."],
  },
  soul_drowned_poet_guessed: {
    id: "soul_drowned_poet_guessed",
    title: "THE NEAR WORD",
    source: "POOLS — VARIANT",
    body: ["YOU GUESSED. CLOSE. NOT THE WORD.", "THE SONG STILL HALF-SUNG.", "SHE WILL TRY YOU AGAIN."],
  },
  soul_drowned_poet_honest: {
    id: "soul_drowned_poet_honest",
    title: "EVEN, IN NOT-KNOWING",
    source: "POOLS — VARIANT",
    body: ["YOU SAID I DON'T KNOW.", "THE WATER ALSO DID NOT.", "TWO HONEST FORGETTINGS."],
  },
  soul_mirror_philosopher_argued: {
    id: "soul_mirror_philosopher_argued",
    title: "REVISED",
    source: "POOLS — VARIANT (ARGUED)",
    body: ["YOU ARGUED. HE LISTENED.", "HE HAS BEGUN A NEW THEORY.", "FEWER POOLS IN IT."],
  },
  soul_mirror_philosopher_agreed: {
    id: "soul_mirror_philosopher_agreed",
    title: "POLITELY DECLINED",
    source: "POOLS — VARIANT (AGREED)",
    body: ["YOU AGREED. HE INVITED YOU IN.", "YOU DID NOT ENTER. HE NOTICED.", "TRUTH IS FOR THE BRAVE."],
  },
  soul_collector_refused: {
    id: "soul_collector_refused",
    title: "THE EMPTY JAR",
    source: "FIELD — VARIANT",
    body: ["YOU KEPT YOUR ECHOES.", "HE NODDED. THE JAR REMAINED.", "MOTES ARE NOT FOR JARS, REALLY."],
  },
  soul_collector_deferred: {
    id: "soul_collector_deferred",
    title: "NOT YET",
    source: "FIELD — VARIANT",
    body: ["YOU HAD TOO FEW TO GIVE.", "HE SENT YOU TO TOUCH MORE.", "THE FIELD IS PATIENT."],
  },
  soul_walking_saint_forced: {
    id: "soul_walking_saint_forced",
    title: "THE FORCED GIFT",
    source: "FIELD — VARIANT (NAMED)",
    body: ["YOU PRESSED THE MOTE INTO HER HAND.", "SHE TOOK IT. WALKED OFF SHAKING.", "KINDNESS IS NOT A WEAPON."],
  },
  soul_walking_saint_left: {
    id: "soul_walking_saint_left",
    title: "WALKED ON",
    source: "FIELD — VARIANT",
    body: ["YOU DIDN'T OFFER. SHE NODDED.", '"YES. WALK ON. DON\'T STAY FOR ME."', "THE FIELD KEPT ITS SHAPE."],
  },
  soul_composer_tried: {
    id: "soul_composer_tried",
    title: "ALMOST",
    source: "FIELD — VARIANT",
    body: ["CLOSER THAN YESTERDAY.", "HE WILL WAIT FOR QUIETER HANDS.", "THE TUNE IS STILL ALMOST."],
  },
  soul_stonechild_waited: {
    id: "soul_stonechild_waited",
    title: "WAITING TOGETHER",
    source: "CORRIDOR — VARIANT",
    body: ["YOU FORGOT, TOO.", "YOU WAITED TOGETHER. THAT WAS ENOUGH.", "TWO PEOPLE, ONE NAME, NEITHER HAS IT."],
  },
  soul_stonechild_deferred: {
    id: "soul_stonechild_deferred",
    title: "THE NAME KEEPS",
    source: "CORRIDOR — VARIANT",
    body: ["YOU SAID ANOTHER TIME.", "HE SAID OF COURSE.", "A NAME KEEPS. APPARENTLY."],
  },
  soul_lantern_mathematician_wrong: {
    id: "soul_lantern_mathematician_wrong",
    title: "THE WRONG LANTERN",
    source: "CORRIDOR — VARIANT (NAMED)",
    body: ["YOU PICKED ONE. IT DIMMED.", "HE NODDED, WROTE IT DOWN.", "WRONG ANSWERS ARE STILL ANSWERS."],
  },
  soul_weighed_heart_tried: {
    id: "soul_weighed_heart_tried",
    title: "THE FEATHER, TIPPED",
    source: "CORRIDOR — VARIANT (NAMED)",
    body: ["YOU MOVED. THE WEIGHT TIPPED.", "SHE SAID IT WAS ALL RIGHT.", "COME BACK HEAVIER."],
  },

  // ===== ACT II — THE GREAT WORK =====
  on_the_athanor: {
    id: "on_the_athanor",
    title: "ON THE ATHANOR",
    source: "ACT II",
    body: [
      "THE VESSEL THAT WILL NOT BREAK",
      "WHAT IT TRANSMUTES.",
      "EVERY KITCHEN IS ONE, IN MINIATURE.",
    ],
  },
  on_nigredo: {
    id: "on_nigredo",
    title: "ON THE BLACKENING",
    source: "ACT II — NIGREDO",
    body: [
      "FIRST THE MATTER MUST ROT.",
      "THEN THE SHAME MUST BE SAT WITH.",
      "ONLY THEN CAN ANYTHING BEGIN.",
    ],
  },
  on_the_shadow: {
    id: "on_the_shadow",
    title: "ON THE SHADE",
    source: "ACT II — NIGREDO",
    body: [
      "WHAT YOU REFUSED TO LOOK AT",
      "DID NOT LEAVE.",
      "IT WAITED FOR THE FURNACE.",
    ],
  },
  on_dissolving: {
    id: "on_dissolving",
    title: "ON DISSOLVING",
    source: "ACT II — NIGREDO",
    body: [
      "YOU LOSE THE NAMED THING",
      "TO GAIN THE BLACK STONE.",
      "THE TRADE IS REAL.",
    ],
  },
  on_albedo: {
    id: "on_albedo",
    title: "ON THE WHITENING",
    source: "ACT II — ALBEDO",
    body: [
      "WATER. SALT. MOON.",
      "EACH BEAT A FORGIVENESS.",
      "MOSTLY OF YOURSELF.",
    ],
  },
  on_forgiveness: {
    id: "on_forgiveness",
    title: "ON FORGIVENESS",
    source: "ACT II — ALBEDO",
    body: [
      "NOT THE ERASURE OF DEBT.",
      "THE CHOICE TO STOP COLLECTING.",
    ],
  },
  on_the_moon_again: {
    id: "on_the_moon_again",
    title: "ON THE MOON AGAIN",
    source: "ACT II — ALBEDO",
    body: [
      "SHE WATCHED YOU IN THE PLATEAU.",
      "NOW SHE WASHES YOU.",
      "SHE IS NOT KIND. SHE IS COOL.",
    ],
  },
  on_citrinitas: {
    id: "on_citrinitas",
    title: "ON THE YELLOWING",
    source: "ACT II — CITRINITAS",
    body: [
      "GOLD-LIGHT FALLS ON DUST.",
      "THE TRUTH IS WHAT YOU LET STAY.",
      "EVERYTHING ELSE WAS A ROOM.",
    ],
  },
  on_conviction: {
    id: "on_conviction",
    title: "ON CONVICTION",
    source: "ACT II — CITRINITAS",
    body: [
      "TO ACCEPT A TRUTH ABOUT YOURSELF",
      "IS TO STOP NEGOTIATING WITH IT.",
    ],
  },
  on_the_torn_teacher: {
    id: "on_the_torn_teacher",
    title: "ON THE TEACHER WHO WAS TORN",
    source: "ACT II — HIDDEN",
    body: [
      "SHE TAUGHT MATHEMATICS AND ASTRONOMY.",
      "A CROWD KILLED HER FOR IT.",
      "SHE LEFT YOU A SENTENCE.",
    ],
  },
  on_rubedo: {
    id: "on_rubedo",
    title: "ON THE REDDENING",
    source: "ACT II — RUBEDO",
    body: [
      "OPPOSITES ARE WED.",
      "THE WEDDING IS NEVER QUITE EVEN.",
      "THAT IS HOW YOU KNOW IT IS REAL.",
    ],
  },
  on_the_wedding: {
    id: "on_the_wedding",
    title: "ON THE WEDDING",
    source: "ACT II — RUBEDO",
    body: [
      "STRONG, GENTLE, OR FRACTURED.",
      "ALL THREE ARE MARRIAGES.",
      "ALL THREE ARE WORK.",
    ],
  },
  on_releasing_the_daimon: {
    id: "on_releasing_the_daimon",
    title: "ON RELEASING THE DAIMON",
    source: "ACT II — VARIANT",
    body: [
      "YOU SAID THANK YOU. GO HOME.",
      "SHE BECAME A WISP.",
      "THE REST IS YOURS.",
    ],
  },
  on_the_thirteenth: {
    id: "on_the_thirteenth",
    title: "ON THE THIRTEENTH",
    source: "ACT II — HIDDEN",
    body: [
      "THE GUEST WITH NO FACE.",
      "THEY CAME BECAUSE YOU FINISHED EVERY ARC.",
      "THEY LEFT A GOLD STONE.",
    ],
  },
  on_the_sealed_vessel: {
    id: "on_the_sealed_vessel",
    title: "ON THE SEALED VESSEL",
    source: "ACT II — CODA",
    body: [
      "BLACK, WHITE, YELLOW, RED — IN LAYERS.",
      "ONE SENTENCE INSCRIBED.",
      "THE WORK CARRIES YOU NOW.",
    ],
  },
  on_the_inquisitor: {
    id: "on_the_inquisitor",
    title: "ON THE INQUISITOR",
    source: "ACT II — HIDDEN",
    body: [
      "HE WAS NEVER A STRANGER.",
      "YOU APPOINTED HIM. YEARS AGO.",
      "HE CAN BE DISMISSED THE SAME WAY.",
    ],
  },
  on_the_bride_sang: {
    id: "on_the_bride_sang",
    title: "THE BRIDE SANG",
    source: "ACT II — VARIANT",
    body: [
      "SHE STOOD IN THE BATH AND FINISHED THE SONG.",
      "PANSIES ARE FOR THOUGHTS, SHE SAID.",
      "THE WATER REMEMBERED ALL OF IT.",
    ],
  },
  on_the_fourth_book: {
    id: "on_the_fourth_book",
    title: "THE FOURTH BOOK",
    source: "ACT II — HIDDEN",
    body: [
      "ON HER LEAVING. TORN FROM A LONGER VOLUME.",
      "THE LIBRARIAN HAD HIDDEN IT BEHIND THE OTHERS.",
      "SHE WAS NOT WRONG TO HIDE IT. ONLY TO LIE.",
    ],
  },
  on_walking_alone: {
    id: "on_walking_alone",
    title: "WALKING ALONE",
    source: "ACT II — VARIANT",
    body: [
      "YOU SAID THANK YOU AND GO HOME.",
      "SHE BECAME A WISP. THE ROOM HELD ITS BREATH.",
      "ALONE IS A WAY OF BEING ACCOMPANIED.",
    ],
  },
  on_salvage: {
    id: "on_salvage",
    title: "WHAT THE WATER GAVE BACK",
    source: "ACT II — VARIANT",
    body: [
      "A SHARD YOU LET BURN HAS COME BACK WET.",
      "THE BATH-KEEPER DOES NOT EXPLAIN.",
      "TAKE IT. APOLOGIES ARE NOT ALWAYS SPOKEN.",
    ],
  },

  // ===== Act 3 — The Return =====
  on_the_return: {
    id: "on_the_return",
    title: "ON THE RETURN",
    source: "ACT III — INSCRIPTION",
    body: [
      "THE WORK IS NOT THE GOLD.",
      "THE WORK IS WALKING BACK CARRYING IT,",
      "AND HANDING IT TO THE PERSON WHO LEFT.",
    ],
  },
  on_the_ascent: {
    id: "on_the_ascent",
    title: "ON THE ASCENT",
    source: "ACT III — HIDDEN",
    body: [
      "THE GOLDEN ROAD IS SHORT.",
      "IT TRADES THE LONG SEEING FOR A WHITE DOOR.",
      "BOTH ARE REAL. NEITHER IS FREE.",
    ],
  },
  on_the_inscription_returns: {
    id: "on_the_inscription_returns",
    title: "THE SENTENCE RETURNS",
    source: "ACT III — EPILOGUE",
    body: [
      "THE SENTENCE YOU SEALED WALKS BACK INTO YOU.",
      "IT WAS NEVER A LESSON. IT WAS A KEY.",
      "YOU UNLOCK YOURSELF WITH IT.",
    ],
  },
};
