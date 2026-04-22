/**
 * Mainline scene flow — derived from the canonical registry. Only
 * implemented scenes are reachable; Jupiter/Saturn skip ahead to the
 * next implemented scene until their content lands.
 */
import {
  getImplementedMainlineSceneOrder,
  SCENE_REGISTRY,
  type SceneKey,
} from "./registry";

export function nextMainlineScene(scene: SceneKey): SceneKey {
  const order = getImplementedMainlineSceneOrder();
  const i = order.indexOf(scene);
  if (i < 0 || i === order.length - 1) return scene;
  return order[i + 1];
}

export function previousMainlineScene(scene: SceneKey): SceneKey {
  const order = getImplementedMainlineSceneOrder();
  const i = order.indexOf(scene);
  if (i <= 0) return scene;
  return order[i - 1];
}

export function isMainlineChapterScene(scene: SceneKey): boolean {
  return SCENE_REGISTRY[scene].role !== "secret_annex";
}
