import * as Phaser from "phaser";
import {
  GBC_W,
  GBC_H,
  COLOR,
  GBCText,
  drawGBCBox,
  fitSingleLineState,
  fitSingleLineText,
} from "../gbcArt";
import {
  getControls,
  setBinding,
  setTouchLayout,
  setButtonSize,
  setHaptics,
  setLeftHanded,
  setDialogAutoAdvance,
  setInterfaceMode,
  resetControls,
  keyLabel,
  normalizeKeyEvent,
  type GameAction,
  type TouchLayout,
  type ButtonSize,
  type InterfaceMode,
} from "../controls";
import { getAudio } from "../audio";

/**
 * Full-screen settings overlay rendered inside the active scene.
 *
 * Pages:
 *   1) MAIN — display/touch/audio toggles + entry to KEYS
 *   2) KEYS — rebind every game action
 *
 * Layout zones (stable, never overlap):
 *   header     y=16..26 (title/tab + subtitle/row counter)
 *   body list  y=38..start+visibleRows*9 (windowed slice of rows)
 *   detail     y=103   (wrapped full-text readout for selected row)
 *   footer     y=120, y=128 (two ASCII-safe hint lines)
 *
 * All text is restricted to the bitmap font's supported glyph set — no
 * unicode arrows or ampersands, which would render as "?" placeholders.
 */

type Page = "main" | "keys";

const ACTION_ORDER: GameAction[] = [
  "up",
  "down",
  "left",
  "right",
  "action",
  "cancel",
  "lore",
  "settings",
  "skip",
  "mute",
  "lcd",
];
const ACTION_LABEL: Record<GameAction, string> = {
  up: "MOVE UP",
  down: "MOVE DOWN",
  left: "MOVE LEFT",
  right: "MOVE RIGHT",
  action: "A / CONFIRM",
  cancel: "B / WITNESS",
  lore: "LORE LOG",
  settings: "SETTINGS",
  skip: "SKIP DIALOG",
  mute: "MUTE",
  lcd: "CRT OVERLAY",
};

// Layout constants — derive vertical regions from actual box geometry so
// footer never clips against the bottom border and detail never collides
// with footer text.
const BOX_X = 4;
const BOX_Y = 8;
const BOX_W = GBC_W - 8;
const BOX_H = GBC_H - 16;
const BOX_BOTTOM = BOX_Y + BOX_H;

const ROW_H = 9;
const LIST_TOP = 36;

const DETAIL_LINES = 3;
const DETAIL_H = DETAIL_LINES * 9 - 2;

const FOOTER_PAD = 4;
const FOOTER_Y2 = BOX_BOTTOM - FOOTER_PAD - 8;
const FOOTER_Y1 = FOOTER_Y2 - 9;
const DETAIL_Y = FOOTER_Y1 - DETAIL_H - 3;

const LEFT_X = 16;
const LEFT_W = 90;
const RIGHT_X = GBC_W - 48;
const RIGHT_W = 40;
const FOOTER_W = GBC_W - 12;
const DETAIL_W = GBC_W - 16;

const VISIBLE_ROWS = Math.max(5, Math.floor((DETAIL_Y - LIST_TOP - 2) / ROW_H));

/**
 * Settings-local key label that swaps unicode arrows / long names for
 * font-safe ASCII so KEYS rows never render as "?". Bindings themselves
 * are unchanged — this is display only.
 */
function settingsKeyLabel(k: string): string {
  const raw = keyLabel(k);
  switch (raw) {
    case "↑":
      return "UP";
    case "↓":
      return "DN";
    case "←":
      return "LT";
    case "→":
      return "RT";
    case "SPACE":
      return "SPC";
    case "ENTER":
      return "ENT";
    default:
      return raw;
  }
}

/**
 * Compute the first visible row index for a windowed list so that the cursor
 * is kept roughly centered while clamping at both ends.
 */
function windowStart(total: number, cursor: number, visible: number) {
  if (total <= visible) return 0;
  const half = Math.floor(visible / 2);
  const maxStart = Math.max(0, total - visible);
  return Math.max(0, Math.min(maxStart, cursor - half));
}

