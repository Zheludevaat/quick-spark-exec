/**
 * Non-blocking rotation advisory.
 *
 * Renders a small floating card at the top of the touch shell suggesting
 * landscape orientation. The wrapper is `pointer-events-none` so gameplay,
 * controls, and overlays underneath continue to receive every input — this
 * is intentionally NOT a modal. The card itself is purely informational.
 */
export function RotateDeviceOverlay() {
  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none flex items-start justify-center px-4 pt-6 font-mono text-center"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
      aria-hidden="true"
    >
      <div
        className="rounded-lg px-4 py-3"
        style={{
          width: "min(92vw, 300px)",
          background: "rgba(5,7,13,0.88)",
          color: "#eef3ff",
          border: "1px solid rgba(168,200,232,0.45)",
          boxShadow: "0 0 20px rgba(74,120,200,0.2)",
        }}
      >
        <div
          className="mx-auto mb-3"
          style={{
            width: 42,
            height: 64,
            border: "2px solid #a8c8e8",
            borderRadius: 8,
            position: "relative",
            transform: "rotate(-25deg)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 4,
              width: 12,
              height: 2,
              transform: "translateX(-50%)",
              background: "#a8c8e8",
              borderRadius: 2,
            }}
          />
        </div>

        <div
          className="text-sm uppercase tracking-wider mb-1"
          style={{ color: "#e8c890" }}
        >
          Rotate for Best Fit
        </div>

        <div className="text-xs opacity-85">
          Touch mode is designed for landscape. You can keep playing, but
          rotating sideways will fit the shell better.
        </div>

        <div className="text-[10px] opacity-55 mt-2">
          Or switch to Desktop mode in Settings.
        </div>
      </div>
    </div>
  );
}
