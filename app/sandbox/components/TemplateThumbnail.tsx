import type {
  CanvasObject,
  CanvasSize,
  RowData,
  DataImageMap,
  ImageObject,
  TextField,
} from "../types/index";
import { resolveDataImageSrc } from "../utils/data";

export function TemplateThumbnail({
  objects,
  canvasSize,
  rows,
  pageIndex,
  dataImages,
  width,
  height,
  rotate,
}: {
  objects: CanvasObject[];
  canvasSize: CanvasSize;
  rows: RowData[];
  pageIndex: number;
  dataImages: DataImageMap;
  width: number;
  height: number;
  rotate: boolean;
}) {
  const scaleX = rotate ? height / canvasSize.width : width / canvasSize.width;
  const scaleY = rotate
    ? width / canvasSize.height
    : height / canvasSize.height;

  const bgImg = objects.find(
    (o) => o.kind === "image" && (o as ImageObject).isBackground,
  ) as ImageObject | undefined;

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        transform: rotate ? `rotate(90deg)` : undefined,
        transformOrigin: "center center",
        borderRadius: 1,
        flexShrink: 0,
      }}
    >
      {bgImg && (
        <img
          src={bgImg.src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            opacity: bgImg.opacity,
          }}
        />
      )}
      {objects
        .filter((o) => !(o.kind === "image" && (o as ImageObject).isBackground))
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((obj) => {
          if (obj.kind === "image") {
            const imgObj = obj as ImageObject;
            const src = imgObj.isDataImage
              ? resolveDataImageSrc(
                  imgObj.isDataImage,
                  imgObj.dataImageColumn,
                  imgObj.columnOffset,
                  imgObj.src,
                  rows,
                  pageIndex,
                  dataImages,
                )
              : imgObj.src;
            return (
              <img
                key={obj.id}
                src={src}
                alt=""
                style={{
                  position: "absolute",
                  left: obj.x * scaleX,
                  top: obj.y * scaleY,
                  width: obj.width * scaleX,
                  height: obj.height * scaleY,
                  objectFit: "fill",
                  opacity: imgObj.opacity,
                  borderRadius:
                    (imgObj.borderRadius ?? 0) * Math.min(scaleX, scaleY),
                }}
              />
            );
          } else {
            const f = obj as TextField;
            const ti = pageIndex + f.columnOffset;
            const text =
              ti >= 0 && ti < rows.length
                ? (rows[ti][f.column] ?? "")
                : f.column;
            const fs = Math.max(4, f.fontSize * Math.min(scaleX, scaleY));
            return (
              <div
                key={obj.id}
                style={{
                  position: "absolute",
                  left: obj.x * scaleX,
                  top: obj.y * scaleY,
                  width: obj.width * scaleX,
                  height: obj.height * scaleY,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    f.textAlign === "right"
                      ? "flex-end"
                      : f.textAlign === "center"
                        ? "center"
                        : "flex-start",
                  padding: "0 1px",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontFamily: `'${f.fontFamily}', serif`,
                    fontSize: fs,
                    color: f.color,
                    fontWeight: f.bold ? "bold" : "normal",
                    fontStyle: f.italic ? "italic" : "normal",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    lineHeight: 1.2,
                  }}
                >
                  {text}
                </span>
              </div>
            );
          }
        })}
    </div>
  );
}
