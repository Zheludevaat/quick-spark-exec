/**
 * Full-screen interstitial shown when the player is in touch_landscape
 * mode but holding the device in portrait. The game keeps running
 * underneath; this only blocks input and prompts a rotation.
 */
export function RotateDeviceOverlay() {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center font-mono text-center px-6"
      style={{
        background: "rgba(5,7,13,0.97)",
        color: "#eef3ff",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div>
        <div
          className="mx-auto mb-4"
          style={{
            width: 64,
            height: 96,
            border: "2px solid #a8c8e8",
            borderRadius: 8,
            position: "relative",
            transform: "rotate(-25deg)",
            animation: "rotateNudge 1.6s ease-in-out infinite",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 4,
              width: 14,
              height: 2,
              transform: "translateX(-50%)",
              background: "#a8c8e8",
              borderRadius: 2,
            }}
          />
        </div>
        <h2
          className="text-lg mb-2 uppercase tracking-wider"
          style={{ color: "#e8c890" }}
        >
          Rotate to Landscape
        </h2>
        <p className="text-sm opacity-80 max-w-xs mx-auto">
          Hermetic Comedy in touch mode is designed for landscape. Turn your
          device sideways to continue.
        </p>
        <p className="text-xs opacity-50 mt-4">
          Or change interface in Settings → Display.
        </p>
      </div>
      <style>{`
        @keyframes rotateNudge {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(-90deg); }
        }
      `}</style>
    </div>
  );
}
