type RowData = Record<string, string>;

type Field = {
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

type DragRef = {
  mouseX: number;
  mouseY: number;
  fieldX: number;
  fieldY: number;
} | null;

type CanvasFieldProps = {
  field: Field;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDrag: (id: number, x: number, y: number) => void;
  onDelete: (id: number) => void;
  previewData: RowData | null;
};
