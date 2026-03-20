import { useMemo, useState, useEffect } from "react";
import type {
  CanvasObject,
  CanvasSize,
  RowData,
  DataImageMap,
  ImageObject,
  TextField,
} from "../types/index";
import { resolveDataImageSrc } from "../utils/data";
import { shrinkFontSize, textShadowCSS, shadowCSS, generateCodeDataURL } from "../utils/rendering";

function ThumbnailTextField({
  f,
  text,
}: {
  f: TextField;
  text: string;
}) {
  const codeType = f.codeType ?? "text";

  const [codeDataUrl, setCodeDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (codeType === "text") { setCodeDataUrl(null); return; }
    if (!text) { setCodeDataUrl(null); return; }
    generateCodeDataURL(text, codeType, f.width, f.height, f.color)
      .then(setCodeDataUrl)
      .catch(() => setCodeDataUrl(null));
  }, [text, codeType, f.width, f.height, f.color]);

  const fs = codeType === "text" && f.textOverflow === "shrink"
    ? shrinkFontSize(text, f.width, f.height, f.fontFamily, f.fontSize, f.bold, f.italic)
    : f.fontSize;

  return (
    <div
      style={{
        position: "absolute",
        left: f.x,
        top: f.y,
        width: f.width,
        height: f.height,
        overflow: codeType !== "text" ? "hidden" : "visible",
        transform: f.rotation ? `rotate(${f.rotation}deg)` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: codeType !== "text" ? "center"
          : f.textAlign === "right" ? "flex-end"
          : f.textAlign === "center" ? "center"
          : "flex-start",
        padding: codeType === "text" ? "0 3px" : 0,
        boxSizing: "border-box",
      }}
    >
      {codeType !== "text" ? (
        codeDataUrl ? (
          <img
            src={codeDataUrl}
            alt={codeType}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px dashed rgba(232,255,71,0.25)",
              borderRadius: 4,
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontSize: 6, color: "rgba(232,255,71,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
              {codeType === "qr" ? "QR" : "BC"}
            </span>
          </div>
        )
      ) : (
        <span
          style={{
            display: "inline",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "visible",
            fontFamily: `'${f.fontFamily}', serif`,
            fontSize: fs,
            color: f.color,
            fontWeight: f.bold ? "bold" : "normal",
            fontStyle: f.italic ? "italic" : "normal",
            textAlign: f.textAlign,
            textShadow:
              f.shadow.enabled || (f.shadow.thickness && f.shadow.thickness > 0)
                ? textShadowCSS(f.shadow)
                : "none",
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

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
  // Compute a uniform scale to fit the canvas into the thumbnail container.
  const targetW = rotate ? height : width;
  const targetH = rotate ? width : height;
  const renderScale = Math.min(
    targetW / canvasSize.width,
    targetH / canvasSize.height,
  );

  const bgImg = objects.find(
    (o) => o.kind === "image" && (o as ImageObject).isBackground,
  ) as ImageObject | undefined;

  const sorted = useMemo(
    () =>
      [...objects]
        .filter(
          (o) => !(o.kind === "image" && (o as ImageObject).isBackground),
        )
        .sort((a, b) => a.zIndex - b.zIndex),
    [objects],
  );

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Render at full canvasSize, then scale down with CSS transform */}
      <div
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          position: "absolute",
          top: 0,
          left: 0,
          transform: [
            rotate
              ? `translateX(${width}px) rotate(90deg)`
              : undefined,
            `scale(${renderScale})`,
          ]
            .filter(Boolean)
            .join(" "),
          transformOrigin: "top left",
          background: "#fff",
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

        {sorted.map((obj) => {
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
              <div
                key={obj.id}
                style={{
                  position: "absolute",
                  left: obj.x,
                  top: obj.y,
                  width: obj.width,
                  height: obj.height,
                  overflow: "hidden",
                  borderRadius: imgObj.borderRadius ?? 0,
                  transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                  filter: imgObj.shadow?.enabled
                    ? `drop-shadow(${shadowCSS(imgObj.shadow)})`
                    : undefined,
                }}
              >
                <img
                  src={src}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "fill",
                    display: "block",
                    opacity: imgObj.opacity,
                  }}
                />
                {imgObj.border?.enabled && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: imgObj.borderRadius ?? 0,
                      border: `${imgObj.border.width}px ${imgObj.border.style} ${imgObj.border.color}`,
                      boxSizing: "border-box",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            );
          }

          const f = obj as TextField;
          const ti = pageIndex + f.columnOffset;
          const text =
            ti >= 0 && ti < rows.length
              ? (rows[ti][f.column] ?? "")
              : f.column;

          return (
            <ThumbnailTextField key={obj.id} f={f} text={text} />
          );
        })}
      </div>
    </div>
  );
}
