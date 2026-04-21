import * as Phaser from "phaser";
import type { EncounterProfile } from "./EncounterProfile";
import { makeEncounterAura, type EncounterAuraHandle } from "./EncounterAura";
import { makeEncounterNameplate, type EncounterNameplateHandle } from "./EncounterNameplate";
import { runEncounterIntro } from "./EncounterIntro";
import { GBC_W } from "../gbcArt";
import { getAudio } from "../audio";
import type { SaveSlot } from "../types";

/**
 * Combined per-figure presentation: aura + nameplate + first-meet intro.
 *
 * Scenes typically construct one of these per major figure (Soryn, each
 * Guardian, each Knot, each Soul) at the figure's world position, then call:
 *   - `introOnce(flagKey, save)`  on first proximity / first interaction
 *   - `pulse()`                   when the figure reacts (companion bark, etc.)
 *   - `soften()`                  on resolution (knot cleared, soul resolved)
 *   - `destroy()`                 on scene shutdown
 *
 * The intro card and aura both live in screen / world space respectively,
 * so this handle does not need to be re-attached when Rowan moves.
 */
export type EncounterPresentationHandle = {
  introOnce(flagKey: string, save: SaveSlot, onDone?: () => void): void;
  pulse(): void;
  soften(): void;
  showPlate(): void;
  hidePlate(): void;
  setPosition(x: number, y: number): void;
  destroy(): void;
};

export function createEncounterPresentation(
  scene: Phaser.Scene,
  x: number,
  y: number,
  profile: EncounterProfile,
): EncounterPresentationHandle {
  const aura: EncounterAuraHandle = makeEncounterAura(
    scene,
    x,
    y,
    profile.introStyle,
    profile.palette,
  );

  // Nameplate sits ~22px above the figure but is clamped to viewport so it
  // doesn't run off the left/right edge of the GBC screen.
  const plateW = 124;
  const plateX = Math.max(2, Math.min(GBC_W - plateW - 2, x - plateW / 2));
  const plateY = Math.max(2, y - 26);
  const plate: EncounterNameplateHandle = makeEncounterNameplate(
    scene,
    plateX,
    plateY,
    profile.displayName,
    profile.subtitle,
    plateW,
  );

  return {
    introOnce(flagKey, save, onDone) {
      // Persistent flag. After first reveal the player should not see the
      // intro again across saves — the figure becomes part of the world.
      if (save.flags[flagKey]) {
        onDone?.();
        return;
      }
      save.flags[flagKey] = true;
      if (profile.soundCue) {
        try {
          // Sound key set is intentionally narrow; swallow if unmapped.
          (getAudio().sfx as (k: string) => void)(profile.soundCue);
        } catch {
          // ignore unmapped cues
        }
      }
      aura.pulse();
      runEncounterIntro(scene, profile, () => {
        onDone?.();
      });
    },
    pulse() {
      aura.pulse();
    },
    soften() {
      aura.soften();
    },
    showPlate() {
      plate.show();
    },
    hidePlate() {
      plate.hide();
    },
    setPosition(nx, ny) {
      aura.root.setPosition(nx, ny);
    },
    destroy() {
      aura.destroy();
      plate.destroy();
    },
  };
}
