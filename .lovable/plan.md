# Act I — Imaginal Realm: Deepening, Expansion, Refinement

## Audit Summary (Act 0 — clean ✅)
- Flow: Title → LastDay → Crossing → SilverThreshold → ImaginalRealm works end-to-end.
- Skin shedding + soul transformation persist correctly (resume re-applies).
- Daimon binding + companion spawn (Imaginal only) per spec.
- **Fixed in this pass**: `miniFire` had a `hasDispatched` API bug + double-fire risk on safety timer — guarded with `done` flag.
- No other issues found. Act 0 is shippable.

---

## Act I Vision

Today the Imaginal Realm is a thin first plateau: 3 mirrors → 1 boss. Brief's promise: *"thought as landscape; thoughtforms made visible; the mirror that lies kindly."* It must feel like a **layered psychic ecology**, not a mirror room.

The Realm becomes a small hub-zone with **3 sub-regions**, **5 mirror-knots** (was 3), a **companion-driven exploration loop**, **seed-callbacks** that visibly bend dialogue, and a **redesigned Curated Self** boss with proper phase transitions.

---

## Structure: Three Sub-Regions of the Realm

The current single map splits into three connected screens, traversable via `gbcWipe` transitions:

### 1. **The Reflecting Pools** (entry — soft)
- Tutorial sub-region. Where Soryn teaches WITNESS.
- 2 mirror-knots: `reflection` (mimic), `echo` (your-voice-back).
- Pools of standing silver-water on the floor; Rowan's reflection trails him.
- 1 hidden Memory Shard fragment (4 = 1 shard, consistent with Threshold).

### 2. **The Glittering Field** (middle — strange)
- An open field of suspended afternoon-light; time feels paused.
- 2 mirror-knots: `glitter` (fragment of memory), **NEW** `lantern` (a comforting lie).
- New mechanic: **Seed-Echoes** — interactive motes scattered through the field that, when touched, briefly speak back a Last Day seed in the *guardian's* voice (e.g. "Mara called, she still calls"). Each seed-echo touched = +1 shard fragment, max 4 here.
- 1 hidden lore stone: a fragment of pre-life Rowan history.

### 3. **The Quiet Corridor** (exit — narrowing)
- A long thin hallway leading south to the Curated Self boss arena.
- 1 mirror-knot: **NEW** `crown` (the self you wished you were).
- Soryn stops at the threshold, says her farewell line, becomes invisible (companion `setVisible(false)`).
- Door to the Curated Self only opens when **4 of 5 mirrors cleared** (was 3/3) — `crown` is optional but gives a Witness bonus.

---

## Mirror-Knot Redesign (5 knots, distinct mechanics)

Each mirror-knot now launches a tailored micro-encounter, not the generic Encounter scene. Encounter scene stays for the boss only.

| Knot | Sub-region | Required verb | Mechanic |
|---|---|---|---|
| **reflection** (mimic) | Pools | OBSERVE | Mirror copies Rowan's movement on a 1s delay; you must stand still until it overlaps you, then OBSERVE. |
| **echo** (your-voice-back) | Pools | ADDRESS | A garbled phrase plays; pick the original sentence from 4 Inquiry Wheel options. |
| **glitter** (memory-shard) | Field | REMEMBER | A 4-tile drag-puzzle: re-order fragments of an afternoon. |
| **lantern** (comforting lie) | Field | RELEASE | Holds out something Rowan wants — a job offer, a kind word, a "you did your best." Player must RELEASE; OBSERVE/ADDRESS make the lantern brighter and the encounter harder. |
| **crown** (wished-self) | Corridor | WITNESS | Optional. Shows an idealized Rowan in robes. WITNESS dissolves it; any other verb feeds it. Reward: +2 Clarity, unlocks dialogue option in Epilogue. |

Each cleared knot calls back **at least one** Last Day seed in the post-clear Soryn line (e.g. echo-clear references Mara if `seed_call` was set; glitter-clear references the kettle).

---

## Companion Deepening

Soryn currently follows + has a B-key panel. Additions:
- **Per-region context**: `getContext` lambda already exists; expand to 3 region-specific banks of 6+ lines each, with a small chance of pulling a *seed-aware* line.
- **Soryn-points-the-way**: when player is idle 8s and there's an uncleared knot, Soryn drifts toward it briefly, then returns. Pure visual nudge.
- **Daimon Mark**: a small constellation glyph in the HUD top-right showing the bond-type chosen at Threshold (`accept` / `question` / `refuse` / `listen`). Carries forward to all later Acts.
- **Plateau hide**: extend `setVisible(false)` to also disable the B-key handler during boss + sphere tests.

---

