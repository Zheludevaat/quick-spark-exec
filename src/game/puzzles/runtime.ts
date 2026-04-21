/**
 * Hermetic Puzzle Framework — runtime helpers.
 *
 * Reads/writes per-node state into `save.puzzleState` (string-keyed ledger,
 * never overloads `flags` for multi-state). Solved flag still uses `flags`
 * for fast boolean lookups by other systems.
 */
import type { SaveSlot } from "../types";
import type { PuzzleRoomDef, PuzzleRuntimeState } from "./types";
import { writeSave } from "../save";

const roomKey = (roomId: string, key: string) => `puzzle:${roomId}:${key}`;

export function solvedFlagKey(room: PuzzleRoomDef): string {
  return room.onSolveFlag ?? `puzzle_${room.id}_solved`;
}

export function isPuzzleSolved(save: SaveSlot, room: PuzzleRoomDef): boolean {
  return save.flags[solvedFlagKey(room)] === true;
}

export function getPuzzleState(save: SaveSlot, room: PuzzleRoomDef): PuzzleRuntimeState {
  const solved = isPuzzleSolved(save, room);
  const nodeState: Record<string, string | number | boolean> = {};

  for (const node of room.nodes) {
    const key = roomKey(room.id, node.id);
    const stored = save.puzzleState[key];
    nodeState[node.id] = stored !== undefined ? stored : (node.state ?? false);
  }

  return { solved, nodeState };
}

export function getPuzzleNodeState(
  save: SaveSlot,
  roomId: string,
  nodeId: string,
  fallback: string | number | boolean = false,
): string | number | boolean {
  const v = save.puzzleState[roomKey(roomId, nodeId)];
  return v !== undefined ? v : fallback;
}

export function setPuzzleNodeState(
  save: SaveSlot,
  roomId: string,
  nodeId: string,
  value: string | number | boolean,
): void {
  save.puzzleState[roomKey(roomId, nodeId)] = value;
  writeSave(save);
}

export function resetPuzzleRoom(save: SaveSlot, room: PuzzleRoomDef): void {
  for (const node of room.nodes) {
    delete save.puzzleState[roomKey(room.id, node.id)];
  }
  writeSave(save);
}

export function markPuzzleSolved(save: SaveSlot, room: PuzzleRoomDef): void {
  save.flags[solvedFlagKey(room)] = true;

  if (room.onSolveSetState) {
    for (const [k, v] of Object.entries(room.onSolveSetState)) {
      save.puzzleState[roomKey(room.id, k)] = v;
    }
  }

  writeSave(save);
}
