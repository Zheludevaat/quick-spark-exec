

# Act 1 Plateau — Souls, Famous Shades, and Side Quests

Populate the Imaginal Realm (pools / field / corridor) with named souls the player can address, witness, or remain with. Each soul is a vignette: a short dialog tree, a mechanical hook, and an optional side quest that expands the lore of the Plateau. Famous historical "shades" appear as cameo souls — fitted to the tone (melancholic-mythic, absurd underneath).

## Design pillars

1. **Every soul is a knot of a refusal or attachment.** Their arc resolves only when the player uses the right verb (OBSERVE / ADDRESS / REMEMBER / RELEASE / WITNESS).
2. **No combat. Only encounter.** Outcomes change stats, unlock lore, sometimes hand over a memory shard fragment.
3. **Famous shades are never named outright in dialog** — they're recognized by their hook. The lore log names them on unlock. (Tone preserved; nothing breaks the mythic register.)
4. **Side quests chain souls across regions.** Finishing one soul's arc activates a quest that points at another.

## The cast

`src/game/scenes/imaginal/souls.ts` already stubs 7 souls. Expand to 12 (4 per region + 1 "wandering echo" that appears in all). Famous shades marked **★**.

### Pools (the still water)
1. **Cartographer** — maps a country that does not exist. Arc: ADDRESS three times, then WITNESS to finish his last map.
2. **Weeping Twin** — weeps at her own reflection, then laughs. Arc: OBSERVE → REMEMBER → RELEASE.
3. **★ The Drowned Poet** *(Ophelia-coded; never named)* — recites a half-line of a song no one finished. Arc: REMEMBER the missing word (mini word-pick from 4 options).
4. **★ The Mirror Philosopher** *(Narcissus by way of Plotinus)* — insists the pool is the truer world. Arc: ADDRESS to argue, OBSERVE to agree, RELEASE to walk past. Each gives different lore.

