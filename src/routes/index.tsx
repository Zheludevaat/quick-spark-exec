import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: GamePage,
  head: () => ({
    meta: [
      { title: "Hermetic Comedy — Act 0 + I: The Imaginal Realm" },
      { name: "description", content: "A pixel-art RPG about dying gracefully and learning small verbs: Observe, Address, Remember, Release, Witness." },
      { property: "og:title", content: "Hermetic Comedy — Act 0 & I" },
      { property: "og:description", content: "A GBC-style RPG: the Last Day, the Silver Threshold, and the Moon's Imaginal Realm." },
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
      <header style={{ textAlign: "center", padding: "8px 16px" }}>
        <h1 style={{ fontSize: 18, letterSpacing: "0.2em", margin: 0, color: "#8ec8e8" }}>
          HERMETIC COMEDY
        </h1>
        <p style={{ fontSize: 11, opacity: 0.7, margin: "4px 0 0", letterSpacing: "0.1em" }}>
          act 0 · the last day &middot; act i · the imaginal realm
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
        Arrow keys / WASD · Space or Enter = A · B or Q = witness · L = lore · P or Esc = settings · Tap ≡ on touch
        {!booted && !error && <div style={{ marginTop: 4 }}>Loading the silver…</div>}
        {error && <div style={{ marginTop: 4, color: "#d86a6a" }}>Failed to load: {error}</div>}
      </footer>
    </div>
  );
}