## Curated Self Boss — 3-Phase Redesign

Currently a 4-step word-loop. Expanded to 3 named phases with distinct mechanics, all using the existing Encounter scene's command grid:

### Phase 1 — **Composed** (the polished image)
- Boss appears as a flawless idealized Rowan, smiling.
- Weakness: ADDRESS. 3 hits. Each hit cracks a layer of the polish.
- Each correct hit: boss line drops one step toward honesty. Each wrong hit: boss "compliments" Rowan back, +1 fake-compassion banner.

### Phase 2 — **Fractured** (the truth leaking)
- Boss splits into 3 small fragments orbiting a center.
- Player must OBSERVE each in turn. Order matters: the fragment glowing brightest is the next target.
- Wrong target: fragments re-merge briefly (lose ~5s of progress, no HP penalty).

### Phase 3 — **Exposed** (raw, asking)
- Boss becomes a soft kneeling figure, no taunts, just questions.
- Only WITNESS works. The command list visibly greys out everything else.
- WITNESS once: boss thanks Rowan. Twice: boss asks "Will you remember me kindly?" Third WITNESS: boss dissolves into a Memory Shard.
- **Refuse path** (still available): "Stay here. The image is comfortable" — still triggers Plateau-Remain ending, but only offered AFTER reaching Phase 3 (was offered at start; that was too easy).

---

## Save / Type Changes

`src/game/types.ts`:
- Add `region: "pools" | "field" | "corridor" | null` to track current Realm sub-region.
- Add `seedEchoes: Record<string, boolean>` for the field motes.
- `verbs` already has `witness`; no schema change needed for the boss.
- Migration: existing Imaginal saves get `region: "pools"` on load.

---

## File Plan

**New:**
- `src/game/scenes/imaginal/PoolsScene.ts`
- `src/game/scenes/imaginal/FieldScene.ts`
- `src/game/scenes/imaginal/CorridorScene.ts`
- `src/game/scenes/imaginal/knots.ts` — shared knot-encounter helpers (5 mechanics)
- `src/game/scenes/imaginal/sharedHud.ts` — Daimon Mark glyph render

**Edited:**
- `src/game/scenes/ImaginalRealmScene.ts` → becomes a thin **router**: reads `save.region`, starts the right sub-scene. Companion lives at the router level so it persists across sub-region transitions.
- `src/game/scenes/CuratedSelfScene.ts` — 3-phase rewrite, Plateau-Remain moved to Phase 3.
- `src/game/scenes/EncounterScene.ts` — boss mode flag; conditional command greying for Phase 3.
- `src/game/createGame.ts` — register new sub-scenes.
- `src/game/types.ts` + `src/game/save.ts` — region + seedEchoes + migration.
- `src/game/gbcArt.ts` — ~10 new tiles: pool, field-grass, corridor-floor, lantern, crown, mark glyph.
- `src/game/audio.ts` — `SONG_POOLS`, `SONG_FIELD`, `SONG_CORRIDOR` (variants of moon theme).

**Refactor:** the current `ImaginalRealmScene.ts` is 316 lines and growing — splitting it across 3 sub-scenes + router fixes that.

---

## Build Order (one phase, ship in this order)

1. **Types + region + migration** — non-breaking foundation.
2. **Sub-scene router refactor** — split current Imaginal into Pools (with the existing 2 knots), wire transitions.
3. **Move companion to router-scope** — verify it persists and hides correctly at boss.
4. **Build FieldScene** — 2 knots + seed-echo motes.
5. **Build CorridorScene** — 1 knot + Soryn farewell + boss door gate.
6. **Build per-knot mechanics** (5 distinct micro-encounters in `knots.ts`).
7. **Curated Self 3-phase redesign + Plateau-Remain reposition.**
8. **Daimon Mark HUD glyph.**
9. **3 new music variants + new tiles.**
10. **End-to-end QA pass.**

---

## Open Decisions (default chosen if you don't reply)

- **Sub-region traversal** — *Default: edge-walk transitions (walk off the south edge of Pools → enter Field), gbcWipe between.* Say "doors" for explicit door tiles.
- **Lantern knot difficulty** — *Default: punishing wrong verbs (boss heals).* Say "soft" to make wrong verbs only delay, not heal.
- **Crown knot reward** — *Default: +2 Clarity + Epilogue dialogue line.* Say "shard" to make it a guaranteed Memory Shard instead.
- **Plateau-Remain timing** — *Default: only after Phase 3 of boss.* Say "anytime" to keep current behaviour (offered on boss approach).
- **Daimon Mark glyph** — *Default: small constellation top-right, always visible.* Say "menu only" to hide it behind a pause screen instead.
