

# Act 2 — Sophistication Pass

Bring the Athanor up to the density and reactivity of Acts 0–1: named encounters, branching inquiries, save-driven reactivity, side quests, lore depth, and tactile feedback. No new scenes — the existing six get filled out.

---

## Gap analysis (current state vs. plan-act2.md)

| Area | Current | Target |
|---|---|---|
| Nigredo shades | 1 generic shade reused 3× | 3 named shades, each with unique 4-option inquiry |
| Albedo | Rhythm tap, generic beats | Beats keyed to specific Act 1 souls; Bath-Keeper line; Drowned Bride return tied to `the_unfinished_song` |
| Citrinitas | 3 books, generic accept/refuse | 3 books with branching monologues; Librarian; Lantern Mathematician return; hidden Hypatia (4th read) |
| Rubedo | 2 unions, Soryn release option | Soryn actively pushes back per pairing; Thirteenth Soul if 12 souls; gold stone wired |
| Sealed Vessel | 4 inscription options | Filtered to 3 by `weddingType`; reactive to `sorynReleased` and `stainsCarried` |
| Side quests | None | 4 Act 2 quests wired (`salvage_a_shard`, `read_the_fourth_book`, `meet_the_thirteenth`, `release_soryn`) |
| Cross-act reactivity | Shards derive from Act 1; little else | Shades, books, Bride, Mathematician all read `soulChoices` / `soulEventLog` / `convictions` |
| Soryn voice | Static | Per-scene barks; rebellious in Rubedo; absent if released |
| HUD | Stones + shards | + Stains pip in Albedo+; + conviction count in Citrinitas+; + "alone" indicator if Soryn released |
| Lore | ~14 entries | + 6 hidden/conditional entries (fourth book, thirteenth, releasing daimon, the bride sang, the inquisitor, the teacher who was torn) |
| Threshold | Door gating works | + Soryn refuses descent if Walking Saint forced (apology inquiry); + Echo remains at threshold if follower |

---

## Files to edit / add

**New**
- `src/game/athanor/shades.ts` — declarative registry: `{ id, name, opening: DialogLine[], inquiry: { prompt, options[4] }, rightAnswerTag }`. Three shades: `mother_who_did_her_best`, `self_who_said_yes`, `inquisitor`.
- `src/game/athanor/books.ts` — declarative registry: `{ id, title, monologue: DialogLine[], inquiry, conviction, refuseTag }`. Four books (3 visible + 1 hidden `the_fourth_book`).
- `src/game/athanor/wedding.ts` — pairing logic: 2 unions, Soryn rebuttal lines per pairing, `holds`/`yields` counter → `weddingType`.

**Edited**
- `src/game/types.ts` — add `convictions` keys union (documentation only); add `stainsCarried` already present; add `act2_apology` flag note.
- `src/game/athanor/shards.ts` — add `salvage` flow helper.
- `src/game/scenes/AthanorThresholdScene.ts` — Walking-Saint apology gate; Echo presence at threshold; Soryn-released barks; salvage offer if a shard was wasted.
- `src/game/scenes/NigredoScene.ts` — replace generic loop with `runShade(shadeId)`; pick which 3 of the 3 (or random subset if more authored later); track `shadesEncountered[id] = "fled"|"sat_with"|"destroyed"`; if a shard was fully wasted, register `salvage_a_shard` quest.
- `src/game/scenes/AlbedoScene.ts` — beat schedule generated from `soulChoices` (one beat per resolved soul, max 8); Bath-Keeper closing line; Drowned Bride encounter conditional on `the_unfinished_song` quest done; murky-water modifier if no shards dissolved in Nigredo (`shardsConsumed.length === 0`); stains visualized in HUD.
- `src/game/scenes/CitrinitasScene.ts` — switch to `books.ts` registry; Librarian NPC with "ask twice" trigger for `read_the_fourth_book`; Lantern Mathematician cameo if his Act 1 arc completed; hidden Hypatia if all 3 books accepted; sentence carried into Rubedo via `save.flags.teachers_sentence`.
- `src/game/scenes/RubedoScene.ts` — use `wedding.ts`; Soryn pushes back per pairing with arc-aware lines; Thirteenth Soul appears if `soulsCompleted >= 12` → `goldStone = true`, registers `meet_the_thirteenth`; Soryn release moved to mid-scene inquiry (registers `release_soryn`).
- `src/game/scenes/SealedVesselScene.ts` — filter inscription options to the 1 canonical for the wedding type plus 2 reactive variants (e.g., "AND I WALKED ALONE" if `sorynReleased`; "STAINS AND ALL" if `stainsCarried > 0`); show `teachers_sentence` as a top-of-scene whisper if set.
- `src/game/sideQuests.ts` — add 4 Act 2 IDs + titles + hint chain: `salvage_a_shard → read_the_fourth_book`, `meet_the_thirteenth → release_soryn`.
- `src/game/scenes/lore.ts` — add 6 entries: `on_the_inquisitor`, `on_the_bride_sang`, `on_the_fourth_book`, `on_the_torn_teacher`, `on_the_thirteenth`, `on_walking_alone`.
- `src/game/athanor/vessel.ts` — add stains pip + "ALONE" chip when `sorynReleased`.
- `src/game/companion.ts` — add Athanor barks (per scene + per stone awarded); short-circuit if `sorynReleased`.

