import type { RowData } from "../types";

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
    <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 30, display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{
        display: "flex", flexDirection: "column",
        background: "rgba(12,12,20,0.92)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
        overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}>
        <button
          onClick={() => onZoom(0.1)}
          title="Zoom In"
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "rgba(240,237,232,0.7)", cursor: "pointer", fontSize: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          +
        </button>

        <button
          onClick={onReset}
          title="Reset Zoom"
          style={{ width: 32, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#e8ff47", cursor: "pointer", fontSize: 8, fontWeight: 700, letterSpacing: "0.02em", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={() => onZoom(-0.1)}
          title="Zoom Out"
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "rgba(240,237,232,0.7)", cursor: "pointer", fontSize: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          −
        </button>

        <button
          onClick={onFit}
          title="Fit to Screen"
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "rgba(240,237,232,0.5)", cursor: "pointer", fontSize: 11 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          ⊡
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
    <div style={{
      position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 30, display: "flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: 16,
      background: "rgba(12,12,20,0.92)", backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      animation: "slideUp 0.2s ease",
    }}>
      {[
        { label: "⟨⟨", action: () => onPageChange(0), disabled: pageIndex === 0, size: 9 },
        { label: "‹", action: () => onPageChange(Math.max(0, pageIndex - 1)), disabled: pageIndex === 0, size: 12 },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          disabled={btn.disabled}
          style={{
            width: 22, height: 22, borderRadius: 5,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: btn.disabled ? "rgba(240,237,232,0.15)" : "rgba(240,237,232,0.6)",
            cursor: btn.disabled ? "not-allowed" : "pointer",
            fontSize: btn.size, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {btn.label}
        </button>
      ))}

      <div style={{ textAlign: "center", minWidth: 90 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f0ede8" }}>
          Row {pageIndex + 1}{" "}
          <span style={{ color: "rgba(240,237,232,0.3)" }}>/ {rows.length}</span>
        </div>
        <div style={{ fontSize: 9, color: "rgba(240,237,232,0.35)", marginTop: 1 }}>
          {rows[pageIndex]
            ? Object.values(rows[pageIndex]).filter(Boolean)[0]?.slice(0, 20)
            : "—"}
        </div>
      </div>

      {[
        { label: "›", action: () => onPageChange(Math.min(totalPages - 1, pageIndex + 1)), disabled: pageIndex === totalPages - 1, size: 12 },
        { label: "⟩⟩", action: () => onPageChange(totalPages - 1), disabled: pageIndex === totalPages - 1, size: 9 },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          disabled={btn.disabled}
          style={{
            width: 22, height: 22, borderRadius: 5,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: btn.disabled ? "rgba(240,237,232,0.15)" : "rgba(240,237,232,0.6)",
            cursor: btn.disabled ? "not-allowed" : "pointer",
            fontSize: btn.size, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

// ─── KbdHint ──────────────────────────────────────────────────────────────────

export function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" }}>
      <span style={{ fontSize: 10, color: "rgba(240,237,232,0.33)" }}>{label}</span>
      <div style={{ display: "flex", gap: 2 }}>
        {keys.map((k) => (
          <span
            key={k}
            style={{
              fontSize: 9, padding: "1px 4px", borderRadius: 3,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(240,237,232,0.4)", fontFamily: "monospace",
            }}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
