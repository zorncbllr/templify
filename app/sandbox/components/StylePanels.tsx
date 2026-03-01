import type { Shadow, Border } from "../types/index";

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────

export function ToggleSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 30,
        height: 16,
        borderRadius: 8,
        background: value ? "#e8ff47" : "rgba(255,255,255,0.1)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 14 : 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: value ? "#0a0a10" : "white",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ─── ShadowPanel ──────────────────────────────────────────────────────────────

export function ShadowPanel({
  shadow,
  onChange,
  isText = false,
}: {
  shadow: Shadow;
  onChange: (s: Shadow) => void;
  isText?: boolean;
}) {
  const set = (k: keyof Shadow, v: any) => onChange({ ...shadow, [k]: v });

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Shadow
        </span>
        <ToggleSwitch
          value={shadow.enabled}
          onChange={(v) => set("enabled", v)}
        />
      </div>

      {shadow.enabled && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: "9px",
            borderRadius: 7,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", gap: 7 }}>
            <div
              style={{
                position: "relative",
                width: 26,
                height: 26,
                borderRadius: 5,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={shadow.color.startsWith("r") ? "#000000" : shadow.color}
                onChange={(e) => set("color", e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  transform: "scale(1.5)",
                }}
              />
            </div>
            <input
              value={shadow.color}
              onChange={(e) => set("color", e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "4px 7px",
                borderRadius: 5,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f0ede8",
                fontSize: 10,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          {(
            [
              ["X", "x", -20, 20],
              ["Y", "y", -20, 20],
              ["Blur", "blur", 0, 40],
            ] as [string, keyof Shadow, number, number][]
          ).map(([label, k, min, max]) => (
            <div
              key={k as string}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.3)",
                  width: 20,
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={shadow[k] as number}
                onChange={(e) => set(k, Number(e.target.value))}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "3px",
                  accentColor: "#e8ff47",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "#e8ff47",
                  width: 28,
                  textAlign: "right",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {shadow[k]}px
              </span>
            </div>
          ))}

          {isText && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0,
                paddingTop: 4,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(240,237,232,0.3)",
                  width: 20,
                  flexShrink: 0,
                }}
              >
                Wt
              </span>
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={shadow.thickness ?? 0}
                onChange={(e) => set("thickness", Number(e.target.value))}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "3px",
                  accentColor: "#e8ff47",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "#e8ff47",
                  width: 28,
                  textAlign: "right",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {shadow.thickness ?? 0}px
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BorderPanel ──────────────────────────────────────────────────────────────

export function BorderPanel({
  border,
  onChange,
  label = "Border",
}: {
  border: Border;
  onChange: (b: Border) => void;
  label?: string;
}) {
  const set = (k: keyof Border, v: any) => onChange({ ...border, [k]: v });
  const BORDER_STYLES: Border["style"][] = [
    "solid",
    "dashed",
    "dotted",
    "double",
  ];

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <ToggleSwitch
          value={border.enabled}
          onChange={(v) => set("enabled", v)}
        />
      </div>

      {border.enabled && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: "8px",
            borderRadius: 7,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", gap: 6, minWidth: 0 }}>
            <div
              style={{
                position: "relative",
                width: 24,
                height: 24,
                borderRadius: 5,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            >
              <input
                type="color"
                value={border.color}
                onChange={(e) => set("color", e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  transform: "scale(1.5)",
                }}
              />
            </div>
            <input
              value={border.color}
              onChange={(e) => set("color", e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "3px 6px",
                borderRadius: 5,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f0ede8",
                fontSize: 10,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "rgba(240,237,232,0.3)",
                width: 24,
                flexShrink: 0,
              }}
            >
              W
            </span>
            <input
              type="range"
              min={1}
              max={20}
              value={border.width}
              onChange={(e) => set("width", Number(e.target.value))}
              style={{
                flex: 1,
                minWidth: 0,
                height: "3px",
                accentColor: "#e8ff47",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "#e8ff47",
                width: 26,
                textAlign: "right",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {border.width}px
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 3,
              minWidth: 0,
            }}
          >
            {BORDER_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => set("style", s)}
                style={{
                  padding: "3px 0",
                  borderRadius: 4,
                  fontSize: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background:
                    border.style === s
                      ? "rgba(232,255,71,0.15)"
                      : "rgba(255,255,255,0.05)",
                  color:
                    border.style === s ? "#e8ff47" : "rgba(240,237,232,0.4)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.04em",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div
            style={{
              height: 24,
              borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
              border: `${border.width}px ${border.style} ${border.color}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <span style={{ fontSize: 8, color: "rgba(240,237,232,0.25)" }}>
              preview
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
