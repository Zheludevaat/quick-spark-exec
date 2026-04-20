import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: GamePage,
  head: () => ({
    meta: [
      { title: "Hermetic Comedy — Act 0: The Silver Threshold" },
      { name: "description", content: "A pixel-art RPG about dying gracefully and learning four small verbs: Observe, Address, Remember, Release." },
      { property: "og:title", content: "Hermetic Comedy — Act 0" },
      { property: "og:description", content: "A GBC-style RPG playable slice. The Silver Threshold, the Moon's Hall of Mirrors, and the Curated Self." },
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
        const { createGame } = await import("@/game/createGame");
        if (cancelled || !hostRef.current) return;
        game = createGame(hostRef.current);
        setBooted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
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
      <header style={{ textAlign: "center", padding: "8px 16px" }}>
        <h1 style={{ fontSize: 18, letterSpacing: "0.2em", margin: 0, color: "#8ec8e8" }}>
          HERMETIC COMEDY
        </h1>
        <p style={{ fontSize: 11, opacity: 0.7, margin: "4px 0 0", letterSpacing: "0.1em" }}>
          act 0 · the silver threshold
        </p>
      </header>

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
        Arrow keys / WASD to move · Enter or Space to act · A on touch
        {!booted && !error && <div style={{ marginTop: 4 }}>Loading the silver…</div>}
        {error && <div style={{ marginTop: 4, color: "#d86a6a" }}>Failed to load: {error}</div>}
      </footer>
    </div>
  );
}
