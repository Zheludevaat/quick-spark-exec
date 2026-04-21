import type { SceneKey } from "../types";

export function nextMainlineScene(scene: SceneKey): SceneKey {
  switch (scene) {
    case "LastDay":
      return "Crossing";
    case "Crossing":
      return "SilverThreshold";
    case "SilverThreshold":
      return "ImaginalRealm";
    case "ImaginalRealm":
      return "MoonTrial";
    case "MoonTrial":
      return "MetaxyHub";
    case "MetaxyHub":
      return "MercuryPlateau";
    case "MercuryPlateau":
      return "MercuryTrial";
    case "MercuryTrial":
      return "VenusPlateau";
    case "VenusPlateau":
      return "VenusTrial";
    case "VenusTrial":
      return "SunPlateau";
    case "CuratedSelf":
      return "SunPlateau";
    case "SunPlateau":
      return "SunTrial";
    case "SunTrial":
      return "MarsPlateau";
    case "MarsPlateau":
      return "MarsTrial";
    case "MarsTrial":
      return "JupiterPlateau";
    case "JupiterPlateau":
      return "JupiterTrial";
    case "JupiterTrial":
      return "SaturnPlateau";
    case "SaturnPlateau":
      return "SaturnTrial";
    case "SaturnTrial":
      return "EndingsRouter";
    case "EndingsRouter":
      return "Epilogue";
    default:
      return scene;
  }
}

export function isMainlineChapterScene(scene: SceneKey): boolean {
  return !(
    scene === "AthanorThreshold" ||
    scene === "Nigredo" ||
    scene === "Albedo" ||
    scene === "Citrinitas" ||
    scene === "Rubedo" ||
    scene === "SealedVessel"
  );
}
