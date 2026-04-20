# Act 2 — The Great Work

The Imaginal Plateau gives way to the **Athanor**: the alchemical workshop where Rowan stops *witnessing* others and starts *transmuting* the self. Where Act 1 was a lateral sweep across souls, Act 2 is a vertical descent through the four classical alchemical operations — and a confrontation with the parts of Rowan that the Plateau couldn't touch.

> Tone: still GBC, still melancholic-mythic with absurd undertones. But warmer, more interior, more dangerous. The Plateau was foggy and silver; the Athanor is amber, soot-black, and red-gold.

---

## Design pillars

1. **Inversion of Act 1.** Act 1: meet others, learn verbs. Act 2: meet *yourself*, learn to **transmute** (a new verb class).
2. **Four operations, four scenes.** Each is a self-contained "room" with a distinct mechanic, palette, soundscape, and 1–2 named encounters. They must be played in order (Nigredo → Albedo → Citrinitas → Rubedo) but each has internal branching.
3. **The shards become matter.** Memory shards collected in Act 1 are *consumed* in Act 2 — the player chooses which shards to dissolve, calcine, distill, conjoin. Different shard combinations alter outcomes.
4. **Daimon evolves.** Soryn shifts from companion to **interlocutor** — she now disagrees, refuses, and at one point is the antagonist of a scene.
5. **Choices from Act 1 land here.** `soulChoices`, `soulEventLog`, and `soulsCompleted` all gate Act 2 branches. The Walking Saint forced? The Crowned One witnessed? Each leaves a residue in the Athanor.

---

## Structural overview

```
ACT II — THE GREAT WORK
├── 2.0  Threshold of the Athanor      (transition from Imaginal)
├── 2.1  NIGREDO — The Blackening       (dissolution, shadow work)
├── 2.2  ALBEDO  — The Whitening        (purification, the moon-bath)
├── 2.3  CITRINITAS — The Yellowing     (illumination, the inner sun)
├── 2.4  RUBEDO  — The Reddening        (conjunction, the wedding)
└── 2.5  Coda — The Sealed Vessel       (bridge into Act 3)
```

New `SceneKey` values: `AthanorThreshold`, `Nigredo`, `Albedo`, `Citrinitas`, `Rubedo`, `SealedVessel`.

`ACT_BY_SCENE` updates: all six → 2. `CuratedSelf` and `Epilogue` shift to act 3 (the existing endgame becomes Act 3).

---

## 2.0 — Threshold of the Athanor

A short pivot scene (≈3 min). Soryn leads Rowan down a spiral stair below the Plateau into a circular workshop with four sealed doors.

**Mechanics**
- Rowan inspects the **Vessel** (a glass alembic in the center) and is asked to *deposit* shards collected so far.
- A new HUD element appears: **Shard Inventory** (each shard is a named noun — "MOTHER'S APRON", "THE UNFINISHED SONG", "THE FEATHER", etc., derived from which Act 1 quests were completed).
- Soryn introduces the new verb: **TRANSMUTE**. (Joins observe/address/remember/release/witness as the 6th command.)
- Choosing TRANSMUTE on the Vessel unlocks the four doors in order.

**Branch hooks**
- If `soulsCompleted ≥ 8`: extra shard "THE PLATEAU'S WEIGHT" is auto-added.
- If Walking Saint was forced: Soryn refuses to descend the last step until Rowan apologizes (inquiry).
- If Echo follower active: she remains at the threshold and can be revisited between operations.

---

## 2.1 — NIGREDO (The Blackening)

> *Dissolution. The matter is broken down. Rowan meets her shadow.*

**Setting:** A flooded basement chamber, ankle-deep in black water. The walls weep. A single furnace glows.

**Mechanic — "The Dissolving":**
- Rowan picks **3 shards** from inventory to dissolve in the furnace.
- Each shard, when dissolved, summons a **Shade** — a memory-figure who challenges Rowan with the worst version of that memory.
- Each Shade encounter is a 4-option inquiry where the *wrong* answers (defensive, dismissive) progress the scene faster but cost +1 *clarity*. The *right* answer (sit with the shame) costs time but awards a **Black Stone**.
- Need 2 of 3 Black Stones to unlock the exit. The third shard, if "wasted," still permanently destroys it from inventory — players feel the loss.

