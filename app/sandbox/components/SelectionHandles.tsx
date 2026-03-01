import type { HandleKey } from "../types/index";

const HANDLES: { key: HandleKey; cursor: string; pos: React.CSSProperties }[] =
  [
    { key: "nw", cursor: "nwse-resize", pos: { top: -5, left: -5 } },
    {
      key: "n",
      cursor: "ns-resize",
      pos: { top: -5, left: "50%", transform: "translateX(-50%)" },
    },
    { key: "ne", cursor: "nesw-resize", pos: { top: -5, right: -5 } },
    {
      key: "e",
      cursor: "ew-resize",
      pos: { top: "50%", right: -5, transform: "translateY(-50%)" },
    },
    { key: "se", cursor: "nwse-resize", pos: { bottom: -5, right: -5 } },
    {
      key: "s",
      cursor: "ns-resize",
      pos: { bottom: -5, left: "50%", transform: "translateX(-50%)" },
    },
    { key: "sw", cursor: "nesw-resize", pos: { bottom: -5, left: -5 } },
    {
      key: "w",
      cursor: "ew-resize",
      pos: { top: "50%", left: -5, transform: "translateY(-50%)" },
    },
  ];

export function SelectionHandles({
  onDown,
}: {
  onDown: (h: HandleKey, e: React.MouseEvent) => void;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1.5px solid #e8ff47",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      />
      {HANDLES.map(({ key, cursor, pos }) => (
        <div
          key={key}
          data-handle={key}
          onMouseDown={(e) => onDown(key, e)}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "#fff",
            border: "1.5px solid #e8ff47",
            boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
            cursor,
            zIndex: 10,
            ...pos,
          }}
        />
      ))}
    </>
  );
}
