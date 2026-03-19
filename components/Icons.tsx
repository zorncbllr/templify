import React from "react";

type IconProps = {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
};

const svg = (
  d: string,
  viewBox = "0 0 24 24",
  fill = "none",
  strokeWidth = 2,
) => {
  const Icon = ({ size = 16, color = "currentColor", style, className }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill === "fill" ? color : "none"}
      stroke={fill === "fill" ? "none" : color}
      strokeWidth={fill === "fill" ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      className={className}
    >
      <path d={d} />
    </svg>
  );
  Icon.displayName = "SvgIcon";
  return Icon;
};

const multiPath = (
  paths: { d: string; fill?: string; stroke?: string; strokeWidth?: number }[],
  viewBox = "0 0 24 24",
) => {
  const Icon = ({ size = 16, color = "currentColor", style, className }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      className={className}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill === "current" ? color : (p.fill ?? "none")}
          stroke={p.stroke === "current" ? color : (p.stroke ?? color)}
          strokeWidth={p.strokeWidth ?? 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
  Icon.displayName = "MultiPathIcon";
  return Icon;
};

// ─── General UI Icons ──────────────────────────────────────────────────────

// Close / X button
export const IconClose = svg("M18 6L6 18M6 6l12 12");

// Checkmark
export const IconCheck = svg("M20 6L9 17l-5-5");

// Warning triangle
export const IconWarning = multiPath([
  { d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", stroke: "current", fill: "none" },
  { d: "M12 9v4", stroke: "current", fill: "none" },
  { d: "M12 17h.01", stroke: "current", fill: "none" },
]);

// Check circle (success)
export const IconCheckCircle = multiPath([
  { d: "M22 11.08V12a10 10 0 11-5.93-9.14", stroke: "current", fill: "none" },
  { d: "M22 4L12 14.01l-3-3", stroke: "current", fill: "none" },
]);

// Folder
export const IconFolder = multiPath([
  { d: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z", stroke: "current", fill: "none" },
]);

// Undo
export const IconUndo = svg("M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3M3 10l4-4M3 10l4 4");

// Redo
export const IconRedo = svg("M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h10M21 10l-4-4M21 10l-4 4");

// Download / arrow down
export const IconDownload = svg("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3");

// Upload / arrow up
export const IconUpload = svg("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12");

// Arrow up
export const IconArrowUp = svg("M12 19V5M5 12l7-7 7 7");

// Arrow down small (for export button)
export const IconArrowDown = svg("M12 5v14M19 12l-7 7-7-7");

// Arrow down left / back
export const IconArrowBack = svg("M19 12H5M12 19l-7-7 7-7");

// ─── Star / sparkle (brand icon) ──────────────────────────────────────────

export const IconSparkle = multiPath([
  { d: "M12 1Q12.5 11 23 12Q12.5 13 12 23Q11.5 13 1 12Q11.5 11 12 1Z", fill: "current", stroke: "none", strokeWidth: 0 },
]);

// ─── Media Icons ──────────────────────────────────────────────────────────

// Camera / photo
export const IconCamera = multiPath([
  { d: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z", stroke: "current", fill: "none" },
  { d: "M12 17a4 4 0 100-8 4 4 0 000 8z", stroke: "current", fill: "none" },
]);

// Image / picture frame
export const IconImage = multiPath([
  { d: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z", stroke: "current", fill: "none" },
  { d: "M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", stroke: "current", fill: "none" },
  { d: "M21 15l-5-5L5 21", stroke: "current", fill: "none" },
]);

// Eye / preview
export const IconEye = multiPath([
  { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", stroke: "current", fill: "none" },
  { d: "M12 15a3 3 0 100-6 3 3 0 000 6z", stroke: "current", fill: "none" },
]);

// ─── Feature Icons ────────────────────────────────────────────────────────

// Fonts / type
export const IconType = svg("M4 7V4h16v3M9 20h6M12 4v16");

// Ruler / auto-shrink
export const IconRuler = multiPath([
  { d: "M21.73 18l-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3z", stroke: "current", fill: "none" },
  { d: "M12 9v4M12 17h.01", stroke: "current", fill: "none" },
]);

// Smart shrink - minimize arrows
export const IconShrink = svg("M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7");

// Bar chart / batch layout
export const IconBarChart = multiPath([
  { d: "M18 20V10", stroke: "current", fill: "none" },
  { d: "M12 20V4", stroke: "current", fill: "none" },
  { d: "M6 20v-6", stroke: "current", fill: "none" },
]);

// Palette / canvas styling
export const IconPalette = multiPath([
  { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.01 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z", stroke: "current", fill: "none" },
  { d: "M6.5 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M9.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M14.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M17.5 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", fill: "current", stroke: "none", strokeWidth: 0 },
]);

// Wand / effects
export const IconWand = multiPath([
  { d: "M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5", stroke: "current", fill: "none" },
  { d: "M9 21l9.15-9.15a2 2 0 000-2.83l-.17-.17a2 2 0 00-2.83 0L6 18", stroke: "current", fill: "none" },
]);

// Keyboard
export const IconKeyboard = multiPath([
  { d: "M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z", stroke: "current", fill: "none" },
  { d: "M6 10h0M10 10h0M14 10h0M18 10h0M8 14h8", stroke: "current", fill: "none" },
]);

// ─── Use Case Icons ───────────────────────────────────────────────────────

// Graduation cap / certificate
export const IconGradCap = multiPath([
  { d: "M22 10l-10-5L2 10l10 5 10-5z", stroke: "current", fill: "none" },
  { d: "M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5", stroke: "current", fill: "none" },
  { d: "M22 10v6", stroke: "current", fill: "none" },
]);

// Badge / ID
export const IconBadge = multiPath([
  { d: "M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", stroke: "current", fill: "none" },
  { d: "M16 2v4M8 2v4M3 10h18", stroke: "current", fill: "none" },
]);

// Credit card / ID card
export const IconIdCard = multiPath([
  { d: "M3 5h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z", stroke: "current", fill: "none" },
  { d: "M1 11h22", stroke: "current", fill: "none" },
]);

// Clipboard / liquidation
export const IconClipboard = multiPath([
  { d: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2", stroke: "current", fill: "none" },
  { d: "M8 2h8a1 1 0 011 1v1a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1z", stroke: "current", fill: "none" },
]);

// Mail / invitation
export const IconMail = multiPath([
  { d: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z", stroke: "current", fill: "none" },
  { d: "M22 6l-10 7L2 6", stroke: "current", fill: "none" },
]);

// Trophy / award
export const IconTrophy = multiPath([
  { d: "M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2", stroke: "current", fill: "none" },
  { d: "M4 3h16v6a8 8 0 01-16 0V3zM8 21h8M12 17v4", stroke: "current", fill: "none" },
]);

// Tag / name tag
export const IconTag = multiPath([
  { d: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z", stroke: "current", fill: "none" },
  { d: "M7 7h.01", stroke: "current", fill: "none" },
]);

// Scroll / certificate
export const IconScroll = multiPath([
  { d: "M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 00-2 2v10a2 2 0 002 2", stroke: "current", fill: "none" },
  { d: "M19 17V5a2 2 0 00-2-2H6", stroke: "current", fill: "none" },
]);

// ─── Navigation Icons ─────────────────────────────────────────────────────

// Chevron down (dropdown caret)
export const IconChevronDown = svg("M6 9l6 6 6-6");

// Chevron left (single)
export const IconChevronLeft = svg("M15 18l-6-6 6-6");

// Chevron right (single)
export const IconChevronRight = svg("M9 18l6-6-6-6");

// Double chevron left
export const IconChevronsLeft = multiPath([
  { d: "M11 17l-5-5 5-5", stroke: "current", fill: "none" },
  { d: "M18 17l-5-5 5-5", stroke: "current", fill: "none" },
]);

// Double chevron right
export const IconChevronsRight = multiPath([
  { d: "M13 17l5-5-5-5", stroke: "current", fill: "none" },
  { d: "M6 17l5-5-5-5", stroke: "current", fill: "none" },
]);

// ─── Zoom Icons ───────────────────────────────────────────────────────────

// Minus
export const IconMinus = svg("M5 12h14");

// Fit to screen
export const IconFitScreen = multiPath([
  { d: "M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3", stroke: "current", fill: "none" },
]);

// ─── Misc Icons ───────────────────────────────────────────────────────────

// Grid / print imposition
export const IconGrid = multiPath([
  { d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", stroke: "current", fill: "none" },
]);

// Drag handle (6 dots)
export const IconDragHandle = multiPath([
  { d: "M8 6a1 1 0 100-2 1 1 0 000 2z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M16 6a1 1 0 100-2 1 1 0 000 2z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M8 13a1 1 0 100-2 1 1 0 000 2z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M16 13a1 1 0 100-2 1 1 0 000 2z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M8 20a1 1 0 100-2 1 1 0 000 2z", fill: "current", stroke: "none", strokeWidth: 0 },
  { d: "M16 20a1 1 0 100-2 1 1 0 000 2z", fill: "current", stroke: "none", strokeWidth: 0 },
]);

// Rotate
export const IconRotate = svg("M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15");
