import type { SaveSlot } from "../types";

export type Phase = "composed" | "fractured" | "exposed" | "released";
export type EndingTier = "ascent" | "gold" | "silver" | "iron" | "brittle";
export type SorynEvent =
  | "enter"
  | "phase1_hit"
  | "phase2_hit"
  | "phase3_hit"
  | "ascend"
  | "victory";

const stoneTotal = (s: SaveSlot) =>
  s.blackStones + s.whiteStones + s.yellowStones + s.redStones;

/** Opening whisper — surfaces the inscription if present. */
export function openingWhisper(save: SaveSlot): string {
  const ins = save.act2Inscription?.trim();
  if (ins) return `"${ins.toUpperCase()}" — the sentence walks beside you.`;
  if (save.sorynReleased) return "You return alone. The corridor knows your step.";
  return "You return. The image is waiting where you left it.";
}

/** Phase taunt — driven by stains/convictions/wedding type. */
export function phaseTaunt(phase: Phase, save: SaveSlot): string {
  const stains = save.stainsCarried;
  const convictionCount = Object.values(save.convictions).filter(Boolean).length;

  if (phase === "composed") {
    if (stains >= 3)
      return "You carry stains and still come for me? ADDRESS, then. Name what you brought.";
    if (convictionCount >= 3)
      return "You have convictions now. Speak them at me. ADDRESS three times.";
    return "I am the version of you that smiles for cameras. ADDRESS me three times.";
  }
  if (phase === "fractured") {
    return "I am cracked. The pieces are faces you sat with. OBSERVE the brightest.";
  }
  if (phase === "exposed") {
    if (save.weddingType === "fractured")
      return "Your union broke. So can mine. WITNESS once, then RELEASE.";
    if (save.weddingType === "gentle")
      return "Two WITNESSES, one ADDRESS. You learned how to be soft.";
    return "I have nothing left. WITNESS three times. Stand and see me.";
  }
  return "Silence. Then warmth.";
}

/** ADDRESS reply — names a conviction if any are owned, varied per hit. */
export function addressReply(save: SaveSlot, hit: number): string {
  const owned = Object.entries(save.convictions)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, " ").toUpperCase());
  const base = [
    "The smile loosens. One layer of polish drops.",
    "The pose softens. Another layer goes.",
    "The mask falls. Cracks open across the surface.",
  ];
  const line = base[Math.min(hit - 1, 2)];
  if (owned.length === 0) return line;
  // Cycle through convictions; if only one is owned, vary the verb instead.
  if (owned.length === 1) {
    const verbs = ["You name it", "You speak it", "You hold it up"];
    return `${line} ${verbs[(hit - 1) % verbs.length]}: ${owned[0]}.`;
  }
  const c = owned[(hit - 1) % owned.length];
  return `${line} You name it: ${c}.`;
}

/** Phase-3 verb plan keyed to wedding type. */
export function phase3Plan(save: SaveSlot): {
  witnesses: number;
  needs: { witness: number; address: number; release: number };
  label: string;
} {
  if (save.weddingType === "fractured")
    return {
      witnesses: 1,
      needs: { witness: 1, address: 0, release: 1 },
      label: "WITNESS x1, RELEASE x1",
    };
  if (save.weddingType === "gentle")
    return {
      witnesses: 2,
      needs: { witness: 2, address: 1, release: 0 },
      label: "WITNESS x2, ADDRESS x1",
    };
  return {
    witnesses: 3,
    needs: { witness: 3, address: 0, release: 0 },
    label: "WITNESS x3",
  };
}

/** Ending tier from stones + goldStone. */
export function endingTier(save: SaveSlot): EndingTier {
  if (save.flags.act3_ascended) return "ascent";
  const total = stoneTotal(save);
  if (save.goldStone && total >= 8) return "gold";
  if (total >= 6) return "silver";
  if (total >= 3) return "iron";
  return "brittle";
}

/** 2–4 paragraphs for the epilogue, per tier + per-color color commentary. */
export function endingParagraphs(save: SaveSlot): string[] {
  const tier = endingTier(save);
  const out: string[] = [];
  const ins = save.act2Inscription?.trim();

  if (tier === "ascent") {
    out.push("WHITE. THEN NOTHING. THEN WARMTH WITHOUT EDGES.");
    if (ins) out.push(`THE SENTENCE STAYS: "${ins.toUpperCase()}"`);
    return out;
  }

  // Per-color quiet lines
  if (save.blackStones > 0) out.push("THE BLACK STONE IS HEAVY. YOU CARRY IT WELL.");
  if (save.whiteStones > 0) out.push("THE WHITE STONE HUMS WHEN YOU BREATHE.");
  if (save.yellowStones > 0) out.push("THE YELLOW STONE WARMS YOUR POCKET.");
  if (save.redStones > 0) out.push("THE RED STONE BEATS, QUIETLY, AGAINST YOUR HIP.");

  if (tier === "gold") out.push("GOLD WITHIN — AND THE WORLD IS STILL THE WORLD.");
  else if (tier === "silver") out.push("SILVERED, NOT SOLVED. ENOUGH FOR TODAY.");
  else if (tier === "iron") out.push("YOU CARRIED WHAT YOU COULD. THAT IS NOT NOTHING.");
  else out.push("BRITTLE BUT HERE. THE SHARDS WILL TEACH YOU NEXT TIME.");

  if (ins) out.push(`THE SENTENCE RETURNS: "${ins.toUpperCase()}"`);
  return out;
}

/** Soryn bark — null when released (caller shows narrator instead). */
export function sorynBark(save: SaveSlot, event: SorynEvent): string | null {
  if (save.sorynReleased) return null;
  const log = save.soulEventLog ?? [];
  const lastSoul = log[log.length - 1] ?? "";
  switch (event) {
    case "enter":
      return "Soryn: 'I'll stand at your shoulder. I won't speak for you.'";
    case "phase1_hit":
      return "Soryn: 'Each name is a key. Keep turning.'";
    case "phase2_hit":
      return lastSoul
        ? `Soryn: 'You sat with them. The face you see now is theirs and yours.'`
        : "Soryn: 'A face you remember. Let it be lit.'";
    case "phase3_hit":
      return "Soryn: 'You don't have to fix it. Just see it.'";
    case "ascend":
      return "Soryn: 'Then go. I will not follow where I am not needed.'";
    case "victory":
      return "Soryn: 'There. That's the work.'";
  }
}

/** Narrator counterpart used when Soryn is released. */
export function narratorLine(event: SorynEvent): string {
  switch (event) {
    case "enter":
      return "The corridor is quiet. You are the only voice you brought.";
    case "phase1_hit":
      return "A name lands. The room holds it for you.";
    case "phase2_hit":
      return "A face you sat with lights up from inside.";
    case "phase3_hit":
      return "You stand. That is enough.";
    case "ascend":
      return "The white opens. You step into it without ceremony.";
    case "victory":
      return "It is finished. Quietly. The way real things end.";
  }
}
