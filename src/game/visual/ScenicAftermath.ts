/**
 * Scenic aftermath — re-export of the canonical ActAftermath helpers under
 * the visual/ namespace so new authored acts can import everything from one
 * place. The originals in `game/exploration/ActAftermath.ts` continue to
 * serve existing acts.
 */
export {
  spawnMemoryRing,
  spawnToneOverlay,
  flashResolve,
  type AftermathHandle,
} from "../exploration/ActAftermath";
