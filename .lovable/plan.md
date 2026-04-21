

# Fix Act 2 Visual Errors

The six Act 2 scenes all mount the new global top stat bar (y=0..13) and the centered bottom vessel HUD plate (y=92..114, x=32..128), but their decorative art and labels were positioned for the old HUD-less layout. This pass repositions only the in-scene art/labels — no gameplay logic, no save changes.

## Reserved zones (do not place content here)

- **Top HUD plate**: y=0..13, full width.
- **Vessel HUD plate**: y=92..114, x=32..128 (only in scenes that mount it).

## Per-scene fixes

### AthanorThresholdScene
- **Doors**: currently rect at y=18 size 22 → spans y=7..29, top edge **inside HUD bar**. Move door y from 18 → 24 (now spans 13..35). Glow circles move from y+14=32 → y+14=38. Inline 4-letter labels follow at y+14=38.
- **Hint text**: currently y=GBC_H-22 = 122 — sits **just below vessel plate** (114) but still touches the touch-pad band. Keep at 122 but shorten width clamp to GBC_W-8 to avoid overlap with Echo label at x=136.
- **Echo blob + label**: x=146/136, y=116/122. Moves to y=118/124 to clear vessel plate edge cleanly.
- **VESSEL center label**: at (66, 66) — clear of plate (plate top is 92). No change.

### NigredoScene
- **Furnace rect**: at center (80, 72) size 32x24 → spans y=60..84. Clear.
- **FURNACE label**: at (66, 90) — **overlaps vessel HUD plate top edge (y=92)**. Move label up to y=86.
- **Furnace glow circle**: at (80, 72) — clear.

### AlbedoScene
- **BATH OF STARS label**: at (62, 50) — clear.
- **Bath rect**: at (80, 72) size 60x30 → y=57..87. Clear.
- No changes needed.

### CitrinitasScene
- **THE SCRIPTORIUM label**: at (50, 14) — **overlaps top HUD bottom edge**. Move to y=16 (clears HUD by 1px gap; text is 7px tall so spans 16..23, still above mote field).

### RubedoScene
- **THE WEDDING label**: at (52, 14) — same overlap. Move to y=16.
- **Teacher sentence ribbon**: at (6, 22) — currently fine. After moving title to 16, ribbon stays at 22 (clear).

### SealedVesselScene
- **Remove `mountVesselHud` call entirely** — per the existing design intent (ritual-clean vessel scene; the inscription IS the moment). Also removes the SHUTDOWN destroy hook for `vesselHud`. The seal art (circle + glass at center) becomes the only vessel imagery.
- **THE SEALED VESSEL label**: at (54, 96) — currently overlapped by the very plate we're removing. Keep at y=96 (now clear) OR move to y=98 to give the seal art more breathing room. Pick y=98.
- **Vessel glass rect**: at (80, 72) size 16x30 → y=57..87. Clear.
- **Vessel circle**: at (80, 72) radius 18 → y=54..90. Clear.
- **Teacher sentence ribbon**: at (6, 18) — clear of HUD by 5px. No change.

## Files touched

- `src/game/scenes/AthanorThresholdScene.ts` — door y constant, hint clamp, Echo y nudge.
- `src/game/scenes/NigredoScene.ts` — FURNACE label y.
- `src/game/scenes/CitrinitasScene.ts` — title y.
- `src/game/scenes/RubedoScene.ts` — title y.
- `src/game/scenes/SealedVesselScene.ts` — drop `mountVesselHud` import + call + shutdown hook; nudge SEALED VESSEL label.

## What I will NOT change

- No gameplay logic, dialog, save fields, audio, or quest/lore behavior.
- No edits to `vessel.ts`, `hud.ts`, or `gbcArt.ts`.
- AlbedoScene art is already clear — no edits.

## Smoke test

1. Title → DEV → AthanorThreshold. Confirm: top HUD visible, four doors fully below it (no pixel bleed), vessel plate centered at bottom, hint readable, Echo label not overlapping vessel plate.
2. Enter each operation in order. Confirm: Nigredo furnace label clears vessel plate; Citrinitas/Rubedo titles clear top HUD; Albedo unchanged.
3. Complete all four ops → SealedVessel. Confirm: NO vessel HUD plate at bottom; seal art (circle + glass + label) is unobstructed centerpiece; teacher-sentence ribbon (if earned) fades cleanly.
4. Resize to 475x500. Confirm: Phaser FIT scaling preserves layout; nothing clips.

