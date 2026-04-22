

# Canon Unification — Final Execution Plan (Revised)

Single source of truth: `src/game/canon/registry.ts`. Every public-facing surface and active code path derives scene/chapter identity from the registry. Compatibility shims survive only as migration plumbing, never as public truth. All public `SORYN` references are removed; the companion class is renamed.

## Phase 1 — Registry Foundation
1. Create `src/game/canon/registry.ts`:
   - `SCENE_KEYS`, `SPHERE_KEYS` (canonical, includes Jupiter/Saturn).
   - `CHAPTER_REGISTRY`, `SCENE_REGISTRY` (id → public label, role, chapter).
   - `MAINLINE_SCENE_ORDER`, `getImplementedMainlineSceneOrder()`.
   - `LEGACY_ACT_NUMBER_BY_SCENE`, `LEGACY_ACT_TITLES`, `PUBLIC_SCENE_LABELS`.
   - Helpers: `getPublicSceneLabel`, `getPublicChapterTitle`, `getDevJumpLabel`, `getDevJumpReadout`, `getImplementedDevJumpScenes`, `isSceneImplemented`, `isSecretAnnexScene`.
2. Create `src/game/canon/scenePresentation.ts`:
   - `canonicalSceneLabel`, `canonicalChapterTitle`, `canonicalLegacyAct`, `buildSceneSnapshotBase(sceneKey)`.

## Phase 2 — Canon Core Refactor
3. `src/game/canon/canon.ts` — derive `CHAPTER_TITLE`, `CANON_SCENE_CHAPTER`, `CANON_SCENE_ROLE` from registry. Preserve all current exports (sphere governors/garments/verbs/questions stay).
4. `src/game/types.ts` — keep `ACT_BY_SCENE`, `ACT_TITLES`, `SCENE_LABEL` as **compatibility shims only**, derived from registry. Update legacy strings (e.g. `"ACT I - MOON / THE GREAT WORK"` → registry-canonical `"ACT I — MOON"`; remove `"Great Work - …"` labels in `SCENE_LABEL`). Keep section comments factually accurate (rename `ACT 2 — THE GREAT WORK` → `SECRET ANNEX — ATHANOR / GREAT WORK`).
5. `src/game/canon/mainlineFlow.ts` — rebuild navigation from `getImplementedMainlineSceneOrder()`.

## Phase 3 — HUD Bootstrap
6. `src/game/scenes/hud.ts` — replace direct `SCENE_LABEL` / `ACT_BY_SCENE` reads with `buildSceneSnapshotBase(sceneKey)`.

## Phase 4 — Title Scene + Dev Jump
7. `src/game/scenes/TitleScene.ts`:
   - Delete `devMenuLabel` and all hardcoded `"GREAT WORK"` / `"INTERLUDE · METAXY"` strings.
   - Source dev-jump labels/readouts from `getDevJumpLabel(scene)` / `getDevJumpReadout(scene)`.
   - Filter visible jumps by `getImplementedDevJumpScenes()` ∩ `scene.manager.keys` (Jupiter/Saturn hidden until registered).
   - Secret annex entries labeled `SECRET ANNEX · …`, never Moon/Great Work chapter identity.

## Phase 5 — Desktop Codex
8. `src/components/game/desktop/DesktopCodexSurface.tsx`:
   - Replace `Act {scene.act}` row with `getPublicChapterTitle(scene.key)`.
   - Replace `scene.label` reads (header + `DesktopSurfaceFrame` subtitle) with `getPublicSceneLabel(scene.key)`.
   - Rename `KV label="Soryn"` → `label="Sophene"` (value mapping unchanged; legacy save flag still read).

## Phase 6 — Metaxy Hub
9. `src/game/scenes/MetaxyHubScene.ts`:
   - `ANNEX_PORTAL.label`: `"GREAT WORK ANNEX"` → `"SECRET ANNEX"`.
   - Snapshot label uses `getPublicSceneLabel("MetaxyHub")` (canonical: `"Metaxy"`).
   - Update header comments — annex described as "secret annex", not "Great Work annex".
   - Ensure no numeric act number is rendered for Metaxy (registry returns null/empty for legacy act on Metaxy → consumers display "—" / chapter title only).

## Phase 7 — Snapshot Publishers + Consumers (BOTH)

**Publishers** — patch every `setSceneSnapshot(...)` call to use `getPublicSceneLabel(sceneKey)`:
- `src/game/spheres/scenes/{mercury,venus,mars,jupiter,saturn}.ts`
- `src/game/scenes/{ImaginalRealmScene,SilverThresholdScene,MoonTrialScene,SunPlateauScene,SunTrialScene,EndingsRouterScene,MetaxyHubScene}.ts`
- `src/game/spheres/{SpherePlateauScene,SphereTrialScene}.ts`
- `src/game/spheres/venus/VenusMinimap.ts`

