import * as Phaser from "phaser";
import { GBC_W, GBC_H, COLOR, GBCText, drawGBCBox } from "../gbcArt";
import { writeSave } from "../save";
import type { SaveSlot } from "../types";
import { getAudio } from "../audio";
import { onActionDown, onDirection } from "../controls";

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
    source: "SORYN, AT THE THRESHOLD",
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
    source: "SORYN, OFFHAND",
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
};

/** Idempotently unlock a lore entry. Returns true if it was newly unlocked. */
export function unlockLore(save: SaveSlot, id: string): boolean {
  if (!LORE_ENTRIES[id]) return false;
  if (save.lore.includes(id)) return false;
  save.lore.push(id);
  writeSave(save);
  return true;
}

/**
 * Show a small "+ LORE: title" toast at the top-center of the screen.
 * Auto-dismisses. Safe to call from any scene.
 */
export function showLoreToast(scene: Phaser.Scene, id: string) {
  const e = LORE_ENTRIES[id];
  if (!e) return;
  const t = new GBCText(scene, GBC_W / 2 - 40, 26, `+ LORE: ${e.title}`, {
    color: COLOR.textGold,
    depth: 240,
    scrollFactor: 0,
  });
  scene.tweens.add({
    targets: t.obj,
    y: 16,
    alpha: 0,
    duration: 1800,
    delay: 600,
    onComplete: () => t.destroy(),
  });
  getAudio().sfx("confirm");
}

/**
 * Open a full-screen lore log overlay. Pauses input flow for the calling scene
 * (caller is responsible for guarding update with a flag during open).
 *
 * Navigation: UP/DOWN cycle entries, A/SPACE/ENTER closes. ESC also closes.
 */
export function openLoreLog(scene: Phaser.Scene, save: SaveSlot, onClose?: () => void) {
  const ids = save.lore.slice();
  const dim = scene.add
    .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.78)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(900);
  const box = drawGBCBox(scene, 6, 14, GBC_W - 12, GBC_H - 28, 901);
  const title = new GBCText(scene, 12, 18, "LORE LOG", {
    color: COLOR.textAccent,
    depth: 902,
    scrollFactor: 0,
  });
  const counter = new GBCText(scene, GBC_W - 40, 18, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  const srcText = new GBCText(scene, 12, 30, "", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });
  const body = new GBCText(scene, 12, 42, "", {
    color: COLOR.textLight,
    depth: 902,
    scrollFactor: 0,
    maxWidthPx: GBC_W - 24,
  });
  const hint = new GBCText(scene, 12, GBC_H - 20, "↑↓ NEXT  A CLOSE", {
    color: COLOR.textDim,
    depth: 902,
    scrollFactor: 0,
  });

  let idx = 0;
  const render = () => {
    if (ids.length === 0) {
      title.setText("LORE LOG");
      counter.setText("");
      srcText.setText("(EMPTY)");
      body.setText("WALK. TOUCH. LISTEN. THE WORLD WHISPERS.");
      return;
    }
    const e = LORE_ENTRIES[ids[idx]];
    if (!e) return;
    title.setText(e.title);
    counter.setText(`${idx + 1}/${ids.length}`);
    srcText.setText(e.source);
    body.setText(e.body.join(" "));
  };
  render();

  let unbindAction: (() => void) | null = null;
  let unbindCancel: (() => void) | null = null;
  let unbindSettings: (() => void) | null = null;
  let unbindDir: (() => void) | null = null;
  const cleanup = () => {
    unbindAction?.();
    unbindCancel?.();
    unbindSettings?.();
    unbindDir?.();
    scene.events.off("vinput-action", close);
    scene.events.off("vinput-cancel", close);
    dim.destroy();
    box.destroy();
    title.destroy();
    counter.destroy();
    srcText.destroy();
    body.destroy();
    hint.destroy();
    onClose?.();
  };
  const up = () => {
    if (ids.length === 0) return;
    idx = (idx - 1 + ids.length) % ids.length;
    render();
    getAudio().sfx("cursor");
  };
  const down = () => {
    if (ids.length === 0) return;
    idx = (idx + 1) % ids.length;
    render();
    getAudio().sfx("cursor");
  };
  const close = () => {
    getAudio().sfx("cancel");
    cleanup();
  };

  unbindAction = onActionDown(scene, "action", close);
  unbindCancel = onActionDown(scene, "cancel", close);
  unbindSettings = onActionDown(scene, "settings", close);
  unbindDir = onDirection(scene, (d) => {
    if (d === "up") up();
    else if (d === "down") down();
  });
  scene.events.on("vinput-action", close);
  scene.events.on("vinput-cancel", close);
}