---

## Cross-act reactivity matrix

```text
Act 1 signal                       → Act 2 reaction
-----------------------------------------------------
walking_saint:forced               → Threshold: Soryn apology gate; Inquisitor harsher
the_unfinished_song done           → Albedo: Bride sings the song back
mirror_philosopher:argued          → Citrinitas Book of Anger: extra accept line
weighed_heart (cartographer)       → Citrinitas Book of Ambition: extra option
stonechild named (lanterns lit)    → Albedo beat keyed to "EL·I·AS"
soulsCompleted >= 12               → Rubedo: Thirteenth Soul + gold stone
soulsCompleted >= 8                → Threshold: auto-shard "PLATEAU'S WEIGHT"
echo_follower_unlocked             → Threshold: Echo waits at top of stairs
lantern_mathematician done         → Citrinitas: he returns as scribe
shardsConsumed.length === 0 (Nig)  → Albedo: murky water, +30% beat speed
shadesEncountered any "destroyed"  → Albedo: registers salvage_a_shard
weddingType                        → SealedVessel: inscription palette
sorynReleased                      → SealedVessel + Threshold: solo barks
```

---

## Side-quest wiring

| ID | Trigger location | Completion location | Reward |
|---|---|---|---|
| `salvage_a_shard` | NigredoScene when shard destroyed | AlbedoScene side-encounter | restore shard, +1 compassion, lore `on_salvage` |
| `read_the_fourth_book` | CitrinitasScene Librarian asked 2× | CitrinitasScene hidden stack | lore `on_the_fourth_book`, +1 clarity |
| `meet_the_thirteenth` | RubedoScene if `soulsCompleted >= 12` | RubedoScene table | `goldStone = true`, lore `on_the_thirteenth` |
| `release_soryn` | RubedoScene release inquiry | SealedVesselScene completion | lore `on_walking_alone`, alters Act 3 opening |

---

## HUD additions

- `VesselHud.refresh()` extended: stains pip (○/●×stainsCarried, capped at 3), "ALONE" chip when `sorynReleased`, conviction count `CONV n/3`.
- Toast on every stone awarded, named ("BLACK STONE — sat with the Mother").

---

## Tone & length budget

- Each shade: ≤ 8 lines opening + 4-option inquiry + ≤ 3 lines reply per branch.
- Each book: ≤ 6 lines monologue + 2-option inquiry.
- Soryn rebuttal in Rubedo: ≤ 2 lines per pairing.
- Total new dialog: ~120 lines. Authoring is the bottleneck.

---

## Implementation order

1. `shades.ts` + Nigredo rewrite (template for the others).
2. `books.ts` + Citrinitas rewrite + Librarian + hidden Hypatia.
3. `wedding.ts` + Rubedo rewrite + Thirteenth Soul.
4. Albedo: soul-keyed beats + Bride conditional + murky-water modifier.
5. Threshold: apology gate + Echo presence + salvage offer.
6. SealedVessel: reactive inscription palette + teacher's sentence.
7. Side quests + lore entries + HUD pips + Soryn barks.
8. Tone pass; verify a save with 0 shards still completes Act 2; verify a 12-soul perfect run earns the gold stone.

---

## Risks

- **Authoring volume.** ~120 lines of dialog; keep each beat tight.
- **Conditional Bride / Hypatia / Thirteenth.** Easy to ship and never see them — add a debug-flag bypass during dev.
- **Soryn release timing.** If released in Rubedo mid-pairing, the second pairing must work solo — wedding.ts must handle a null companion.

