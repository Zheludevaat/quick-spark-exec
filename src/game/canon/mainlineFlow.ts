/**
 * Mainline scene flow derived from implemented canonical scenes only.
 * This keeps runtime routing honest while allowing the registry to
 * contain future canonical chapters that are not yet registered.
 */
import {
  getImplementedMainlineSceneOrder,
  isImplementedMainlineScene,
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
  return isImplementedMainlineScene(scene);
}