### Field (the glitter)
5. **Collector** — jar of motes, eyes too bright. Arc: give him 3 echoes you've touched (consumes seedEcho count) → he gives you back a memory shard fragment.
6. **Sleeper** — won't wake. Arc: WITNESS only. Awards +1 compassion, unlocks lore "ON SLEEP."
7. **★ The Walking Saint** *(Simone Weil-coded)* — refuses every gift. Arc: try to OFFER motes 3 times (each refused with a different aphorism), then WITNESS unlocks her lore.
8. **★ The Composer** *(Beethoven-coded; deaf to the field's music)* — asks "is there a tune here?" Arc: complete a 4-tap rhythm mini (`rhythmTap`) → he hears it once → +1 clarity.

### Corridor (the lanterns)
9. **Crowned One** — already composed, faintly smug. (Existing — extend.) Arc: WITNESS unlocks the existing crown knot.
10. **Stonechild** — forgot his name. Arc: OBSERVE three lanterns nearby, each lights one syllable; ADDRESS him with the assembled name.
11. **★ The Lantern Mathematician** *(Pascal-coded)* — counting infinities by lamplight. Arc: pick the right answer from "ALL / NONE / BOTH / NEITHER" — only WITNESS reveals the right one is "NEITHER."
12. **★ The Weighed Heart** *(Egyptian psychostasia, anonymized as "ONE WHO CARRIED A FEATHER")* — asks you to hold a feather while she remembers. Arc: stand still for 8s without moving (existing input idle pattern from `miniEarth`). Awards a full memory shard.

### Wanderer
13. **Echo** *(already stubbed)* — appears in whichever region the player has visited least. Hook for NG+ continuity.

## Side quests (extend `sideQuests.ts`)

New IDs (added to the `SideQuestId` union and `SIDE_QUEST_TITLES`):

| ID | Trigger | Goal | Reward |
|---|---|---|---|
| `chart_the_pools` | Finish Cartographer arc | Visit all 3 pool soul positions | +1 clarity, lore `pools_geometry` |
| `feed_the_collector` | Talk to Collector | Bring 3 field echoes | 1 shard fragment |
| `name_the_stonechild` | Meet Stonechild | Find 3 syllable lanterns in corridor | Lore `on_naming`, +1 compassion |
| `the_unfinished_song` | Meet Drowned Poet | Find missing word (hidden on a pool tile) | Lore `unfinished_song` |
| `weigh_the_feather` | Meet Weighed Heart | Stand still 8s | Full memory shard + lore `the_scale` |
| `witness_the_saint` | Refuse Saint 3× | WITNESS her | Lore `refused_gifts`, unlocks Echo as a follower in NG+ |

Quests cross-link: finishing `feed_the_collector` reveals a hint pointing to `the_unfinished_song`, etc. — encoded as a `nextHint` field on each quest definition.

## Lore additions (`lore.ts`)

12 new entries, one per soul, plus 4 "world expansion" entries unlocked by quest chains:
- `on_the_plateau` — what the Plateau is (unlocked by completing any 2 souls).
- `on_the_imaginal` — Henry Corbin reference, anonymized.
- `on_the_shades` — why famous souls appear here ("FAME IS A LANTERN. THE PLATEAU NOTICES LANTERNS.").
- `on_witnessing` — meta-entry on the verb itself, unlocked once WITNESS is used 5 times in the realm.

## Mechanics layer

A new file `src/game/scenes/imaginal/soulRunner.ts` provides:

```ts
export type SoulArc = {
  id: SoulId;
  steps: SoulStep[];               // ordered; advance writes save.souls[id]
  onComplete: (scene, save) => void;
};
export type SoulStep =
  | { kind: "dialog"; lines: DialogLine[] }
  | { kind: "inquiry"; prompt; options: InquiryOption[]; advanceOn: InquiryChoice[] }
  | { kind: "rhythm"; bpm: number; beats: number }
  | { kind: "idle"; ms: number }
  | { kind: "witness" };           // requires save.verbs.witness

export function runSoul(scene, save, arc): Promise<void>;
```

This keeps each soul's data declarative. `ImaginalRealmScene` registers per-region soul sprites in `loadRegion` (using the existing `SOULS` array, expanded), wires `tryInteract` to call `runSoul` when Rowan is within ~16px of a soul, and respects `dialogActive`.

## Visual / placement

- Each soul renders as a small GBC-art figure (reuse existing palette + `gbcArt` helpers; one 8×12 sprite per archetype, recolored).
- Hover halo (alpha pulse) when player is within range — same pattern as `seedEchoMote.halo`.
- Floating name + hook text appears once Rowan is within 24px (matches existing knot focus).
- Famous shades get a single-frame "tell" (Composer holds a stylized score, Mathematician a lantern, etc.) — built from existing rect/text primitives, no new asset pipeline.

## Files to add / change

**New**
- `src/game/scenes/imaginal/soulRunner.ts` — declarative arc runner.
- `src/game/scenes/imaginal/soulArcs.ts` — the 12 `SoulArc` definitions.
- `src/game/scenes/imaginal/soulSprites.ts` — small GBC-art renderer per soul archetype.

**Edit**
- `src/game/scenes/imaginal/souls.ts` — expand `SOULS` to 12, extend `SoulId` union.
- `src/game/sideQuests.ts` — add 6 new quest IDs + titles + `nextHint` field.
- `src/game/scenes/lore.ts` — add 16 entries (12 souls + 4 world-expansion).
- `src/game/scenes/ImaginalRealmScene.ts` — `loadRegion` spawns souls; `tryInteract` routes to `runSoul`; quest activation hooks.
- `src/game/types.ts` — `souls` map already exists; no schema change needed (arc step is just a number).

## Implementation order (one PR per step is fine)

1. Expand `souls.ts` registry + add `soulSprites.ts` so figures render in each region (no behavior yet — pure visual pass to verify placement).
2. Build `soulRunner.ts` with the 5 step kinds; wire `tryInteract` proximity check.
3. Author the 12 arcs in `soulArcs.ts` (data only; reuses existing `runDialog` / `runInquiry` / `rhythmTap`).
4. Add the 6 side quests + `nextHint` chain in `sideQuests.ts`.
5. Add 16 lore entries; trigger unlocks at the right arc steps.
6. Polish: hover halos, "tell" props for famous shades, Echo NG+ follower.
7. Tone pass on every dialog line — keep the absurd-comic underside (Saint refuses gifts with a different polite excuse each time; Mathematician's "neither" lands as a punchline).

## Tone guardrails

- Famous shades: **never named.** The lore log names them on unlock — that's the reveal.
- Every soul has at least one dryly funny line. The Plateau is sad; the souls are not solemn.
- No soul "fails" the player. Wrong-verb branches give different lore, never a game-over.

## Risks

- Scope: 12 souls × ~6 lines each = ~72 dialog lines + 6 quest chains. Authoring is the bottleneck, not engineering.
- `ImaginalRealmScene` is already large; the runner + arcs files keep it from growing further.
- Famous-shade recognizability has to land via hook + lore text alone — no portraits. Acceptable; matches existing aesthetic.

