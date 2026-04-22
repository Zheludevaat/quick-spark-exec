import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  rail?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  height?: string;
};

export function DesktopSurfaceFrame({
  title,
  subtitle = null,
  onClose,
  rail,
  children,
  footer,
  width = "min(96vw, 1100px)",
  height = "min(88vh, 760px)",
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-6 font-mono"
      style={{ background: "rgba(2,4,10,0.78)" }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="rounded-lg overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width,
          height,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          background:
            "linear-gradient(180deg, rgba(8,14,28,0.98), rgba(4,8,18,0.98))",
          color: "#eef3ff",
          border: "1px solid rgba(232,200,144,0.5)",
          boxShadow:
            "0 0 40px rgba(74,120,200,0.25), inset 0 0 0 1px rgba(0,0,0,0.5)",
        }}
      >
        <header
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(168,200,232,0.22)" }}
        >
          <div>
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#e8c890" }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(168,200,232,0.82)" }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs uppercase tracking-wider"
            style={{
              background: "rgba(216,74,74,0.14)",
              color: "#f0b0b0",
              border: "1px solid rgba(216,74,74,0.42)",
            }}
          >
            Close (Esc)
          </button>
        </header>

        <div
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: rail ? "220px 1fr" : "1fr",
          }}
        >
          {rail ? (
            <aside
              className="h-full px-3 py-3"
              style={{ borderRight: "1px solid rgba(168,200,232,0.18)" }}
            >
              {rail}
            </aside>
          ) : null}

          <section className="h-full overflow-y-auto px-4 py-4">
            {children}
          </section>
        </div>

        <footer
          className="px-4 py-2 text-[10px] uppercase tracking-wider"
          style={{
            color: "rgba(168,200,232,0.62)",
            borderTop: "1px solid rgba(168,200,232,0.18)",
          }}
        >
          {footer ?? "Esc closes"}
        </footer>
      </div>
    </div>
  );
}