**Named encounters**
- **The Mother-Who-Did-Her-Best** — an apologetic, exhausted ghost. Hook: she keeps offering tea Rowan never asked for.
- **The Self-Who-Said-Yes** — Rowan at 19, smiling through a job she hated for 6 years. Hook: she won't stop nodding.
- **★ The Inquisitor** *(Torquemada-coded; never named)* — he is *certain* Rowan deserves whatever she got. Hook: he asks for her confession and writes it down before she speaks.

**New systems**
- `shardInventory: ShardId[]` on `SaveSlot`.
- `blackStones: number`, `whiteStones: number`, `yellowStones: number`, `redStones: number`.
- `shadesEncountered: Record<string, "fled" | "sat_with" | "destroyed">`.

**Lore unlocks:** `on_nigredo`, `on_the_shadow`, `on_dissolving`.

---

## 2.2 — ALBEDO (The Whitening)

> *Washing. The matter is purified by water and moonlight.*

**Setting:** A high marble bath under a skylight. Moon visible through clouded glass. Pale, cold, beautiful.

**Mechanic — "The Bath of Stars":**
- A rhythm-tap sequence (extended `rhythmTap`) where each correct beat is a memory the player *forgives* (themselves or another).
- Beats are tied to specific Act 1 souls — e.g., a beat appears when Rowan "forgives the saint for refusing her."
- Missed beats become **Stains** (debuff-equivalent: visual smudges on the HUD that persist into 2.3).
- Completing the bath earns 2 **White Stones** (3 if perfect).

