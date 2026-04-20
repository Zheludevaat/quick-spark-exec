import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: GamePage,
  head: () => ({
    meta: [
      { title: "Hermetic Comedy — a pixel-art RPG of small verbs" },
      { name: "description", content: "A multi-act pixel-art RPG about dying gracefully and learning small verbs: Observe, Address, Remember, Release, Witness." },
      { property: "og:title", content: "Hermetic Comedy" },
      { property: "og:description", content: "A GBC-style RPG across the Last Day, the Silver Threshold, and the Imaginal Realm." },
    ],
  }),
});

function GamePage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hostRef.current) return;
    let game: import("phaser").Game | null = null;
    let cancelled = false;
    (async () => {
      try {
        console.log("[game] importing createGame…");
        const mod = await import("@/game/createGame");
        console.log("[game] import resolved", Object.keys(mod));
        if (cancelled || !hostRef.current) return;
        console.log("[game] calling createGame()");
        game = mod.createGame(hostRef.current);
        console.log("[game] createGame returned", game);
        setBooted(true);
      } catch (e) {
        console.error("[game] boot failed", e);
        setError(e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e));
      }
    })();
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070d",
        color: "#eef3ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "monospace",
      }}
    >
      {/* The game scene renders its own title + act banner — no external header to avoid duplication. */}

      <div
        ref={hostRef}
        id="phaser-host"
        style={{
          width: "min(96vw, 720px)",
          aspectRatio: "320 / 240",
          imageRendering: "pixelated",
          border: "1px solid #2a3550",
          background: "#05070d",
          boxShadow: "0 0 60px rgba(74,120,200,0.15)",
        }}
      />

      <footer style={{ fontSize: 10, opacity: 0.6, textAlign: "center", padding: "0 16px", maxWidth: 720 }}>
        Arrow keys / WASD · Space or Enter = A · B or Q = witness · L = lore · P or Esc = settings · Tap ≡ on touch
        {!booted && !error && <div style={{ marginTop: 4 }}>Loading the silver…</div>}
        {error && <div style={{ marginTop: 4, color: "#d86a6a" }}>Failed to load: {error}</div>}
      </footer>
    </div>
  );
}
