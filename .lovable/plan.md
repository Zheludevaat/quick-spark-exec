

# Restructure: Act 0 Expansion + Act I = Imaginal Realm

## Conceptual Remap

What we shipped as "Act 0" splits cleanly into two acts:

| Current build | Becomes |
|---|---|
| (none — implicit backstory) | **Act 0 — The Living Death + Reception** (NEW, expanded) |
| Silver Threshold + 4 elements + Soryn intro | **Act 0 finale** (kept, expanded) |
| Moon Hall (3 mirrors) + Curated Self boss | **Act I — The Imaginal Realm** (renamed Moon Plateau) |

Net effect: nothing already built is thrown away. Moon Hall + Curated Self get re-skinned and re-framed as **the Imaginal Realm Plateau** (Act I), and we **add new content in front of it** to become the true Act 0.

---

## Act 0 (Expanded) — "The Last Day & The Silver Threshold"

Three new playable beats added BEFORE the existing Silver Threshold scene:

**Beat 1 — The Last Day (new scene `LastDayScene`)**
- Top-down GBC vignette of Rowan's final mortal day. Small apartment + one street.
- 3–4 micro-interactions (a phone left unanswered, a window watched, a kettle that boils too long, a coat by the door).
- Each interaction sets a *seed flag* (`seed_call`, `seed_window`, `seed_kettle`, `seed_coat`) that later colours dialogue in the Imaginal Realm and Epilogue.
- No verbs yet — just A to interact. Teaches movement only.

**Beat 2 — The Crossing (new scene `CrossingScene`)**
- A short, near-silent scene. Rowan walks a darkening hallway. The world dims tile by tile as she moves. Soryn's voice arrives as text without a speaker portrait yet.
- Ends in a fade-to-silver; transitions into the existing Silver Threshold.
- Teaches: *death is not punishment, it is a doorway.* No fail state.

**Beat 3 — Reception (existing `SilverThresholdScene`, expanded)**
- Keep current 4 element circles + Soryn intro + gate.
- **Add**: each element circle now offers a 2-question micro-rite (Inquiry Wheel: Observe / Ask / Confess / Silent) that reveals one of the seeds from Beat 1 and gives a *small* stat bias (not just +1, but coloured by the answer).
- **Add**: Soryn now formally *binds* as daimon at the gate (new line: "I will walk one sphere with you. Then you walk alone.") — sets `daimon_bound = true`.
- The existing hidden lore stone stays.

---

## Act I — "The Imaginal Realm" (formerly Moon Hall + Curated Self)

Rename + reframe, almost no mechanical change to what's built:

**Files renamed (semantic, scene keys updated):**
- `MoonHallScene` → `ImaginalRealmScene` (scene key `"ImaginalRealm"`)
- `CuratedSelfScene` stays as the **Plateau exit boss** (kept name — it IS the Curated Self)
- New on-screen title: "THE IMAGINAL REALM" instead of "HALL OF MIRRORS"

**Reframing (text + lore, no system change):**
- The 3 mirrors become *image-knots* in the Imaginal substrate (the brief's "thoughtforms made visible"). Taglines updated to match Imaginal Realm language.
- Soryn's intro tutorial dialogue rewritten: "This realm shows thought as landscape. The mirrors here are not glass — they are images you mistook for self."
- The Curated Self boss is recontextualized as **the Plateau temptation** — beating it = leaving the Imaginal Realm. Refusing it (new option) = soft-ending "Remain in the Imaginal."

**Small additions to make it feel like Act I, not Act 0 polish:**
- Add the **WITNESS** verb (unlocked on entering the Realm, taught by Soryn) — currently we have Observe/Address/Remember/Release; WITNESS is the new sphere verb that completes the Curated Self's final phase.
- Add a **Plateau-Remain** option at the boss: "Stay here. The image is comfortable." → triggers a bittersweet ending vignette + return to title (with save preserved so player can resume and choose to leave).
- Add **1 Memory Shard** hidden in the Imaginal Realm (first of 21 across the full game).

---

## Save / Flow Changes

`src/game/types.ts`:
- `SaveSlot.scene` union updated: add `"LastDay" | "Crossing" | "ImaginalRealm"`, keep `"CuratedSelf" | "Epilogue"`, remove `"MoonHall" | "MoonGate"`.
- Add `act: 0 | 1` field.
- Add `verbs: { witness: boolean; ... }` for sphere-verb unlocks.
- Add `shards: string[]` for Memory Shards.
- Add `seeds: Record<string, boolean>` for Last Day seeds.
- Migration: any existing save with `scene === "MoonHall"` → coerced to `"ImaginalRealm"` on load.

New scene flow:
```text
Title → LastDay → Crossing → SilverThreshold → ImaginalRealm → CuratedSelf → Epilogue
                                                       ↘ Plateau-Remain ending
```

---

## File-Level Build Plan

**New files:**
- `src/game/scenes/LastDayScene.ts`
- `src/game/scenes/CrossingScene.ts`
- `src/game/inquiry.ts` (small Inquiry Wheel helper used by element rites; reusable later)

**Renamed (delete old, create new with updated content):**
- `src/game/scenes/MoonHallScene.ts` → `src/game/scenes/ImaginalRealmScene.ts`

**Edited:**
- `src/game/types.ts` — scene union, new fields, migration helper
- `src/game/save.ts` — migration on read
- `src/game/createGame.ts` — register `LastDay`, `Crossing`, `ImaginalRealm`; deregister `MoonHall`
- `src/game/scenes/TitleScene.ts` — new game starts at `LastDay`; resume routes through migration
- `src/game/scenes/IntroScene.ts` — short audit; if it still says "Moon Hall" anywhere, update to "Imaginal Realm"
- `src/game/scenes/SilverThresholdScene.ts` — add micro-rite Inquiry Wheel per element; daimon binding line; transition target → `ImaginalRealm`
- `src/game/scenes/CuratedSelfScene.ts` — add WITNESS as the final-phase verb; add Plateau-Remain option; add shard pickup hook
- `src/game/scenes/EncounterScene.ts` — accept WITNESS verb in command list (only shown if unlocked)
- `src/game/scenes/hud.ts` — Inquiry Wheel render helper; verb list reads from save
- `src/game/audio.ts` — add `SONG_LASTDAY` (muted piano-style chiptune) and `SONG_CROSSING` (drone)
- `src/game/gbcArt.ts` — add ~6 new tiles (apartment floor, window, kettle, door, hallway dim variants)

**Untouched:** all UI components, routing, build config.

---

## Build Order (one phase, ship in this order)

1. **Types + save migration** — non-breaking foundation
2. **Rename Moon Hall → Imaginal Realm** — pure refactor, verify game still runs end-to-end
3. **Add WITNESS verb + Plateau-Remain ending** — extends Curated Self
4. **Add 1 Memory Shard pickup in Imaginal Realm**
5. **Build LastDayScene** (most new content)
6. **Build CrossingScene** (short, atmospheric)
7. **Add element micro-rites to Silver Threshold**
8. **Add new chiptune tracks**
9. **End-to-end QA pass**

---

## Open Decisions (default chosen if you don't reply)

- **Last Day length** — *Default: 4 micro-interactions, ~3min play.* Say "longer" for 6 interactions and a second room.
- **Plateau-Remain ending** — *Default: triggers immediately, returns to Title, save preserved so resume offers a "Leave the Imaginal" option.* Say "permanent" to make it a true ending that locks the slot.
- **WITNESS verb visibility** — *Default: hidden in Encounter command list until unlocked at Imaginal Realm entrance.* Say "always shown" to grey it out instead.

