

# METAXY Adaptation: Continuous Build, No DLC Gating

The current 3-act game is the unfinished first third of the intended 9-act arc. We are not shipping spheres as DLC — we are removing the premature ending and continuing the journey forward. Acts 0–4 already exist (in spirit). Acts 5–8 must be built. Acts 1–4 must be relabeled to fit the seven-sphere cosmology.

## Reordering: what we have → where it fits

| Now | Becomes | Notes |
|---|---|---|
| LastDay → Crossing | **Act 0: Earthly Life + Death** | Add Calling chooser in LastDay |
| SilverThreshold | **Act 1: Reception** (4 Guardians + Daimon binding) | Already structurally correct |
| ImaginalRealm | **Act 2: The Plateau (Imaginal Field)** | Stays as-is, lateral soul work |
| Athanor (Threshold + 4 ops + SealedVessel) | **Act 3: Moon Sphere — Mirror's Palace + Selenos Trial** | Re-skin only; mechanics fit perfectly |
| CuratedSelf | **Act 6: Sun Sphere — Hall of Testimony + Helion Trial** | Already perfect; relabel and move later in arc |
| Epilogue | **Endings Router** (final scene only after Saturn) | No longer fires after Sun |

New acts to build: **Act 4 Mercury, Act 5 Venus, Act 7 Mars, Act 8 Jupiter, Act 9 Saturn, Act 10 Final Endings.**

That puts the existing CuratedSelf in the **middle**, not the end. The Sun is the heart of the journey, not its terminus. Saturn is the gate to the real ending.

## The critical fix: stop ending the game at Sun

Today, finishing CuratedSelf fires Epilogue and resets to Title. That is the "mistake along the way." After this pass:

- CuratedSelf victory routes to **MetaxyHub** with the Mars portal newly lit, not to Epilogue.
- Epilogue is renamed **EndingsRouter** and gated behind Saturn completion (or an explicit player "settle here" choice at any plateau).
- The "WALK AGAIN" / "ASCEND" / "ERASE" menu inside CuratedSelf is replaced with a single "RETURN TO METAXY" exit.
- All save state continues; no NG+ trigger fires from Sun anymore.

## MetaxyHub — the connective spine

One new persistent scene becomes the load-bearing structure of the entire game from Act 3 onward.

- Seven planetary portals arranged in a vertical ascent: Moon (bottom) → Saturn (top).
- Each portal lights when its sphere is unlocked, dims when locked, and shows a completion glyph when its trial is passed.
- Soryn stands at the hub between every act, offering boundary dialog and reflection on what just happened.
- A Relic Altar where the player can release identity-objects collected per sphere (feeds final endings).
- Replaces the current direct chain (Athanor → CuratedSelf). Every act now exits to the hub; the hub launches the next.

## Sphere Template — built once, instantiated 7 times

Every sphere act follows the same template scene pair. Build the template once; each new sphere is a config file plus dialog content, not a new scene tree.

```text
PlateauHub (per sphere)
  ├─ 3 named NPC soul cases (reuses runSoul + soulArcs)
  ├─ 4 sub-operations themed per sphere (reuses selectShards + awardNamedStone)
  ├─ 1 "Cracking Question" inquiry that defines the trial verb
  └─ Exit → Trial OR Settle Here (soft plateau ending)

SphereTrial (per sphere)
  ├─ Governor encounter (Selenos/Hermaia/Kypria/Helion/Areon/Jovian/Kronikos)
  ├─ Uses the sphere's signature verb (Name/Attune/Stand/Weigh/Release)
  ├─ Pass: garment released, return to MetaxyHub with next portal lit
  └─ Fail: Coherence drains, Soryn retrieves player to hub for retry
```

The existing Athanor structure IS this template — we extract it into shared modules and feed it config.

## Save schema additions (additive only, no renames)

- `calling: "scholar" | "caregiver" | "reformer" | null`
- `coherence: number` (0–100, additive HUD arc)
- `daimonBond: number` (0–10, derived from existing Soryn signals)
- `garmentsReleased: Record<SphereKey, boolean>` (7 keys)
- `sphereVerbs: { name, attune, stand, weigh, release: boolean }` (witness already exists)
- `relics: string[]`
- `gnosticAccepted: boolean`
- `endingChosen: string | null`
- `plateauSettled: Record<SphereKey, boolean>`

All defaulted in `migrateSave`. No localStorage key bump. No rename of Soryn (canon stays; "Sophene" added as in-fiction alias only).

## Production order — long but linear

