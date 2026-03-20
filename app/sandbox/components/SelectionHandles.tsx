import type { HandleKey } from "../types/index";

const HANDLE_SIZE = 10;
const HANDLE_OFFSET = -HANDLE_SIZE / 2;
const ROTATE_DISTANCE = 28;

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
  onRotateDown,
  scale = 1,
}: {
  onDown: (h: HandleKey, e: React.MouseEvent) => void;
  onRotateDown?: (e: React.MouseEvent) => void;
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
      {/* Rotation handle — above top center */}
      {onRotateDown && (
        <>
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: -ROTATE_DISTANCE * inv,
              left: "50%",
              width: 1.5 * inv,
              height: ROTATE_DISTANCE * inv,
              background: "#e8ff47",
              marginLeft: -(1.5 * inv) / 2,
              pointerEvents: "none",
            }}
          />
          {/* Rotation dot */}
          <div
            data-handle="rotate"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRotateDown(e);
            }}
            style={{
              position: "absolute",
              top: -ROTATE_DISTANCE * inv,
              left: "50%",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#e8ff47",
              border: "2px solid #fff",
              boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
              cursor: "grab",
              zIndex: 10,
              transform: `scale(${inv})`,
              marginTop: -7,
              marginLeft: -7,
            }}
          />
        </>
      )}
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
