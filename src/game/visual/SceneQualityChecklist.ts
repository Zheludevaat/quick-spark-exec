/**
 * Scene quality checklist — the bar every authored room should clear.
 *
 * Not enforced at runtime; used as a self-check during scene authoring to
 * keep the standards pass disciplined. A room that fails any item should
 * either be revised or explicitly justified in code comments.
 */
export type SceneQualityChecklist = {
  hasClearFocalPoint: boolean;
  hasReadableWalkSurface: boolean;
  hasOneDominantLandmark: boolean;
  hasDistinctSilhouette: boolean;
  hasLimitedFxPalette: boolean;
  hasAftermathState: boolean;
  hasInteractionReadability: boolean;
};

export function passesSceneQualityChecklist(c: SceneQualityChecklist): boolean {
  return (
    c.hasClearFocalPoint &&
    c.hasReadableWalkSurface &&
    c.hasOneDominantLandmark &&
    c.hasDistinctSilhouette &&
    c.hasLimitedFxPalette &&
    c.hasAftermathState &&
    c.hasInteractionReadability
  );
}
