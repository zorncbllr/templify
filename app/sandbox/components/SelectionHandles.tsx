import type { HandleKey } from "../types/index";

const HANDLE_SIZE = 10;
const HANDLE_OFFSET = -HANDLE_SIZE / 2;

const HANDLES: {
  key: HandleKey;
  cursor: string;
  pos: React.CSSProperties;
}[] = [
  { key: "nw", cursor: "nwse-resize", pos: { top: 0, left: 0 } },
  { key: "n", cursor: "ns-resize", pos: { top: 0, left: "50%" } },
  { key: "ne", cursor: "nesw-resize", pos: { top: 0, right: 0 } },
  { key: "e", cursor: "ew-resize", pos: { top: "50%", right: 0 } },
  { key: "se", cursor: "nwse-resize", pos: { bottom: 0, right: 0 } },
  { key: "s", cursor: "ns-resize", pos: { bottom: 0, left: "50%" } },
  { key: "sw", cursor: "nesw-resize", pos: { bottom: 0, left: 0 } },
  { key: "w", cursor: "ew-resize", pos: { top: "50%", left: 0 } },
];

export function SelectionHandles({
  onDown,
  scale = 1,
}: {
  onDown: (h: HandleKey, e: React.MouseEvent) => void;
  scale?: number;
}) {
  const inv = 1 / scale;
  const borderWidth = 1.5 * inv;

  return (
    <>
      {/* Selection border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `${borderWidth}px solid #e8ff47`,
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      />
      {/* Resize handles — counter-scale so they stay a fixed screen size */}
      {HANDLES.map(({ key, cursor, pos }) => (
        <div
          key={key}
          data-handle={key}
          onMouseDown={(e) => onDown(key, e)}
          style={{
            position: "absolute",
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            borderRadius: 2,
            background: "#fff",
            border: "1.5px solid #e8ff47",
            boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
            cursor,
            zIndex: 10,
            transform: `scale(${inv})`,
            // Position at the edge, then shift by half the handle size
            // so the handle center sits on the edge.
            // Margin is constant because transform: scale(inv) scales around
            // the element center — the layout offset stays the same at any zoom.
            ...pos,
            marginTop:
              pos.top !== undefined ? HANDLE_OFFSET : undefined,
            marginLeft:
              pos.left !== undefined ? HANDLE_OFFSET : undefined,
            marginBottom:
              pos.bottom !== undefined ? HANDLE_OFFSET : undefined,
            marginRight:
              pos.right !== undefined ? HANDLE_OFFSET : undefined,
          }}
        />
      ))}
    </>
  );
}
