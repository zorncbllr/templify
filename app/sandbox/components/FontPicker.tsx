import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { GOOGLE_FONTS, FONT_CATS } from "../types/constants";

export function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (f: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      GOOGLE_FONTS.filter(
        (f) =>
          (cat === "All" || f.category === cat) &&
          f.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [cat, search],
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const loadFont = useCallback((name: string) => {
    const id = `gf-${name.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => { loadFont(value); }, [value, loadFont]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 7,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: "#f0ede8", fontSize: 13, fontFamily: `'${value}',serif`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", outline: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        <span style={{ fontSize: 10, opacity: 0.4, fontFamily: "DM Sans,sans-serif", flexShrink: 0, marginLeft: 4 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#1a1a26", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, zIndex: 300, boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              autoFocus
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "5px 9px", borderRadius: 6,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#f0ede8", fontSize: 11, outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 3, padding: "0 8px 6px", flexWrap: "wrap" }}>
            {FONT_CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  cursor: "pointer", border: "none",
                  background: cat === c ? "rgba(232,255,71,0.15)" : "rgba(255,255,255,0.05)",
                  color: cat === c ? "#e8ff47" : "rgba(240,237,232,0.4)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 180, overflowY: "auto", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {filtered.map((f) => {
              loadFont(f.name);
              return (
                <button
                  key={f.name}
                  onClick={() => { onChange(f.name); setOpen(false); setSearch(""); }}
                  style={{
                    width: "100%", padding: "7px 10px", display: "flex",
                    alignItems: "center", justifyContent: "space-between",
                    background: value === f.name ? "rgba(232,255,71,0.08)" : "transparent",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <span style={{ fontFamily: `'${f.name}',serif`, fontSize: 13, color: value === f.name ? "#e8ff47" : "#f0ede8" }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.3, fontFamily: "DM Sans,sans-serif" }}>{f.category}</span>
                </button>
              );
            })}
            {!filtered.length && (
              <p style={{ padding: "10px", fontSize: 11, color: "rgba(240,237,232,0.25)", textAlign: "center" }}>
                No fonts found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
