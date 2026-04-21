import * as Phaser from "phaser";
import { COLOR, GBC_W, GBCText } from "../gbcArt";
import type { EncounterProfile } from "./EncounterProfile";

/**
 * Brief, non-blocking intro card for a first-meeting moment.
 *
 * Shows NAME + SUBTITLE inside a screen-centered chip near the top of the
 * GBC viewport, fades in, holds ~900ms, fades out. Does not block input,
 * does not freeze the scene — designed to land while the player is still
 * walking, the way Pokemon HM cut-ins or Crystal trainer-name plates land.
 *
 * Caller decides when to fire (typically once, on first proximity or first
 * dialogue trigger), and supplies `onDone` for any follow-up flow.
 */
export function runEncounterIntro(
  scene: Phaser.Scene,
  profile: EncounterProfile,
  onDone?: () => void,
): void {
  const w = 124;
  const h = profile.subtitle ? 20 : 12;
  const x = Math.floor((GBC_W - w) / 2);
  const y = 18;

  const card = scene.add.rectangle(x, y, w, h, 0x0a0e1a, 0.92).setOrigin(0, 0).setDepth(240);
  card.setStrokeStyle(1, profile.palette.primary, 0.85);
  card.setScrollFactor(0);

  const name = new GBCText(scene, x + 4, y + 3, profile.displayName, {
    color: COLOR.textGold,
    depth: 241,
    maxWidthPx: w - 8,
    scrollFactor: 0,
  });

  const subtitle = profile.subtitle
    ? new GBCText(scene, x + 4, y + 11, profile.subtitle, {
        color: COLOR.textAccent,
        depth: 241,
        maxWidthPx: w - 8,
        scrollFactor: 0,
      })
    : null;

  // Fade-in / hold / fade-out via tween chain. The `hold` keyword keeps the
  // card readable for ~900ms before the yoyo back to alpha 0 cleans it up.
  const targets: Phaser.GameObjects.GameObject[] = [card, name.obj];
  if (subtitle) targets.push(subtitle.obj);
  card.setAlpha(0);
  name.obj.setAlpha(0);
  subtitle?.obj.setAlpha(0);

  scene.tweens.add({
    targets,
    alpha: { from: 0, to: 1 },
    duration: 200,
    yoyo: true,
    hold: 900,
    onComplete: () => {
      card.destroy();
      name.destroy();
      subtitle?.destroy();
      onDone?.();
    },
  });
}