**Named encounters**
- **The Bath-Keeper** — a silent figure who pours water. Speaks only once, at the end: *"Cleanliness is not innocence. It is the choice to begin again."*
- **★ The Drowned Bride** *(Ophelia returns — same shade as Act 1's Drowned Poet, now changed)* — she rises from the bath, alive, and asks if Rowan finished her song. If `the_unfinished_song` was completed → she sings it back. If not → she hums it alone, and the scene is colder.

**Branch hook:** If Rowan refused to dissolve any shards in Nigredo, the bath water is murky and beats are 30% faster.

**Lore unlocks:** `on_albedo`, `on_forgiveness`, `on_the_moon_again`.

---

## 2.3 — CITRINITAS (The Yellowing)

> *Illumination. The matter takes on the color of the sun. The mind clarifies.*

**Setting:** A sunlit scriptorium / library tower. Dust motes in golden shafts. Books that write themselves.

**Mechanic — "The Reading":**
- Three books appear on a lectern, each containing a **truth about Rowan** that she has avoided.
- Player chooses which book to read first; each unfolds as a short interactive monologue (similar to the Imaginal `runSoul` framework, but Rowan is both speaker and listener).
- Choices in each book set a **Conviction** — a permanent flag like `accepted_her_anger`, `accepted_her_dependence`, `accepted_her_ambition`.
- Reading all three (vs. only the required two) earns a **Yellow Stone** and unlocks the secret encounter.

**Named encounters**
- **The Librarian** — runs the tower. Officious, kind, vaguely worried. Will recommend a fourth book if asked twice.
- **★ The Lantern Mathematician returns** (from Act 1 corridor) — now writing instead of counting. He asks Rowan to define "enough." The answer is keyed to Act 1's `lantern_mathematician` ending.
- **★ Hypatia (anonymized as "THE TEACHER WHO WAS TORN")** — hidden encounter in the topmost stack. Only appears if all three books are read. She gives Rowan a single sentence to carry into Rubedo. The sentence varies by player history.

**Lore unlocks:** `on_citrinitas`, `on_conviction`, `on_the_torn_teacher` (hidden).

---

## 2.4 — RUBEDO (The Reddening)

> *Conjunction. Opposites are wed. The work nears its end.*

**Setting:** A red-gold chamber with two thrones. A long table set for two. A mirror that shows both seats occupied.

**Mechanic — "The Wedding":**
- Rowan must perform the **Conjunctio** — the marriage of opposites — by pairing 4 of her shards/stones into 2 unions:
  - Black ↔ White (shadow ↔ purity)
  - Yellow ↔ Red (mind ↔ heart) [Red stones earned in this scene]
- The pairing is a small drag-or-cycle UI: Rowan picks left, picks right, declares the union. Each declared union is a short dialog where Soryn now **pushes back** — she argues for a different pairing, and the player must hold their choice or yield.
- Holding all pairings = a **strong wedding**. Yielding to Soryn each time = a **gentle wedding**. Mixing = a **fractured wedding**. All three are valid — they shape Act 3.

**Named encounters**
- **★ Soryn herself, transfigured** — for the first time she stands across from Rowan, not behind her. The player can ADDRESS her directly. There is one inquiry where Rowan can release her ("THANK YOU. GO HOME."). If chosen, Soryn becomes a wisp; the rest of Act 2 is solo.
- **The Thirteenth Soul** — only appears if 12 souls were completed in Act 1. A figure with no face who simply sits at the table. Awards the secret **Gold Stone**.

**Lore unlocks:** `on_rubedo`, `on_the_wedding`, `on_releasing_the_daimon` (conditional).

---

## 2.5 — Coda: The Sealed Vessel

A 2-minute closer. The Vessel from 2.0 is now full — black, white, yellow, red sediment in layers. Rowan seals it.

**Mechanic**
- One choice: what to **inscribe** on the seal. Three options derived from her wedding type:
  - Strong: "I AM THE WORK."
  - Gentle: "WE ARE THE WORK."
  - Fractured: "THE WORK IS UNFINISHED. GOOD."
- The inscription becomes a permanent flag (`act2_inscription`) read by Act 3.

Then a slow fade to the Act 3 title card.

---

## Save schema additions (`SaveSlot`)

```ts
shardInventory: ShardId[];                   // named shards, drawn from Act 1 quest completions
shardsConsumed: ShardId[];                   // moved out of inventory by Athanor operations
blackStones: number;                         // 0..3
whiteStones: number;                         // 0..3
yellowStones: number;                        // 0..3 (3rd is hidden)
redStones: number;                           // 0..3
goldStone: boolean;                          // hidden, requires all 12 souls
shadesEncountered: Record<string, "fled" | "sat_with" | "destroyed">;
convictions: Record<string, boolean>;        // accepted_her_anger, etc.
weddingType: "strong" | "gentle" | "fractured" | null;
act2_inscription: string | null;
sorynReleased: boolean;
stainsCarried: number;                       // missed beats from Albedo
```

`SCENE_LABEL` adds: `AthanorThreshold: "Threshold"`, `Nigredo: "Nigredo"`, etc.

---

## New verb: TRANSMUTE

- Added to `Command` union.
- Unlocked at end of 2.0 (`save.verbs.transmute = true`).
- Only valid on Vessel + Stones. Not used in dialog the way witness is.
- `verbs` shape grows: `{ witness: boolean; transmute: boolean }`.

---

## Files to add

**New scenes**
- `src/game/scenes/AthanorThresholdScene.ts`
- `src/game/scenes/NigredoScene.ts`
- `src/game/scenes/AlbedoScene.ts`
- `src/game/scenes/CitrinitasScene.ts`
- `src/game/scenes/RubedoScene.ts`
- `src/game/scenes/SealedVesselScene.ts`

**New systems**
- `src/game/athanor/shards.ts` — `ShardId` registry, derivation from Act 1 flags, display names, descriptions.
- `src/game/athanor/operations.ts` — shared "consume N shards, produce stones" runner used by all four operation scenes.
- `src/game/athanor/shades.ts` — Nigredo shade definitions (declarative, like `soulArcs`).
- `src/game/athanor/wedding.ts` — Rubedo pairing UI + branching logic.
- `src/game/athanor/vessel.ts` — Vessel HUD widget + inscription overlay.

**New art (in `gbcArt.ts`)**
- `bakeAthanor(scene)` — furnace, alembic, bath, lectern, throne tiles.
- 4 new tile palettes: `PAL.nigredo`, `PAL.albedo`, `PAL.citrinitas`, `PAL.rubedo`.
- `bakeShades(scene)` — 6 shade portraits (3 per Nigredo, 3 contextual).
- `bakeStones(scene)` — 4-color stone icons for HUD.

**Edits**
- `src/game/types.ts` — extend `SceneKey`, `Command`, `verbs`, add new fields, extend `migrateSave`.
- `src/game/save.ts` — `newSave` includes new fields.
- `src/game/scenes/ImaginalRealmScene.ts` — exit transition now leads to `AthanorThreshold` instead of `CuratedSelf`.
- `src/game/scenes/CuratedSelfScene.ts` — gated behind `act2_inscription !== null`. `ACT_BY_SCENE` for it becomes 3.
- `src/game/scenes/lore.ts` — ~14 new entries.
- `src/game/sideQuests.ts` — 4 new optional Act 2 quests (see below).
- `src/game/scenes/hud.ts` — Shard Inventory + Stones widget; "Stains" rendering.

---

## Optional Act 2 side quests

| ID | Trigger | Goal | Reward |
|---|---|---|---|
| `salvage_a_shard` | Wasted shard in Nigredo | Find an "echo" of it in Albedo | Restores shard, +1 compassion |
| `read_the_fourth_book` | Ask the Librarian twice | Read the hidden 4th book in Citrinitas | Lore `on_the_fourth_book`, +1 clarity |
| `meet_the_thirteenth` | All 12 souls completed in Act 1 | Find the faceless guest in Rubedo | Gold Stone, lore `on_the_thirteenth` |
| `release_soryn` | Choose to release Soryn in Rubedo | Complete remaining 2.4 + 2.5 alone | Lore `on_walking_alone`, alters Act 3 opening |

---

## Implementation order

1. **Schema first.** `types.ts`, `save.ts`, `migrateSave` updates. Verify a fresh save loads.
2. **Athanor system primitives.** `shards.ts`, `operations.ts`, `vessel.ts`, HUD widgets. No scenes yet — just the data layer + a debug overlay to inspect state.
3. **Threshold scene.** Wire transition from `ImaginalRealm`. Vessel deposit works. New TRANSMUTE verb registered.
4. **Nigredo.** First operation scene. This is the template all four follow — get it right before duplicating.
5. **Albedo, Citrinitas, Rubedo.** Each in its own PR. Reuse the operations runner.
6. **Sealed Vessel + transition into existing CuratedSelf.** Re-tag CuratedSelf/Epilogue as Act 3.
7. **Lore + side quests.** Final pass.
8. **Tone pass + balance.** Make sure no scene takes >10 min, no stone is mathematically unobtainable, and Soryn's rebellion in Rubedo lands as the inversion it's meant to be.

---

## Risks

- **Scope.** Six scenes is twice Act 1's footprint. Mitigation: the four operations share one runner; only the *encounters* are unique.
- **Shard inventory derivation.** Players who skipped most of Act 1 will have few shards. The Athanor must be playable with as few as 3 shards (provide 2 "default" shards: "BREATH" and "NAME" derived from prelude).
- **Soryn release.** Cutting the companion mid-act risks feeling empty. The Thirteenth Soul + the Vessel itself need to fill the silence — both should react more verbosely if `sorynReleased`.
- **Tone drift.** Alchemy is rich, easy to over-explain. Keep dialog under 3 lines per beat. The lore log carries the weight; the scenes carry the feeling.

---

## What this gives Act 3

- A vessel full of stones (color counts → Act 3 endings tier).
- An inscription (string → Act 3 opening line).
- Conviction flags (which truths Rowan owns → Act 3 dialog branches).
- Wedding type (strong/gentle/fractured → Act 3 structure).
- `sorynReleased` (solo vs. accompanied → Act 3 has two distinct opening sequences).

Act 3 ("THE RETURN") will be the harvest. Act 2 plants every seed it picks.
