/**
 * Typed HUD event helpers.
 *
 * HUD animations (stat flash, shard chip, stone sparkle, stain flash) are
 * driven by these explicit gameplay events — never by diffing values inside
 * a `refresh()` call. This guarantees that re-mounts (scene re-entry,
 * settings overlay close, first paint of a loaded save) never replay
 * spurious "gain" effects.
 */
import type * as Phaser from "phaser";
import type { StoneColor } from "../types";

export type StatKey = "clarity" | "compassion" | "courage";

export const HUD_EVENTS = {
  statChanged: "hud-stat-changed",
  fragmentChanged: "hud-fragment-changed",
  shardGained: "hud-shard-gained",
  stoneFilled: "hud-stone-filled",
  stainAdded: "hud-stain-added",
  saved: "hud-saved",
} as const;

export type StatChangedPayload = { stat: StatKey; next: number };
export type FragmentChangedPayload = { fragments: number; shards: number };
export type ShardGainedPayload = { shards: number };
export type StoneFilledPayload = { color: StoneColor; next: number };
export type StainAddedPayload = { next: number };

export function emitHudStatChanged(scene: Phaser.Scene, stat: StatKey, next: number) {
  scene.events.emit(HUD_EVENTS.statChanged, { stat, next } as StatChangedPayload);
  // Keep legacy listeners working.
  scene.events.emit("stats-changed");
}

export function emitHudFragmentChanged(scene: Phaser.Scene, fragments: number, shards: number) {
  scene.events.emit(HUD_EVENTS.fragmentChanged, { fragments, shards } as FragmentChangedPayload);
}

export function emitHudShardGained(scene: Phaser.Scene, shards: number) {
  scene.events.emit(HUD_EVENTS.shardGained, { shards } as ShardGainedPayload);
}

export function emitHudStoneFilled(scene: Phaser.Scene, color: StoneColor, next: number) {
  scene.events.emit(HUD_EVENTS.stoneFilled, { color, next } as StoneFilledPayload);
}

export function emitHudStainAdded(scene: Phaser.Scene, next: number) {
  scene.events.emit(HUD_EVENTS.stainAdded, { next } as StainAddedPayload);
}
