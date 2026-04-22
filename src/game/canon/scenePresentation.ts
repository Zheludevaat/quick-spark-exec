import {
  getPublicSceneLabel,
  getPublicChapterTitle,
  LEGACY_ACT_NUMBER_BY_SCENE,
  getSceneMeta,
  type SceneKey,
} from "./registry";

export function canonicalSceneLabel(scene: SceneKey): string {
  return getPublicSceneLabel(scene);
}

export function canonicalChapterTitle(scene: SceneKey): string {
  return getPublicChapterTitle(scene);
}

export function canonicalLegacyAct(scene: SceneKey): number {
  return LEGACY_ACT_NUMBER_BY_SCENE[scene];
}

export function canonicalSceneRole(scene: SceneKey) {
  return getSceneMeta(scene).role;
}

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
