import type { Shadow, Border } from "../types";

export const DEFAULT_SHADOW: Shadow = {
  enabled: false,
  x: 2,
  y: 2,
  blur: 8,
  color: "rgba(0,0,0,0.35)",
  thickness: 0,
};

export const DEFAULT_BORDER: Border = {
  enabled: false,
  width: 2,
  color: "#ffffff",
  style: "solid",
};

export const SHEET_PRESETS = [
  { label: "A4 Portrait", w: 595, h: 842 },
  { label: "A4 Landscape", w: 842, h: 595 },
  { label: "Letter", w: 612, h: 792 },
  { label: "Legal", w: 612, h: 1008 },
  { label: "A3 Portrait", w: 842, h: 1191 },
  { label: "A3 Landscape", w: 1191, h: 842 },
  { label: "Tabloid", w: 792, h: 1224 },
];

export const SCALE_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|avif|ico)$/i;

export const PLACEHOLDER_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#e0e0e0"/><rect width="40" height="40" fill="#c0c0c0"/><rect x="40" y="40" width="40" height="40" fill="#c0c0c0"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#999">no photo</text></svg>`,
)}`;

export const GOOGLE_FONTS = [
  { name: "Playfair Display", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "EB Garamond", category: "Serif" },
  { name: "Cormorant Garamond", category: "Serif" },
  { name: "Libre Baskerville", category: "Serif" },
  { name: "DM Sans", category: "Sans-serif" },
  { name: "Nunito", category: "Sans-serif" },
  { name: "Poppins", category: "Sans-serif" },
  { name: "Raleway", category: "Sans-serif" },
  { name: "Outfit", category: "Sans-serif" },
  { name: "Plus Jakarta Sans", category: "Sans-serif" },
  { name: "Rubik", category: "Sans-serif" },
  { name: "Manrope", category: "Sans-serif" },
  { name: "Syne", category: "Sans-serif" },
  { name: "Cinzel", category: "Display" },
  { name: "Bebas Neue", category: "Display" },
  { name: "Oswald", category: "Display" },
  { name: "Teko", category: "Display" },
  { name: "Dancing Script", category: "Script" },
  { name: "Great Vibes", category: "Script" },
  { name: "Pacifico", category: "Script" },
  { name: "Sacramento", category: "Script" },
  { name: "JetBrains Mono", category: "Mono" },
  { name: "Fira Code", category: "Mono" },
  { name: "Source Code Pro", category: "Mono" },
];

export const FONT_CATS = ["All", "Serif", "Sans-serif", "Display", "Script", "Mono"];

export const TEXT_COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#e8ff47",
  "#4a90e2",
  "#e74c3c",
  "#2ecc71",
  "#f59e0b",
  "#8b5cf6",
];
