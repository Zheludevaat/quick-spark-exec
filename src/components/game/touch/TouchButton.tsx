/**
 * Round on-screen action button for touch landscape mode.
 *
 * - Pointer down → onPress (fires once per press, no double-fire).
 * - Pointer up / cancel / leave → onRelease.
 * - Optional held semantics for A/B (controlled by parent).
 */
import { useCallback, useRef } from "react";
import { buzz } from "@/game/controls";
import { cn } from "@/lib/utils";

type Variant = "a" | "b" | "neutral" | "accent";

type Props = {
  label: string;
  variant?: Variant;
  size?: number;
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
  onPress?: () => void;
  onRelease?: () => void;
};

const VARIANT_BG: Record<Variant, string> = {
  a: "radial-gradient(circle, #ff8a8a 0%, #d84a4a 60%, #6a1a1a 100%)",
  b: "radial-gradient(circle, #ffe49a 0%, #e0c060 60%, #6a4a1a 100%)",
  neutral:
    "radial-gradient(circle, #c4d8ff 0%, #4a78c8 60%, #1a2550 100%)",
  accent:
    "radial-gradient(circle, #d8c8ff 0%, #8060c8 60%, #2a1a55 100%)",
};

export function TouchButton({
  label,
  variant = "neutral",
  size = 64,
  disabled = false,
  active = false,
  ariaLabel,
  onPress,
  onRelease,
}: Props) {
  const pressedRef = useRef(false);

  const handleDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (pressedRef.current) return;
      pressedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      buzz(10);
      onPress?.();
      e.preventDefault();
    },
    [disabled, onPress],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!pressedRef.current) return;
      pressedRef.current = false;
      onRelease?.();
      e.preventDefault();
    },
    [onRelease],
  );

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
      className={cn(
        "relative select-none touch-none rounded-full grid place-items-center font-mono font-bold",
        "transition-transform duration-75 active:scale-90",
        disabled && "opacity-40",
      )}
      style={{
        width: size,
        height: size,
        color: "#fff",
        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        background: VARIANT_BG[variant],
        border: "1px solid rgba(255,255,255,0.45)",
        boxShadow: active
          ? "inset 0 0 10px rgba(255,255,255,0.4), 0 0 12px rgba(255,200,120,0.5)"
          : "inset 0 -3px 6px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.5)",
        fontSize: Math.max(14, size * 0.35),
      }}
    >
      {label}
    </button>
  );
}
