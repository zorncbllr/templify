import { useState, useEffect } from "react";
import type { Shadow, Border } from "../types/index";

// ─── NumInput ─────────────────────────────────────────────────────────────────
// A number input that lets you freely type (including clearing) and only commits
// the value on Enter, blur, or spinner click.

export function NumInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  style: extraStyle,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  style?: React.CSSProperties;
}) {
  const [str, setStr] = useState(String(value));
  useEffect(() => {
    setStr(String(value));
  }, [value]);

  const commit = () => {
    const v =
      step != null && step % 1 !== 0 ? parseFloat(str) : parseInt(str, 10);
    if (isNaN(v)) {
      setStr(String(value));
      return;
    }
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v));
    onChange(clamped);
    setStr(String(clamped));
  };

  return (
    <div className="relative flex justify-between w-30" style={extraStyle}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={str}
        onChange={(e) => setStr(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="w-full rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#f0ede8] text-[10px] font-mono outline-none box-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{
          padding: suffix ? "8px 18px 8px 8px" : "8px 8px",
        }}
      />
      {suffix && (
        <span className="absolute text-xs text-[rgba(240,237,232,0.25)] pointer-events-none right-2 top-1/2 transform -translate-y-1/2">
          {suffix}
        </span>
      )}
    </div>
  );
}

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
      className="w-[30px] h-4 rounded-lg border-none cursor-pointer relative shrink-0 transition-[background] duration-200"
      style={{
        background: value ? "#e8ff47" : "rgba(255,255,255,0.1)",
      }}
    >
      <span
        className="absolute w-3 h-3 rounded-full transition-[left] duration-150"
        style={{
          top: 2,
          left: value ? 14 : 2,
          background: value ? "#0a0a0a" : "white",
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
      <div className="flex items-center justify-start gap-2 mb-1.5">
        <ToggleSwitch
          value={shadow.enabled}
          onChange={(v) => set("enabled", v)}
        />
        <span className="text-[10px] font-bold text-[rgba(240,237,232,0.28)] uppercase tracking-[0.08em]">
          Shadow
        </span>
      </div>

      {shadow.enabled && (
        <div className="flex flex-col gap-[7px] p-[9px] rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] min-w-0 overflow-hidden">
          <div className="flex gap-[5px]">
            <div className="relative w-[26px] h-[26px] rounded-md overflow-hidden border border-[rgba(255,255,255,0.1)] shrink-0">
              <input
                type="color"
                value={shadow.color.startsWith("r") ? "#000000" : shadow.color}
                onChange={(e) => set("color", e.target.value)}
                className="absolute inset-0 w-full h-full scale-150"
              />
            </div>
            <input
              value={shadow.color}
              onChange={(e) => set("color", e.target.value)}
              className="flex-1 min-w-0 px-[7px] py-1 rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#f0ede8] text-[10px] font-mono outline-none"
            />
          </div>

          <div className="flex gap-1">
            {(
              [
                ["X", "x", -50, 50],
                ["Y", "y", -50, 50],
                ["Blur", "blur", 0, 50],
              ] as [string, keyof Shadow, number, number][]
            ).map(([label, k, min, max]) => (
              <div key={k as string} className="flex-1 min-w-0">
                <span className="text-[8px] text-[rgba(240,237,232,0.3)] block mb-0.5">
                  {label}
                </span>
                <NumInput
                  value={shadow[k] as number}
                  min={min}
                  max={max}
                  suffix="px"
                  onChange={(v) => set(k, v)}
                />
              </div>
            ))}
          </div>

          {isText && (
            <div className="pt-1 border-t border-[rgba(255,255,255,0.06)]">
              <span className="text-[8px] text-[rgba(240,237,232,0.3)] block mb-0.5">
                Thickness
              </span>
              <NumInput
                value={shadow.thickness ?? 0}
                min={0}
                max={8}
                step={0.5}
                suffix="px"
                onChange={(v) => set("thickness", v)}
                style={{ width: 72 }}
              />
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
    <div className="min-w-0">
      <div className="flex items-center justify-start gap-2 mb-1.5">
        <ToggleSwitch
          value={border.enabled}
          onChange={(v) => set("enabled", v)}
        />
        <span className="text-[10px] font-bold text-[rgba(240,237,232,0.28)] uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>

      {border.enabled && (
        <div className="flex flex-col gap-[7px] p-2 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] min-w-0 overflow-hidden">
          <div className="flex gap-1.5 min-w-0">
            <div className="relative w-6 h-6 rounded-md overflow-hidden border border-[rgba(255,255,255,0.1)] shrink-0">
              <input
                type="color"
                value={border.color}
                onChange={(e) => set("color", e.target.value)}
                className="absolute inset-0 w-full h-full scale-150"
              />
            </div>
            <input
              value={border.color}
              onChange={(e) => set("color", e.target.value)}
              className="flex-1 min-w-0 px-1.5 py-[3px] rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#f0ede8] text-[10px] font-mono outline-none"
            />
          </div>

          <div>
            <span className="text-[8px] text-[rgba(240,237,232,0.3)] block mb-0.5">
              Width
            </span>
            <NumInput
              value={border.width}
              min={1}
              max={20}
              suffix="px"
              onChange={(v) => set("width", v)}
              style={{ width: 72 }}
            />
          </div>

          <div className="grid grid-cols-2 gap-[3px] min-w-0">
            {BORDER_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => set("style", s)}
                className="px-0 py-[3px] rounded-md text-[8px] font-bold cursor-pointer border-none uppercase tracking-[0.04em]"
                style={{
                  background:
                    border.style === s
                      ? "rgba(232,255,71,0.15)"
                      : "rgba(255,255,255,0.05)",
                  color:
                    border.style === s ? "#e8ff47" : "rgba(240,237,232,0.4)",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div
            className="h-6 rounded-md bg-[rgba(255,255,255,0.04)] box-border flex items-center justify-center min-w-0 overflow-hidden"
            style={{
              border: `${border.width}px ${border.style} ${border.color}`,
            }}
          >
            <span className="text-[8px] text-[rgba(240,237,232,0.25)]">
              preview
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
