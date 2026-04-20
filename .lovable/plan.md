

# Act 3 — The Return: Full Reactive Harvest

Act 3 is the harvest of every seed Act 2 planted. The Curated Self isn't a generic boss anymore — its taunts, its weakness, the available verbs, the ending tier, and Soryn's presence all branch on Act 2 state.

---

## What Act 2 hands us

| Save field | Drives in Act 3 |
|---|---|
| `act2Inscription` (string) | Opening whisper; final epilogue line |
| `weddingType` ("strong" / "gentle" / "fractured") | Phase-3 verb requirement |
| `sorynReleased` (bool) | Soryn voice → narrator voice if true |
| `convictions` (record) | Each owned conviction = accept-line variant in Phase 1 |
| `blackStones` / `whiteStones` / `yellowStones` / `redStones` | Ending tier + per-color epilogue paragraph |
| `goldStone` (bool) | Unlocks "ASCEND" command (skip Phase 3) |
| `stainsCarried` (number) | Phase-1 taunt variant; ending tone |
| `shadesEncountered` | Boss face cycles between sat-with shades in Phase 2 |
| `soulChoices` / `soulEventLog` | Soryn's barks |

---

## Files

**New**
- `src/game/act3/harvest.ts` — Pure helpers reading `SaveSlot`:
  - `openingWhisper(save) → string`
  - `phaseTaunt(phase, save) → string`
  - `endingTier(save) → "ascent"|"gold"|"silver"|"iron"|"brittle"`
  - `endingParagraphs(save) → string[]`
  - `sorynBark(save, event) → string|null` (null when released → caller renders narrator)

**Edited**
- `src/game/scenes/CuratedSelfScene.ts`:
  - Render `act2Inscription` as fading whisper on enter (mirrors SealedVessel's teacher's-sentence pattern).
  - Phase 1 — taunt from `phaseTaunt`; ADDRESS replies name owned convictions.
  - Phase 2 — boss face cycles through `shadesEncountered`; "destroyed" shades aggressive, "sat_with" luminous; small label under boss for readability.
  - Phase 3 — verb requirement keyed to `weddingType`:
    - strong → WITNESS x3 (current)
    - gentle → WITNESS x2 + ADDRESS x1
    - fractured → WITNESS x1 + RELEASE x1
  - If `sorynReleased`: suppress Soryn UI, use narrator (gold italic-equivalent text).
  - Hidden ASCEND command appears only if `goldStone`; selecting it dissolves boss to `golden_self` shard.
- `EpilogueScene` (same file):
  - Render whisper + 2-4 `endingParagraphs` via runDialog.
  - Tiered final option set:
    - `ascent` (goldStone): WALK AGAIN / ASCEND / ERASE — ASCEND triggers white-screen closer with single sentence; sets `flags.ng_plus_ascended`.
    - `gold` (stones >= 10): default trio.
    - `silver` (6-9): trio + bonus quiet line.
    - `iron` (3-5): trio + "you carried what you could".
    - `brittle` (<3): trio + replay invitation.
- `src/game/scenes/lore.ts` — 3 hidden entries: `on_the_return`, `on_the_ascent`, `on_the_inscription_returns`.

---

## Pacing

- ~5-7 min total, unchanged.
- Soryn-released runs feel quieter, not shorter — narrator replaces Soryn 1:1.
- ASCEND path ~2 min, framed as a *choice* (no shard, no Phase 3 grind), not a shortcut.

---

## Implementation order

1. `harvest.ts` (pure, no Phaser).
2. CuratedSelf opening whisper + phase taunts.
3. Phase 2 shade cycling.
4. Phase 3 weddingType branching + ASCEND.
5. Soryn-released narrator path.
6. Epilogue rewrite with `endingTier`.
7. Lore entries + Soryn barks pass.
8. Smoke test: `goldStone=true, weddingType=fractured, sorynReleased=true` hits every branch.

---

## Risks

- **Branch explosion.** 3 wedding × 2 Soryn × 5 tiers × goldStone = 60 leaves. Mitigation: 90% dialog shared; only 4 branches swap.
- **Boss readability.** Phase-2 shade cycling needs the small label or it's just a flicker.
- **ASCEND framing.** Long road vs. short road must feel like a *trade*, not a cheat — the lore entry makes the trade explicit.