export function openSettings(scene: Phaser.Scene, onClose?: () => void) {
  let page: Page = "main";
  let cursor = 0;
  let rebindAction: GameAction | null = null;
  let rebindSlot: "primary" | "secondary" = "primary";

  const canReturnToTitle = scene.scene.key !== "Title";

  const dim = scene.add
    .rectangle(0, 0, GBC_W, GBC_H, 0x000000, 0.86)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(950)
    .setInteractive();
  const box = drawGBCBox(scene, BOX_X, BOX_Y, BOX_W, BOX_H, 951);

  // Header row 1 — title + page-cycle hint (ASCII-safe).
  const title = new GBCText(scene, 8, 16, "SETTINGS", {
    color: COLOR.textAccent,
    depth: 952,
    scrollFactor: 0,
  });
  const tabHint = new GBCText(scene, GBC_W - 56, 16, "L/R PAGES", {
    color: COLOR.textDim,
    depth: 952,
    scrollFactor: 0,
  });

  // Header row 2 — page subtitle + row counter (e.g. "3/10").
  const subtitle = new GBCText(scene, 8, 26, "", {
    color: COLOR.textGold,
    depth: 952,
    scrollFactor: 0,
  });
  const rowCount = new GBCText(scene, GBC_W - 32, 26, "", {
    color: COLOR.textDim,
    depth: 952,
    scrollFactor: 0,
  });

  // Detail strip — full text of the selected row (wrapped, up to 2 lines).
  const detail = new GBCText(scene, 8, DETAIL_Y, "", {
    color: COLOR.textLight,
    depth: 952,
    scrollFactor: 0,
    maxWidthPx: DETAIL_W,
  });

  // Footer hints — fixed two lines, never overlap the body.
  const footer1 = new GBCText(scene, 6, FOOTER_Y1, "", {
    color: COLOR.textDim,
    depth: 952,
    scrollFactor: 0,
    maxWidthPx: FOOTER_W,
  });
  const footer2 = new GBCText(scene, 6, FOOTER_Y2, "", {
    color: COLOR.textDim,
    depth: 952,
    scrollFactor: 0,
    maxWidthPx: FOOTER_W,
  });

  // Body: re-built on each render
  const bodyObjs: Phaser.GameObjects.GameObject[] = [];
  /** Labels of the main page rows in their currently-rendered order.
   *  Dispatch routes by label so dynamic rows (legacy TOUCH OVERLAY) can
   *  appear/disappear without index drift. */
  let mainRowLabels: string[] = [];
  const clearBody = () => {
    bodyObjs.forEach((o) => {
      try {
        o.destroy();
      } catch {
        /* ignore */
      }
    });
    bodyObjs.length = 0;
  };

  type Row = { label: string; value: string };

  const buildMainRows = (): Row[] => {
    const c = getControls();
    const audio = getAudio();
    const volPct = Math.round(audio.volume * 100);
    const isTouchMode = c.interfaceMode === "touch_landscape";
    return [
      { label: "INTERFACE MODE", value: isTouchMode ? "TOUCH" : "DESKTOP" },
      { label: "BUTTON SIZE", value: c.buttonSize.toUpperCase() },
      { label: "LEFT-HANDED", value: c.leftHanded ? "ON" : "OFF" },
      { label: "HAPTICS", value: c.haptics ? "ON" : "OFF" },
      {
        label: "DIALOG AUTO-ADV",
        value: c.dialogAutoAdvanceMs === 0 ? "OFF" : `${c.dialogAutoAdvanceMs}MS`,
      },
      { label: "VOLUME", value: audio.muted ? "MUTED" : `${volPct}%` },
      { label: "AUDIO", value: audio.muted ? "OFF" : "ON" },
      // Legacy in-canvas touch overlay — only relevant outside touch_landscape.
      ...(isTouchMode
        ? []
        : [{ label: "TOUCH OVERLAY (LEGACY)", value: c.touchLayout.toUpperCase() }]),
      { label: "KEY BINDINGS", value: "" },
      ...(canReturnToTitle ? [{ label: "RETURN TO TITLE", value: "" }] : []),
      { label: "RESET DEFAULTS", value: "" },
    ];
  };

  /** Format a main row for the detail strip. */
  const mainDetailText = (r: Row): string => {
    if (!r.value) {
      if (r.label === "KEY BINDINGS") return "EDIT CONTROL BINDINGS";
      if (r.label === "RETURN TO TITLE") return "LEAVE THE CURRENT RUN AND GO TO TITLE";
      if (r.label === "RESET DEFAULTS") return "RESTORE DEFAULT CONTROL AND UI SETTINGS";
      return r.label;
    }
    return `${r.label} : ${r.value}`;
  };

  /** Format a keys row for the detail strip. */
  const keysDetailText = (a: GameAction): string => {
    const b = getControls().bindings[a];
    const right = `${settingsKeyLabel(b.primary)}${
      b.secondary ? `/${settingsKeyLabel(b.secondary)}` : ""
    }`;
    return `${ACTION_LABEL[a]} : ${right}`;
  };

  const render = () => {
    clearBody();

    if (page === "main") {
      subtitle.setText("DISPLAY AND TOUCH");
      const rows = buildMainRows();
      cursor = Math.max(0, Math.min(cursor, rows.length - 1));
      mainRowLabels = rows.map((r) => r.label);

      rowCount.setText(`${cursor + 1}/${rows.length}`);

      const start = windowStart(rows.length, cursor, VISIBLE_ROWS);
      const end = Math.min(rows.length, start + VISIBLE_ROWS);

      for (let abs = start; abs < end; abs++) {
        const r = rows[abs];
        const visIdx = abs - start;
        const y = LIST_TOP + visIdx * ROW_H;
        const isCur = abs === cursor;
        const lblState = fitSingleLineState(r.label, LEFT_W);
        const valState = fitSingleLineState(r.value, RIGHT_W);
        const arrow = new GBCText(scene, 8, y, isCur ? ">" : " ", {
          color: COLOR.textAccent,
          depth: 952,
          scrollFactor: 0,
        });
        const lbl = new GBCText(scene, LEFT_X, y, lblState.fitted, {
          color: isCur ? COLOR.textAccent : COLOR.textLight,
          depth: 952,
          scrollFactor: 0,
        });
        const val = new GBCText(scene, RIGHT_X, y, valState.fitted, {
          color: COLOR.textGold,
          depth: 952,
          scrollFactor: 0,
        });
        bodyObjs.push(arrow.obj, lbl.obj, val.obj);
      }

      detail.setText(fitSingleLineText(mainDetailText(rows[cursor]), DETAIL_W));
      footer1.setText(fitSingleLineText("UP/DN MOVE  A SELECT", FOOTER_W));
      footer2.setText(fitSingleLineText("LT/RT CHANGE  B OR ESC CLOSE", FOOTER_W));
    } else {
      // KEYS page
      subtitle.setText("KEY BINDINGS");
      cursor = Math.max(0, Math.min(cursor, ACTION_ORDER.length - 1));
      rowCount.setText(`${cursor + 1}/${ACTION_ORDER.length}`);

      const start = windowStart(ACTION_ORDER.length, cursor, VISIBLE_ROWS);
      const end = Math.min(ACTION_ORDER.length, start + VISIBLE_ROWS);
      const c = getControls();

      for (let abs = start; abs < end; abs++) {
        const a = ACTION_ORDER[abs];
        const visIdx = abs - start;
        const y = LIST_TOP + visIdx * ROW_H;
        const isCur = abs === cursor;
        const b = c.bindings[a];
        const right = `${settingsKeyLabel(b.primary)}${
          b.secondary ? `/${settingsKeyLabel(b.secondary)}` : ""
        }`;
        const lblState = fitSingleLineState(ACTION_LABEL[a], LEFT_W);
        const valState = fitSingleLineState(right, RIGHT_W);
        const arrow = new GBCText(scene, 6, y, isCur ? ">" : " ", {
          color: COLOR.textAccent,
          depth: 952,
          scrollFactor: 0,
        });
        const lbl = new GBCText(scene, LEFT_X - 3, y, lblState.fitted, {
          color: isCur ? COLOR.textAccent : COLOR.textLight,
          depth: 952,
          scrollFactor: 0,
        });
        const val = new GBCText(scene, RIGHT_X, y, valState.fitted, {
          color: COLOR.textGold,
          depth: 952,
          scrollFactor: 0,
        });
        bodyObjs.push(arrow.obj, lbl.obj, val.obj);
      }

      const focusAction = ACTION_ORDER[cursor];
      if (rebindAction) {
        const slot = rebindSlot === "primary" ? "PRIMARY" : "SECONDARY";
        detail.setText(
          fitSingleLineText(
            `PRESS KEY FOR ${ACTION_LABEL[rebindAction]} (${slot})`,
            DETAIL_W,
          ),
        );
        detail.obj.setTint(0xffffff);
        footer1.setText(fitSingleLineText("PRESS A KEY", FOOTER_W));
        footer2.setText(fitSingleLineText("ESC CANCEL", FOOTER_W));
      } else {
        detail.setText(fitSingleLineText(keysDetailText(focusAction), DETAIL_W));
        footer1.setText(fitSingleLineText("UP/DN MOVE  A REBIND", FOOTER_W));
        footer2.setText(fitSingleLineText("TAB ALT SLOT  B BACK", FOOTER_W));
      }
    }
  };
  render();

  // ---- Input ----
  const cycleInterfaceMode = () => {
    const order: InterfaceMode[] = ["desktop", "touch_landscape"];
    const i = order.indexOf(getControls().interfaceMode);
    setInterfaceMode(order[(i + 1) % order.length]);
  };
  const cycleLayout = (dir: 1 | -1) => {
    const order: TouchLayout[] = ["dpad", "swipe", "hybrid", "off"];
    const i = order.indexOf(getControls().touchLayout);
    setTouchLayout(order[(i + dir + order.length) % order.length]);
  };
  const cycleSize = (dir: 1 | -1) => {
    const order: ButtonSize[] = ["s", "m", "l", "xl"];
    const i = order.indexOf(getControls().buttonSize);
    setButtonSize(order[(i + dir + order.length) % order.length]);
  };
  const cycleAuto = (dir: 1 | -1) => {
    const order = [0, 1500, 2500, 4000];
    const i = order.indexOf(getControls().dialogAutoAdvanceMs);
    const next = order[((i < 0 ? 0 : i) + dir + order.length) % order.length];
    setDialogAutoAdvance(next);
  };

  /** Dispatch a left/right (dir) on the focused main-page row by label. */
  const adjustMain = (dir: 1 | -1) => {
    const label = mainRowLabels[cursor];
    switch (label) {
      case "INTERFACE MODE":
        cycleInterfaceMode();
        break;
      case "BUTTON SIZE":
        cycleSize(dir);
        break;
      case "LEFT-HANDED":
        setLeftHanded(!getControls().leftHanded);
        break;
      case "HAPTICS":
        setHaptics(!getControls().haptics);
        break;
      case "DIALOG AUTO-ADV":
        cycleAuto(dir);
        break;
      case "VOLUME": {
        const a = getAudio();
        if (a.muted) a.setMuted(false);
        a.setVolume(a.volume + dir * 0.1);
        break;
      }
      case "AUDIO": {
        const a = getAudio();
        a.setMuted(!a.muted);
        break;
      }
      case "TOUCH OVERLAY (LEGACY)":
        cycleLayout(dir);
        break;
      default:
        break;
    }
    getAudio().sfx("cursor");
    render();
  };

  const returnToTitle = () => {
    getAudio().sfx("confirm");
    cleanup();
    getAudio().music.stop();
    scene.scene.start("Title");
  };

  /** Activate (A) on the focused main-page row by label. */
  const activateMain = () => {
    const label = mainRowLabels[cursor];
    if (label === "KEY BINDINGS") {
      page = "keys";
      cursor = 0;
    } else if (label === "RETURN TO TITLE") {
      returnToTitle();
      return;
    } else if (label === "RESET DEFAULTS") {
      resetControls();
    } else {
      adjustMain(1);
      return;
    }
    getAudio().sfx("confirm");
    render();
  };

  const close = () => {
    getAudio().sfx("cancel");
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener("keydown", onKey);
    scene.events.off("vinput-action", onAction);
    scene.events.off("vinput-cancel", onCancel);
    scene.events.off("vinput-down", onDir);
    dim.destroy();
    box.destroy();
    title.destroy();
    tabHint.destroy();
    subtitle.destroy();
    rowCount.destroy();
    detail.destroy();
    footer1.destroy();
    footer2.destroy();
    clearBody();
    onClose?.();
  };

  const onAction = () => {
    if (rebindAction) return; // ignore A while waiting for a key
    if (page === "main") activateMain();
    else if (page === "keys") {
      rebindAction = ACTION_ORDER[cursor];
      rebindSlot = "primary";
      render();
    }
  };
  const onCancel = () => {
    if (rebindAction) {
      rebindAction = null;
      render();
      return;
    }
    if (page === "keys") {
      page = "main";
      // Land on KEY BINDINGS row when coming back, regardless of dynamic count.
      const rebindIdx = mainRowLabels.indexOf("KEY BINDINGS");
      cursor = rebindIdx >= 0 ? rebindIdx : 0;
      render();
      return;
    }
    close();
  };
  const onDir = (d: string) => {
    if (rebindAction) return;
    if (d === "up") {
      cursor = Math.max(0, cursor - 1);
      getAudio().sfx("cursor");
      render();
    } else if (d === "down") {
      const max = page === "main" ? Math.max(0, mainRowLabels.length - 1) : ACTION_ORDER.length - 1;
      cursor = Math.min(max, cursor + 1);
      getAudio().sfx("cursor");
      render();
    } else if (d === "left") {
      if (page === "main") adjustMain(-1);
      else {
        page = "main";
        cursor = 0;
        render();
      }
    } else if (d === "right") {
      if (page === "main") adjustMain(1);
      else {
        /* already on keys */
      }
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const name = normalizeKeyEvent(e);
    if (!name) return;
    // Rebinding mode swallows all keys.
    if (rebindAction) {
      e.preventDefault();
      if (name === "ESC") {
        rebindAction = null;
        render();
        return;
      }
      const cur = getControls().bindings[rebindAction];
      if (rebindSlot === "primary") setBinding(rebindAction, name, cur.secondary);
      else setBinding(rebindAction, cur.primary, name);
      rebindAction = null;
      getAudio().sfx("confirm");
      render();
      return;
    }
    const c = getControls();
    if (
      name === c.bindings.cancel.primary ||
      name === c.bindings.cancel.secondary ||
      name === "ESC"
    ) {
      onCancel();
      return;
    }
    if (name === c.bindings.action.primary || name === c.bindings.action.secondary) {
      onAction();
      return;
    }
    if (name === c.bindings.up.primary || name === c.bindings.up.secondary) {
      onDir("up");
      return;
    }
    if (name === c.bindings.down.primary || name === c.bindings.down.secondary) {
      onDir("down");
      return;
    }
    if (name === c.bindings.left.primary || name === c.bindings.left.secondary) {
      onDir("left");
      return;
    }
    if (name === c.bindings.right.primary || name === c.bindings.right.secondary) {
      onDir("right");
      return;
    }
    if (name === "TAB" && page === "keys" && !rebindAction) {
      e.preventDefault();
      rebindAction = ACTION_ORDER[cursor];
      rebindSlot = "secondary";
      render();
    }
  };

  window.addEventListener("keydown", onKey);
  scene.events.on("vinput-action", onAction);
  scene.events.on("vinput-cancel", onCancel);
  scene.events.on("vinput-down", onDir);

  // Safety net: if the scene shuts down (e.g. user triggers a scene change
  // via a touch button while settings is open), make sure we drop the DOM
  // listener so it doesn't leak across scenes.
  const safetyCleanup = () => {
    window.removeEventListener("keydown", onKey);
  };
  scene.events.once("shutdown", safetyCleanup);
  scene.events.once("destroy", safetyCleanup);
}
