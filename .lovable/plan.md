

## Audit findings & fix plan

I ran TypeScript (`tsc --noEmit` → clean), ESLint, and grepped every key listener in the game. The build is healthy, but there are **real correctness bugs** plus a lot of cosmetic noise.

### 1. CRITICAL — Rebinding keys silently fails almost everywhere

The new Settings menu lets the player rebind every action, but **14 files still listen to hard-coded Phaser keys** (`keydown-SPACE`, `keydown-ENTER`, `keydown-UP/DOWN/LEFT/RIGHT`, `keydown-B`, `keydown-Q`). If a player rebinds A from SPACE to, say, `Z`, none of these will respond:

| File | What breaks |
|---|---|
| `inquiry.ts` | All offering / daimon / soul choices |
| `hud.ts runDialog` (already fixed) | OK |
| `lore.ts` | Lore log nav + close |
| `companion.ts` | Daimon open (B/Q) + advance |
| `LastDayScene.ts` | Interact (A), coat-fold mini |
| `CrossingScene.ts` | Door interact + witness (B/Q) |
| `SilverThresholdScene.ts` | Interact (top-level) |
| `ImaginalRealmScene.ts` | Interact |
| `CuratedSelfScene.ts` | Command menu + epilogue menu |
| `EncounterScene.ts` | Command menu |
| `TitleScene.ts` | Title menu |
| `imaginal/knots.ts` | All 5 knot mini-games |
| `minigames/rhythmTap.ts` | Tap input |

**Fix**: Replace every `scene.input.keyboard?.on("keydown-XXX", h)` that maps to a logical action with the centralized helper from `controls.ts`:
- Use existing `onActionDown(scene, "action" | "cancel" | "up" | …, handler)`.
- For Title's BACKSPACE (erase save) and the literal arrow-only menus, keep DOM listeners but read the player's bindings from `getControls()` so rebinds apply.
- Add a small helper `onDirection(scene, handler)` that fires once per `up/down/left/right` keypress (mirroring `onActionDown`), so menu navigation works after rebinding.

### 2. Companion B/Q hard-coded

`companion.ts` opens the daimon panel on raw `keydown-Q`/`keydown-B`. Switch to `onActionDown(scene, "cancel", openSpeak)` so it follows the rebound "B / Witness" key.

### 3. Settings overlay vs. gear button — re-entrancy

The touch-pad's gear button calls `openSettings(...)` directly, bypassing the `settingsOpen` flag in `attachHUD`. Tapping the gear while the Lore Log is open (or twice quickly on slow devices) can stack overlays. Fix: have the gear set/clear the same `settingsOpen` flag (move it into a module-scope ref or expose a setter).

### 4. Inquiry + scene interaction double-fire

When `runInquiry` is open during e.g. SilverThreshold, the scene's own `keydown-SPACE → tryInteract` still fires. It's currently guarded by `dialogActive`, but `dialogActive` is set inconsistently before the inquiry — confirm in `SilverThresholdScene.openOffering` and the `daimonChoice`/`endRemain` flows that `dialogActive=true` is set before inquiry opens, and reset after.

### 5. `tryInteract` listeners leak across scene restarts

Several scenes register `keydown-SPACE/ENTER → tryInteract` in `create()` but never explicitly remove them. Phaser's keyboard plugin clears its own listeners on scene shutdown, so this is safe today — but the new DOM-level listeners we'll add in fix #1 must be removed on `shutdown` and `destroy` (mirror the pattern already in `hud.ts`).

### 6. Lint / cosmetics (low priority)

- 11 `@typescript-eslint/no-explicit-any` warnings in `types.ts` (migration shim), `audio.ts`, `companion.ts`. Tighten to proper types.
- 1,248 prettier formatting errors — purely whitespace / line-length. Run `eslint --fix` to bulk-resolve.

### Implementation order

1. Add `onDirection(scene, handler)` to `controls.ts` alongside the existing `onActionDown`.
2. Refactor `inquiry.ts`, `lore.ts`, `companion.ts`, `rhythmTap.ts`, and `imaginal/knots.ts` first (highest player-visible impact).
3. Refactor scene-level interact listeners: `LastDay`, `Crossing`, `SilverThreshold`, `ImaginalRealm`.
4. Refactor command menus: `CuratedSelf` (both classes), `Encounter`, `Title` (keep BACKSPACE special).
5. Make companion B/Q rebindable (#2).
6. Fix gear / settings re-entrancy (#3).
7. Audit `dialogActive` gating around every `runInquiry` call (#4).
8. Type-tighten the 11 `any`s and run `eslint --fix` for formatting.

### Risk

Mostly mechanical refactor — same handler bodies, different registration. Risk concentrated in (a) ensuring `cleanup()` paths in inquiry/knots/rhythmTap match the new listener shape and (b) Title menu, which has unique BACKSPACE behavior we must preserve.

### What this delivers

After the fix, every keyboard interaction in the game — dialog advance, inquiry choice, knot mini-game, menu nav, witness, lore, settings, mute, CRT — will follow whatever the player set in Settings → Keys, on every scene. The promised iPhone+desktop control system actually works end-to-end.