This is a multi-month build. Phasing keeps the game playable end-to-end at every checkpoint.

**Phase 1 — Unblock the ending (1 session)**
- Schema additions + `migrateSave` defaults.
- CuratedSelf victory exits to a placeholder MetaxyHub instead of Epilogue.
- Title screen DEV jumps updated for new act labels.

**Phase 2 — MetaxyHub scene (1 session)**
- Seven portals, Soryn dialog, relic altar stub.
- Initially: Moon and Sun lit (because they exist), other 5 dim with foreshadow lines.
- Wire AthanorThreshold and CuratedSelf entry/exit through the hub.

**Phase 3 — Sphere Template extraction (2 sessions)**
- Move Athanor's plateau + trial logic into `src/game/spheres/template/{Plateau,Trial}.ts`.
- Define `SphereConfig` type (id, governor, op themes, NPC arcs, verb, inscriptions, palette).
- Refactor Moon (Athanor) to use the template via `moon.config.ts`. Game still plays identically.

**Phase 4 — Reframe existing acts (1 session)**
- Relabel Athanor → Moon Sphere in all UI strings.
- Relabel CuratedSelf → Sun Sphere; move it to Act 6 in `ACT_BY_SCENE`.
- Rebuild `SCENE_LABEL` and DEV menu entries.
- Add Calling chooser beat to LastDay.

**Phase 5 — Build Mercury Sphere (Act 4) (3–4 sessions)**
- `mercury.config.ts`: Tower of Reasons, Hermaia Trial, Name verb.
- 3 NPC arcs (the Defender, the Pedant, the Casuist).
- 4 plateau operations themed as argument/proof/refutation/silence.
- Cracking Question, inscription, relic.

**Phase 6 — Build Venus Sphere (Act 5) (3–4 sessions)**
- `venus.config.ts`: Eternal Biennale, Kypria Trial, Attune verb.
- 3 NPC arcs (the Curator, the Critic, the Beloved).
- 4 operations themed as longing/recognition/imitation/release.

**Phase 7 — Build Mars Sphere (Act 7) (3–4 sessions)**
- `mars.config.ts`: Arena of the Strong, Areon Trial, Stand verb.
- 3 NPC arcs (the Champion, the Coward, the Refuser).
- Repurposes EncounterScene as Mars duel skeleton.

**Phase 8 — Build Jupiter Sphere (Act 8) (3–4 sessions)**
- `jupiter.config.ts`: Grand Tribunal, Jovian Trial, Weigh verb.
- 3 NPC arcs (the Judge, the Advocate, the Accused).

**Phase 9 — Build Saturn Sphere (Act 9) (4–5 sessions)**
- `saturn.config.ts`: Avenue of Fate + Gnostic Threshold, Kronikos Trial, Release verb.
- 3 NPC arcs (the Astrologer, the Determinist, the Gnostic Tempter).
- Sets `gnosticAccepted` flag if player accepts the Gnostic offer.

**Phase 10 — EndingsRouter + 5 endings (2 sessions)**
- Replaces single Epilogue.
- Reads full save state; routes to Ascent / Reincarnation (NG+) / Vow-return / Soft Plateau / Gnostic.
- NG+ semantics: lore, daimonBond, soulChoices, resonance signals carry over as deja-vu.

**Phase 11 — Coherence + Garment HUD + Resonance Profile menu (2 sessions)**
- Visible Coherence arc on top HUD.
- 7-segment Garment ring around player sigil, dims as garments release.
- Resonance Profile pause-menu tab (passive, accumulates from choices across all acts).

## What this plan does NOT defer

- All five missing spheres are scheduled, not stubbed.
- Endings expansion is in scope.
- Sphere Template is built up-front so spheres 2–7 are content work, not engine work.

## What this plan explicitly avoids

- No rename of `Soryn` in code (in-fiction alias only).
- No rename of the `CuratedSelf` scene file (label change only).
- No rewrite of existing Athanor mechanics — they become the Moon config.
- No new dialog framework, no new HUD framework, no new save framework.

## Decisions needed before Phase 1 starts

1. **Ship order for the 5 new spheres:** strict planetary order (Mercury → Venus → Mars → Jupiter → Saturn) or build Saturn first so the real ending exists before the middle spheres?
2. **Calling system depth:** light flavor (3–5 lines per act) or deep branching (different NPC arcs per calling)?
3. **Coherence visibility:** show the arc from Act 0, or hide until Mars where it first drains?
4. **Settle-here soft endings:** offer at every plateau from Moon onward, or only Mars/Jupiter/Saturn?

