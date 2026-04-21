/**
 * Analog-style virtual joystick that emits cardinal direction events into
 * the virtualInput bridge. Designed for landscape touch play.
 *
 * - Touch the base to begin a drag from that point.
 * - Drag the thumb past the dead zone to assert a direction.
 * - Release / cancel clears all held directions.
 * - Diagonals snap to the dominant axis to keep movement readable.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  emitVirtualDown,
  emitVirtualUp,
  type VAction,
} from "@/game/virtualInput";
import { buzz } from "@/game/controls";

type Held = { up: boolean; down: boolean; left: boolean; right: boolean };

const DEAD_ZONE = 0.32; // fraction of radius
const EMPTY: Held = { up: false, down: false, left: false, right: false };

type Props = {
  /** Disable input (e.g. during a hard modal). Held state is released. */
  disabled?: boolean;
};

export function TouchJoystick({ disabled = false }: Props) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const heldRef = useRef<Held>({ ...EMPTY });
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const radiusRef = useRef<number>(0);
  const [thumb, setThumb] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const releaseAll = useCallback(() => {
    const h = heldRef.current;
    (Object.keys(h) as (keyof Held)[]).forEach((k) => {
      if (h[k]) {
        h[k] = false;
        emitVirtualUp(k as VAction);
      }
    });
    setThumb({ x: 0, y: 0 });
    setActive(false);
    centerRef.current = null;
    pointerIdRef.current = null;
  }, []);

  // Release on disabled toggle or unmount.
  useEffect(() => {
    if (disabled) releaseAll();
  }, [disabled, releaseAll]);
  useEffect(() => {
    return () => releaseAll();
  }, [releaseAll]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const center = centerRef.current;
      const r = radiusRef.current;
      if (!center || r <= 0) return;
      const dx = clientX - center.x;
      const dy = clientY - center.y;
      const dist = Math.hypot(dx, dy);
      const norm = dist / r;
      // Clamp visual thumb to inside the ring.
      const clamp = Math.min(1, norm);
      const tx = (dx / Math.max(dist, 1)) * clamp * r;
      const ty = (dy / Math.max(dist, 1)) * clamp * r;
      setThumb({ x: tx, y: ty });

      let next: Held = { ...EMPTY };
      if (norm >= DEAD_ZONE) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) next.right = true;
          else next.left = true;
        } else {
          if (dy > 0) next.down = true;
          else next.up = true;
        }
      }
      const cur = heldRef.current;
      (Object.keys(next) as (keyof Held)[]).forEach((k) => {
        if (next[k] && !cur[k]) {
          cur[k] = true;
          emitVirtualDown(k as VAction);
          buzz(6);
        } else if (!next[k] && cur[k]) {
          cur[k] = false;
          emitVirtualUp(k as VAction);
        }
      });
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      radiusRef.current = rect.width / 2;
      pointerIdRef.current = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setActive(true);
      updateFromPointer(e.clientX, e.clientY);
      e.preventDefault();
    },
    [disabled, updateFromPointer],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      updateFromPointer(e.clientX, e.clientY);
      e.preventDefault();
    },
    [updateFromPointer],
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      releaseAll();
      e.preventDefault();
    },
    [releaseAll],
  );

  return (
    <div
      ref={baseRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      className="relative select-none touch-none rounded-full"
      style={{
        width: "var(--joystick-size, 120px)",
        height: "var(--joystick-size, 120px)",
        background:
          "radial-gradient(circle at 50% 50%, rgba(120,160,220,0.18), rgba(20,30,50,0.55) 70%)",
        border: "1px solid rgba(168,200,232,0.45)",
        boxShadow:
          "inset 0 0 12px rgba(0,0,0,0.55), 0 0 18px rgba(74,120,200,0.18)",
        opacity: disabled ? 0.4 : 1,
      }}
      aria-label="Movement joystick"
    >
      {/* dead-zone ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: "50%",
          top: "50%",
          width: "32%",
          height: "32%",
          transform: "translate(-50%,-50%)",
          border: "1px dashed rgba(168,200,232,0.25)",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: "50%",
          top: "50%",
          width: "44%",
          height: "44%",
          transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))`,
          background: active
            ? "radial-gradient(circle, #c4d8ff 0%, #6a90c8 70%, #2a3550 100%)"
            : "radial-gradient(circle, #a8c8e8 0%, #4a78c8 70%, #2a3550 100%)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          transition: active ? "none" : "transform 120ms ease-out",
        }}
      />
    </div>
  );
}