**Consumers (NEW required scope)** — patch every UI surface that reads `scene.act` / `scene.label` so the registry, not snapshot fields, is the public truth:
- `src/components/game/touch/TouchStatsStrip.tsx` — replace `ACT {scene.act}` + `scene.label` with `getPublicChapterTitle(scene.key)` + `getPublicSceneLabel(scene.key)`.
- `src/components/game/touch/TouchMiniMapPanel.tsx` — same.
- `src/components/game/desktop/DesktopStatsBar.tsx` — same (drop `ACT {scene.act}`, show chapter title).
- `src/components/game/desktop/DesktopMapDock.tsx` — same.
- `src/components/game/desktop/DesktopCommandRail.tsx` — same.
- `src/components/game/desktop/DesktopShellSettings.tsx` — same.
- `src/components/game/desktop/DesktopNarrativeDock.tsx` — replace `scene.label` reads with `getPublicSceneLabel(scene.key)`.

`scene.act` continues to exist on the snapshot for save-system compatibility, but no UI renders it as primary truth.

## Phase 8 — Public SORYN → SOPHENE (Repo-Wide)

Every player-facing string and active runtime label converts. Save-flag keys (`soryn_bound`, `sorynReleased`, etc.) remain as migration aliases — already mapped in `migrateCanon.ts`.

Files to patch (`who: "SORYN"` and visible "Soryn" copy):
- `src/game/spheres/configs/venus.ts`, `src/game/spheres/configs/mars.ts`
- `src/game/spheres/scenes/mars.ts` (bootstrap dialogue)
- `src/game/spheres/SpherePlateauScene.ts` (3 dialogue lines)
- `src/game/scenes/CitrinitasScene.ts` (annex narration — now in scope)
- `src/game/scenes/AlbedoScene.ts`, `RubedoScene.ts`, `SealedVesselScene.ts` (annex narration — now in scope)
- `src/game/athanor/wedding.ts` (annex narration — now in scope)
- `src/game/scenes/imaginal/soulArcs.ts` (any visible "Soryn" speaker)
- `src/game/sideQuests.ts` — `release_soryn` quest title `"RELEASE THE DAIMON"` is fine; quest id stays for save-flag compat. Visible label already neutral; verify no "Soryn" in title strings.
- `src/game/encounters/EncounterProfile.ts` — update doc comment example "SORYN" → "SOPHENE".
- `src/game/athanor/vessel.ts` — code comments mentioning Soryn updated; logic unchanged.
- Any `runDialog`/`speak` call repo-wide using `who: "SORYN"` → `who: "SOPHENE"`.

Audit grep covers `SORYN`/`Soryn` across all of `src/`.

## Phase 9 — Companion Rename (Mandatory Final State)
10. `src/game/companion.ts` — rename class `SorynCompanion` → `SopheneCompanion`. Update doc header.
11. Update **all import sites** to `SopheneCompanion` (search `SorynCompanion` repo-wide; expected ~5–10 sites: `ImaginalRealmScene`, plateau scenes, etc.).
12. Remove the `SorynCompanion` alias export. Final state: no `SorynCompanion` symbol in `src/`.

## Phase 10 — createGame Honesty
13. `src/game/createGame.ts` — comment block clarifies: Jupiter/Saturn scenes are canonical in the registry but intentionally not yet runtime-registered.

## Phase 11 — Audit & QA
14. Run mandatory greps; expected outcomes:
    - `scene.act`, `snapshot.act` → only inside snapshot type definition + save persistence; **no UI usage**.
    - `scene.label` → only inside snapshot type / bridge internals; **no UI usage**.
    - `SCENE_LABEL`, `ACT_TITLES`, `ACT_BY_SCENE` → only inside compatibility shim definitions and save-system writes (`save.act = ACT_BY_SCENE.X`); **no UI/presentation usage**.
    - `SORYN`, `Soryn` → only inside save-flag key strings, migration aliases, and the legacy `SorynCompanion` rename's removal site (none left after Phase 9). Zero player-facing matches.
    - `SorynCompanion` → zero matches.
    - `Metaxy Hub` → zero (canonical is `"Metaxy"`).
    - `GREAT WORK ANNEX`, `MOON / THE GREAT WORK`, `Great Work -`, `ACT 10`, `ACT 3 · MOON THR.` → zero.
15. `npm run build` passes cleanly.

## Acceptance (final)
- One public act/chapter model (registry).
- Metaxy = connective interlude, never a numbered act in any UI.
- Athanor scenes = `SECRET ANNEX`, never Moon/Great Work chapter identity.
- `CuratedSelf` = Sun district (already correct in registry; verify).
- Zero player-facing `SORYN`/`Soryn`. No exported `SorynCompanion`.
- Zero UI rendering of `Act {scene.act}` or raw `scene.label` as primary truth.
- Jupiter/Saturn canonical in registry, hidden from runtime menus.
- `scene.act` survives only for save persistence; never as public truth.

## Risks
- **Save migration**: legacy `save.act` numeric writes continue (`save.act = ACT_BY_SCENE.X`). This is the only sanctioned use of the compatibility shim. All UI reads of `scene.act` are removed.
- **Snapshot bridge type**: `SceneSnapshot.act` and `.label` remain (data still published); only their UI consumption changes. No bridge-shape break.
- **Companion alias removal**: requires sweeping all `SorynCompanion` import sites in one pass; will be done as part of Phase 9 to avoid leaving a half-migrated alias.

