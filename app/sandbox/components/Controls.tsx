import type { RowData } from "../types/index";
import { IconMinus, IconFitScreen, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight } from "@/components/Icons";

// ─── ZoomControls ─────────────────────────────────────────────────────────────

export function ZoomControls({
  zoom,
  onZoom,
  onReset,
  onFit,
}: {
  zoom: number;
  onZoom: (delta: number) => void;
  onReset: () => void;
  onFit: () => void;
}) {
  return (
    <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-[3px]">
      <div
        className="flex flex-col bg-[rgba(12,12,20,0.92)] border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden"
        style={{
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={() => onZoom(0.1)}
          title="Zoom In"
          className="w-8 h-8 flex items-center justify-center border-none text-[rgba(240,237,232,0.7)] cursor-pointer text-[16px] border-b border-b-[rgba(255,255,255,0.07)]"
          style={{ background: "none" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          +
        </button>

        <button
          onClick={onReset}
          title="Reset Zoom"
          className="w-8 h-8 flex items-center justify-center border-none text-[#e8ff47] cursor-pointer text-[8px] font-bold tracking-[0.02em] border-b border-b-[rgba(255,255,255,0.07)] p-0"
          style={{ background: "none" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={() => onZoom(-0.1)}
          title="Zoom Out"
          className="w-8 h-8 flex items-center justify-center border-none text-[rgba(240,237,232,0.7)] cursor-pointer text-[16px] border-b border-b-[rgba(255,255,255,0.07)]"
          style={{ background: "none" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <IconMinus size={14} />
        </button>

        <button
          onClick={onFit}
          title="Fit to Screen"
          className="w-8 h-8 flex items-center justify-center border-none text-[rgba(240,237,232,0.5)] cursor-pointer text-[11px]"
          style={{ background: "none" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.07)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <IconFitScreen size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── FloatingPageNav ──────────────────────────────────────────────────────────

export function FloatingPageNav({
  pageIndex,
  totalPages,
  onPageChange,
  rows,
}: {
  pageIndex: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  rows: RowData[];
}) {
  if (totalPages === 0) return null;

  return (
    <div
      className="absolute bottom-5 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[rgba(12,12,20,0.92)] border border-[rgba(255,255,255,0.1)]"
      style={{
        left: "50%",
        transform: "translateX(-50%)",
        backdropFilter: "blur(16px)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "slideUp 0.2s ease",
      }}
    >
      {[
        {
          icon: <IconChevronsLeft size={11} />,
          action: () => onPageChange(0),
          disabled: pageIndex === 0,
        },
        {
          icon: <IconChevronLeft size={11} />,
          action: () => onPageChange(Math.max(0, pageIndex - 1)),
          disabled: pageIndex === 0,
        },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          disabled={btn.disabled}
          className="w-[22px] h-[22px] rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center"
          style={{
            color: btn.disabled
              ? "rgba(240,237,232,0.15)"
              : "rgba(240,237,232,0.6)",
            cursor: btn.disabled ? "not-allowed" : "pointer",
          }}
        >
          {btn.icon}
        </button>
      ))}

      <div className="text-center min-w-[90px]">
        <div className="text-[11px] font-bold text-[#f0ede8]">
          Row {pageIndex + 1}{" "}
          <span className="text-[rgba(240,237,232,0.3)]">
            / {rows.length}
          </span>
        </div>
        <div className="text-[9px] text-[rgba(240,237,232,0.35)] mt-px">
          {rows[pageIndex]
            ? Object.values(rows[pageIndex]).filter(Boolean)[0]?.slice(0, 20)
            : "—"}
        </div>
      </div>

      {[
        {
          icon: <IconChevronRight size={11} />,
          action: () => onPageChange(Math.min(totalPages - 1, pageIndex + 1)),
          disabled: pageIndex === totalPages - 1,
        },
        {
          icon: <IconChevronsRight size={11} />,
          action: () => onPageChange(totalPages - 1),
          disabled: pageIndex === totalPages - 1,
        },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          disabled={btn.disabled}
          className="w-[22px] h-[22px] rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center"
          style={{
            color: btn.disabled
              ? "rgba(240,237,232,0.15)"
              : "rgba(240,237,232,0.6)",
            cursor: btn.disabled ? "not-allowed" : "pointer",
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}

// ─── KbdHint ──────────────────────────────────────────────────────────────────

export function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between px-0 py-0.5">
      <span className="text-[10px] text-[rgba(240,237,232,0.33)]">
        {label}
      </span>
      <div className="flex gap-0.5">
        {keys.map((k) => (
          <span
            key={k}
            className="text-[9px] px-1 py-px rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[rgba(240,237,232,0.4)] font-mono"
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
