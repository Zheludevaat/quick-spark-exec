import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DesktopGameShell } from "@/components/game/DesktopGameShell";
import { TouchLandscapeShell } from "@/components/game/TouchLandscapeShell";
import {
  getEffectiveInterfaceMode,
  subscribeControls,
  type InterfaceMode,
} from "@/game/controls";
import { installVirtualInputGlobals, clearVirtualInput } from "@/game/virtualInput";
import { resetGameUiSnapshot } from "@/game/gameUiBridge";

export const Route = createFileRoute("/")({
  component: GamePage,
  head: () => ({
    meta: [
      { title: "Hermetic Comedy — a pixel-art RPG of small verbs" },
      {
        name: "description",
        content:
          "A multi-act pixel-art RPG about dying gracefully and learning small verbs: Observe, Address, Remember, Release, Witness.",
      },
      { property: "og:title", content: "Hermetic Comedy" },
      {
        property: "og:description",
        content:
          "A GBC-style RPG across the Last Day, the Silver Threshold, and the Imaginal Realm.",
      },
    ],
  }),
});

function GamePage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<InterfaceMode>(() => {
    if (typeof window === "undefined") return "desktop";
    return getEffectiveInterfaceMode();
  });

  // Boot Phaser once and keep the same instance across mode toggles.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hostRef.current) return;
    let game: import("phaser").Game | null = null;
    let cancelled = false;

    installVirtualInputGlobals();
    resetGameUiSnapshot();

    (async () => {
      try {
        const mod = await import("@/game/createGame");
        if (cancelled || !hostRef.current) return;
        game = mod.createGame(hostRef.current);
        setBooted(true);
      } catch (e) {
        console.error("[game] boot failed", e);
        setError(
          e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e),
        );
      }
    })();
    return () => {
      cancelled = true;
      clearVirtualInput();
      game?.destroy(true);
    };
  }, []);

  // Live-react to interface mode changes from Settings.
  useEffect(() => {
    return subscribeControls(() => {
      const next = getEffectiveInterfaceMode();
      setMode((prev) => (prev === next ? prev : next));
      clearVirtualInput();
    });
  }, []);

  // The Phaser host is the single mounted canvas — only one of the two
  // shells renders it at a time. We keep the *same* DOM node across mode
  // switches by using a stable ref and a key that flips with the mode,
  // so that React re-parents instead of unmounting Phaser.
  const hostNode = (
    <div
      ref={hostRef}
      id="phaser-host"
      style={{ width: "100%", height: "100%" }}
    />
  );

  if (mode === "touch_landscape") {
    return (
      <TouchLandscapeShell booted={booted} error={error}>
        {hostNode}
      </TouchLandscapeShell>
    );
  }
  return (
    <DesktopGameShell booted={booted} error={error}>
      {hostNode}
    </DesktopGameShell>
  );
}
