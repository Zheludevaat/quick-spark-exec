import * as Phaser from "phaser";
import { COLOR, GBCText } from "../gbcArt";

/**
 * Compact identity strip for a major figure or encounter object.
 *
 * Sits above the figure as a thin GBC-styled chip with NAME on top and
 * SUBTITLE below. Hidden by default; shown via `show()`, hidden via
 * `hide()`. Owned by the caller — call `destroy()` on scene shutdown.
 *
 * Designed to read at GBC scale (160x144), so we cap visual width and
 * lean on `GBCText` wrapping for any oversize subtitle.
 */
export type EncounterNameplateHandle = {
  show(): void;
  hide(): void;
  destroy(): void;
};

export function makeEncounterNameplate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  subtitle: string | undefined,
  width = 120,
): EncounterNameplateHandle {
  // Background plate — slightly inset so it reads as a chip, not a HUD bar.
  const plateH = subtitle ? 18 : 10;
  const bg = scene.add
    .rectangle(x, y, width, plateH, 0x0a0e1a, 0.85)
    .setOrigin(0, 0)
    .setDepth(220);
  bg.setStrokeStyle(1, 0x2a3550, 0.6);

  const nameObj = new GBCText(scene, x + 3, y + 2, name, {
    color: COLOR.textGold,
    depth: 221,
    maxWidthPx: width - 6,
  });

  const subObj = subtitle
    ? new GBCText(scene, x + 3, y + 10, subtitle, {
        color: COLOR.textAccent,
        depth: 221,
        maxWidthPx: width - 6,
      })
    : null;

  const setVisible = (v: boolean) => {
    bg.setVisible(v);
    nameObj.setVisible(v);
    subObj?.setVisible(v);
  };

  setVisible(false);

  return {
    show() {
      setVisible(true);
      bg.setAlpha(0);
      nameObj.obj.setAlpha(0);
      subObj?.obj.setAlpha(0);
      const targets: Phaser.GameObjects.GameObject[] = [bg, nameObj.obj];
      if (subObj) targets.push(subObj.obj);
      scene.tweens.add({ targets, alpha: 1, duration: 180 });
    },
    hide() {
      const targets: Phaser.GameObjects.GameObject[] = [bg, nameObj.obj];
      if (subObj) targets.push(subObj.obj);
      scene.tweens.add({
        targets,
        alpha: 0,
        duration: 180,
        onComplete: () => setVisible(false),
      });
    },
    destroy() {
      bg.destroy();
      nameObj.destroy();
      subObj?.destroy();
    },
  };
}
