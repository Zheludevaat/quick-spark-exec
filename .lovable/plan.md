

# Fix Act 3 Visual Errors

CuratedSelfScene and EpilogueScene both have UI layered without respecting the new global top stat bar or each other. Boss banners overlap the top HUD, the opening whisper overlaps the boss aura, the centered vessel plate overlaps the command box, the phase-3 PLAN label leaks across phases, and the Epilogue stuffs paragraphs + stats + option panel into the same 40px strip. This pass cleans all of it without touching gameplay logic.

## CuratedSelfScene — layout fixes

- **Top zone (y=0–13) reserved for global HUD.** Move `"CURATED SELF"` plate from y=14 down to y=15 with `width=72` and right-anchor to `GBC_W-76` so it does not crowd the top stat plate; render it on a 1-px frame to read on the gradient.
- **Phase label (`stateText`)** moves from (4, 14) to (4, 16) and gains a tiny dark backing strip so it stays legible on the sky gradient.
- **`speak()` Soryn/narrator line** currently draws at y=4, inside the global stat bar. Move to y=28 with the same dark backing, width clamped to `GBC_W - 8`, fade unchanged. Backing destroys with text.
- **`showWhisper()` opening line** currently at y=30 collides with `speak()`. Move to y=40 (below it, above the boss aura which peaks around y=18 and tails to y=64). 1.8s display, then fade.
- **`shadeLabel` cleanup.** On `enterPhase("exposed")`, call `cycleShadeFace` cleanup so the FACE: text doesn't linger when PLAN: is written. Already partially handled; ensure timer is killed and label cleared before re-set.
- **Dialog log box and command box.** The command box at y=112 h=32 collides with the centered vessel plate from `mountVesselHud`. Raise the dialog box to y=72 h=34 (was y=76 h=36) and command box to y=108 h=28 (was y=112 h=32). Update `cmdPos` Y values from 118/129/138 → 112/121/130 so all 6 commands fit inside the new box.
- **Vessel plate (mountVesselHud)**: leave as-is; it now sits in the freed bottom strip below the command box (y≈134–144 area) without overlap. Verify in vessel.ts the plate Y is `GBC_H - 10`; adjust if needed to avoid touch-pad anchors.
- **Boss vertical center** stays at y=46 — fits cleanly between whisper (y=40, fades) and dialog box (y=72).

## EpilogueScene — layout fixes

- **Title strip** "ACT THREE" + "ENDING: …" stays at y=14/24 but moves down to y=16/26 to clear the global stat bar.
- **Paragraph box**: y=36 h=70 → y=38 h=64. Paragraphs rendered with a 14px line gap (was 16) and capped at 3 entries on screen; 4th paragraph (when ascent + inscription) gets appended to paragraph 3 with a separator. Prevents overflow into the stats/options strip.
- **Stats strip** at y=108 → moved up to y=104 inside the paragraph box (last line, dim color), removed as a separate row. Frees the bottom 40px entirely for options.
- **Options panel**: keep `0xGBC_H-40` band but raise the option text Y from `GBC_H-36 + i*11` to `GBC_H-34 + i*10` so 3 options fit cleanly with the cursor mark inside the same band; cursor mark Y matches.
- **Halo + aurora ribbons**: lower halo from y=22 to y=24 to sit behind the new title position.
- **No vessel HUD mount** here (already correct — keep that way).

## What I will NOT change

- No gameplay logic, phase progression, save writes, or audio.
- No new files. No new save fields.
- `harvest.ts`, `vessel.ts`, and `hud.ts` are not edited unless `mountVesselHud`'s Y pin needs a 2-pixel nudge after testing.

## Files touched

- `src/game/scenes/CuratedSelfScene.ts` — layout constants and `cmdPos` only.
- `src/game/scenes/CuratedSelfScene.ts` (EpilogueScene class, same file) — paragraph box, stats strip, options panel positions.

## Smoke test after implementation

1. Title → DEV → CuratedSelf. Confirm top stat bar, phase label, "CURATED SELF" plate, Soryn line, opening whisper, boss, dialog box, command box, and bottom vessel plate are all visible with no overlap.
2. ADDRESS x3 → enter Phase 2. Confirm FACE: cycler appears under boss, no PLAN: ghost.
3. OBSERVE x3 → Phase 3. Confirm FACE: gone, PLAN: shown, command list still readable.
4. Trigger Epilogue (any tier). Confirm title, paragraphs, stats line, and 2–3 options all fit without clipping.
5. Resize to 475×500 viewport. Confirm Phaser FIT scaling preserves layout.

