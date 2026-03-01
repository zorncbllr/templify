export type RowData = Record<string, string>;

export type Shadow = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
  thickness: number;
};

export type Border = {
  enabled: boolean;
  width: number;
  color: string;
  style: "solid" | "dashed" | "dotted" | "double";
};

export type BaseObj = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type ImageObject = BaseObj & {
  kind: "image";
  src: string;
  name: string;
  opacity: number;
  shadow: Shadow;
  border: Border;
  borderRadius: number;
  isBackground: boolean;
  naturalWidth: number;
  naturalHeight: number;
  isDataImage: boolean;
  dataImageColumn: string;
  columnOffset: number;
};

export type TextField = BaseObj & {
  kind: "field";
  column: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: Shadow;
  columnOffset: number;
  textAlign: "left" | "center" | "right" | "justify";
};

export type CanvasObject = ImageObject | TextField;

export type CanvasSize = { width: number; height: number };

export type DataImageMap = Record<string, string>;

export type HandleKey = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type ImpositionGene = {
  gapX: number;
  gapY: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  rotation: 0 | 1;
};

export type ImpositionResult = {
  gene: ImpositionGene;
  cols: number;
  rows: number;
  count: number;
  wastePercent: number;
  cutLines: number;
  fitness: number;
  cardW: number;
  cardH: number;
  printAreaW: number;
  printAreaH: number;
  offsetX: number;
  offsetY: number;
};

export type Field = {
  id: number;
  column: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  maxWidth: number;
};

export type DragRef = {
  mouseX: number;
  mouseY: number;
  fieldX: number;
  fieldY: number;
} | null;

export type CanvasFieldProps = {
  field: Field;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number) => void;
  onDelete: (id: number) => void;
  previewData: RowData | null;
};
