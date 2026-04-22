/**
 * Scene presentation helpers — derive snapshot bootstrap from the
 * canonical registry. Used by `attachHUD` and any scene that needs a
 * baseline `setSceneSnapshot(...)` payload before its own publisher
 * augments it with zone/nodes/marker/idle copy.
 */

import {
  CHAPTER_REGISTRY,
  LEGACY_ACT_NUMBER_BY_SCENE,
  SCENE_REGISTRY,
  type SceneKey,
} from "./registry";

export function canonicalSceneLabel(scene: SceneKey): string {
  return SCENE_REGISTRY[scene].label;
}

export function canonicalChapterTitle(scene: SceneKey): string {
  return CHAPTER_REGISTRY[SCENE_REGISTRY[scene].chapter].title;
}

export function canonicalLegacyAct(scene: SceneKey): number {
  return LEGACY_ACT_NUMBER_BY_SCENE[scene];
}

export function canonicalSceneRole(scene: SceneKey) {
  return SCENE_REGISTRY[scene].role;
}

/**
 * Minimal shell-baseline snapshot. Caller spreads in zone/nodes/etc.
 * Use this everywhere instead of reading legacy SCENE_LABEL/ACT_BY_SCENE.
 */
export function buildSceneSnapshotBase(scene: SceneKey) {
  return {
    key: scene,
    label: canonicalSceneLabel(scene),
    act: canonicalLegacyAct(scene),
    zone: null as string | null,
    nodes: null,
    marker: null,
  };
}
