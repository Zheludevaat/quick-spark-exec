import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/**
 * Single-instance Phaser host kept across shell mode switches.
 *
 * We allocate one detached <div> via document.createElement on first mount
 * and then re-parent it into whichever shell currently owns it. This way
 * Phaser never sees its canvas unmounted when switching desktop/touch.
 */
function GamePage() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const phaserHostRef = useRef<HTMLDivElement | null>(null);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<InterfaceMode>(() => {
    if (typeof window === "undefined") return "desktop";
    return getEffectiveInterfaceMode();
  });

  // Create the persistent host node once.
  if (typeof document !== "undefined" && !phaserHostRef.current) {
    const node = document.createElement("div");
    node.id = "phaser-host";
    node.style.width = "100%";
    node.style.height = "100%";
    phaserHostRef.current = node;
  }

  // Boot Phaser once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = phaserHostRef.current;
    if (!host) return;
    let game: import("phaser").Game | null = null;
    let cancelled = false;

    installVirtualInputGlobals();
    resetGameUiSnapshot();

    (async () => {
      try {
        const mod = await import("@/game/createGame");
        if (cancelled) return;
        game = mod.createGame(host);
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

  // Re-parent the persistent Phaser host into the current shell's slot.
  useLayoutEffect(() => {
    const slot = slotRef.current;
    const host = phaserHostRef.current;
    if (!slot || !host) return;
    if (host.parentNode !== slot) {
      slot.appendChild(host);
    }
  }, [mode]);

  // Live-react to interface mode changes from Settings.
  useEffect(() => {
    return subscribeControls(() => {
      const next = getEffectiveInterfaceMode();
      setMode((prev) => (prev === next ? prev : next));
      clearVirtualInput();
    });
  }, []);

  const hostSlot = (
    <div ref={slotRef} style={{ width: "100%", height: "100%" }} />
  );

  if (mode === "touch_landscape") {
    return (
      <TouchLandscapeShell booted={booted} error={error}>
        {hostSlot}
      </TouchLandscapeShell>
    );
  }
  return (
    <DesktopGameShell booted={booted} error={error}>
      {hostSlot}
    </DesktopGameShell>
  );
}
