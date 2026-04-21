/**
 * Sun Sphere — per-zone secondary props and environmental reads.
 *
 * Each zone gets:
 *  - one or two **environmental reads** (small inspectable plaques, pages,
 *    captions, keepsakes) the player can interact with in addition to the
 *    main witness/operation. Reads do not gate progression but provide
 *    plateau ecology and emotional texture.
 *  - a **softening flag** consumed by SunArt.addSunAftermath to dim the
 *    main hero element once the zone's primary work is done.
 *
 * SunPlateauScene reads this module to spawn the extra hotspots and to
 * decide how strong the aftermath overlay should be.
 */

import type { SunZoneId } from "./SunData";

export type SunEnvRead = {
  /** Stable id; used as a save flag once read so the player can revisit calmly. */
  id: string;
  /** Hotspot label shown in the footer hint. */
  label: string;
  /** Hotspot screen position in GBC pixels. */
  x: number;
  y: number;
  /** Multi-line prose; rendered through runDialog. */
  lines: { who: string; text: string }[];
  /** Optional state-change line shown on revisit after first read. */
  revisit?: { who: string; text: string };
};

export const SUN_ENV_READS: Record<SunZoneId, SunEnvRead[]> = {
  vestibule: [
    {
      id: "sun_env_left_plaque",
      label: "READ LEFT PLAQUE",
      x: 14,
      y: 64,
      lines: [
        { who: "PLAQUE", text: "ENTERED LATE. ADMIRED. NEVER TROUBLED THE PROCEEDINGS." },
        { who: "?", text: "It is a flattering inscription. It would survive almost any biography." },
      ],
      revisit: {
        who: "?",
        text: "The plaque is the same. You are not. That is most of the point.",
      },
    },
    {
      id: "sun_env_right_plaque",
      label: "READ RIGHT PLAQUE",
      x: 146,
      y: 64,
      lines: [
        { who: "PLAQUE", text: "RECEIVED WITH HONOURS. DEPARTED WITHOUT INCIDENT." },
        { who: "?", text: "Honours and incidents are not opposites. The plaque pretends they are." },
      ],
    },
  ],
  testimony: [
    {
      id: "sun_env_left_banner",
      label: "READ LEFT BANNER",
      x: 40,
      y: 36,
      lines: [
        { who: "BANNER", text: "TESTIMONY IS HEARD HERE. ADMIRATION IS HEARD ELSEWHERE." },
        { who: "?", text: "The hall has bothered to make the distinction in cloth. That is encouraging." },
      ],
    },
    {
      id: "sun_env_right_banner",
      label: "READ RIGHT BANNER",
      x: 120,
      y: 36,
      lines: [
        { who: "BANNER", text: "WHAT YOU CANNOT SAY HERE, YOU CANNOT CARRY OUT." },
        { who: "?", text: "Half threat, half mercy. The hall is not subtle about its terms." },
      ],
    },
  ],
  archive: [
    {
      id: "sun_env_redacted",
      label: "EXAMINE REDACTED LINE",
      x: 56,
      y: 47,
      lines: [
        { who: "PAGE", text: "[REDACTED] WAS NEVER MEANT TO BECOME A STORY." },
        { who: "?", text: "The bar is heavy enough to read through. That is usually the point of redaction." },
      ],
      revisit: {
        who: "?",
        text: "You can almost make out the word under the bar. You decide not to push the page further today.",
      },
    },
    {
      id: "sun_env_marginalia",
      label: "READ MARGIN NOTE",
      x: 22,
      y: 46,
      lines: [
        { who: "MARGIN", text: "Author was not in the room when this happened. Cf. ledger 4." },
        { who: "?", text: "A stranger has been correcting your account. Their handwriting is steadier than yours." },
      ],
    },
  ],
  mirrors: [
    {
      id: "sun_env_caption_left",
      label: "READ LEFT CAPTION",
      x: 18,
      y: 80,
      lines: [
        { who: "CAPTION", text: "AS YOU APPEAR WHEN YOU ARE THE MAIN GUEST." },
        { who: "?", text: "The reflection is more confident than you remember being. That is part of being the main guest." },
      ],
    },
    {
      id: "sun_env_caption_right",
      label: "READ RIGHT CAPTION",
      x: 142,
      y: 80,
      lines: [
        { who: "CAPTION", text: "AS YOU APPEAR WHEN YOU THINK NO ONE IS LOOKING." },
        { who: "?", text: "Less ornament. Worse posture. More face." },
      ],
    },
  ],
  warmth: [
    {
      id: "sun_env_letters",
      label: "READ FOLDED LETTER",
      x: 22,
      y: 76,
      lines: [
        { who: "LETTER", text: "I miss you the way you were before you became impressive." },
        { who: "?", text: "Signed in a hand that knew yours before it learned to perform." },
      ],
      revisit: {
        who: "?",
        text: "You leave the letter as you found it. It does not need to be answered today.",
      },
    },
    {
      id: "sun_env_portrait",
      label: "EXAMINE PORTRAIT",
      x: 140,
      y: 74,
      lines: [
        { who: "PORTRAIT", text: "Painted in the year you were unbearable and forgivable in roughly equal measure." },
        { who: "?", text: "Both qualities are visible. The painter was generous and accurate at the same time." },
      ],
    },
  ],
  threshold: [
    {
      id: "sun_env_left_pillar",
      label: "READ LEFT PILLAR",
      x: 40,
      y: 76,
      lines: [
        { who: "PILLAR", text: "ENTER ONLY WHEN YOU CAN BE NAMED WITHOUT COMPLIMENT." },
        { who: "?", text: "Helion is not unreasonable. The terms are simply specific." },
      ],
    },
    {
      id: "sun_env_right_pillar",
      label: "READ RIGHT PILLAR",
      x: 120,
      y: 76,
      lines: [
        { who: "PILLAR", text: "WHAT WAITS BEYOND PREFERS PRECISION TO PRAISE." },
        { who: "?", text: "You consider whether you do, too." },
      ],
    },
  ],
};

/**
 * 0..1 progress for the per-zone aftermath overlay.
 *  - 0.5 once the zone's main witness OR operation is complete
 *  - 1.0 once both are complete (or the threshold is fully ready)
 */
export function sunZoneAftermath(
  zone: SunZoneId,
  witnessDone: boolean,
  opDone: boolean,
  thresholdReady: boolean,
): number {
  if (zone === "threshold") return thresholdReady ? 1 : 0;
  if (witnessDone && opDone) return 1;
  if (witnessDone || opDone) return 0.5;
  return 0;
}
